import { DurableObject } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";
import {
  COMMANDER_IDS,
  createMultiplayerState,
  startNextRound,
  teamForCommander,
  type CommanderId,
  type CommanderRecord,
  type FactionId,
  type GameState,
  type ResourceStock,
  type Team,
} from "../lib/musterhold/engine.ts";
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  RECONNECT_GRACE_MS,
  isOnlineMatchMode,
  parseClientMessage,
  seatsForMode,
  type OnlineMatchMode,
  type RoomPhase,
  type RoomSeatView,
  type RoomSnapshot,
  type ServerMessage,
} from "../lib/multiplayer/protocol.ts";
import {
  advanceMultiplayerGame,
  applyGameCommand,
  forfeitGame,
  phaseForGame,
} from "../lib/multiplayer/room.ts";

const ROOM_STORAGE_KEY = "room";
const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_BYTES = 8_192;
const MIN_TICK_MS = 40;
const DEFAULT_RESOURCES: ResourceStock = { marks: 520, timber: 70, sigils: 1 };

interface SocketAttachment {
  authenticated: boolean;
  sessionId: string;
  commander?: CommanderId;
}

interface PersistedRoom {
  schemaVersion: 2;
  code: string;
  mode: OnlineMatchMode;
  phase: RoomPhase;
  factions: CommanderRecord<FactionId | null>;
  tokenHashes: CommanderRecord<string | null>;
  ready: CommanderRecord<boolean>;
  lastSeq: CommanderRecord<number>;
  reconnectDeadlines: CommanderRecord<number | null>;
  game: GameState | null;
  revision: number;
  lastAdvancedAt: number;
  createdAt: number;
  updatedAt: number;
}

interface LegacyPersistedRoom {
  code: string;
  phase: RoomPhase;
  factions: Record<Team, FactionId | null>;
  tokenHashes: Record<Team, string | null>;
  ready: Record<Team, boolean>;
  lastSeq: Record<Team, number>;
  reconnectDeadlines: Record<Team, number | null>;
  game: GameState | null;
  revision: number;
  lastAdvancedAt: number;
  createdAt: number;
  updatedAt: number;
}

export type RoomSetupResult =
  | { ok: true; token: string; commander: CommanderId; mode: OnlineMatchMode }
  | { ok: false; code: "conflict" | "not_found" | "room_full"; message: string };

function seatRecord<T>(factory: (commander: CommanderId) => T): CommanderRecord<T> {
  return Object.fromEntries(COMMANDER_IDS.map((commander) => [commander, factory(commander)])) as CommanderRecord<T>;
}

function secureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesFromHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return bytes;
}

async function tokenMatches(token: string, expectedHash: string | null): Promise<boolean> {
  if (!expectedHash) return false;
  const expected = bytesFromHex(expectedHash);
  if (!expected) return false;
  const actual = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return timingSafeEqual(new Uint8Array(actual), expected);
}

function socketAttachment(socket: WebSocket): SocketAttachment | null {
  const value: unknown = socket.deserializeAttachment();
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SocketAttachment>;
  if (typeof candidate.authenticated !== "boolean" || typeof candidate.sessionId !== "string") return null;
  if (candidate.commander !== undefined && !COMMANDER_IDS.includes(candidate.commander)) return null;
  return { authenticated: candidate.authenticated, sessionId: candidate.sessionId, commander: candidate.commander };
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify(message));
  } catch {
    socket.close(1011, "Unable to deliver match update");
  }
}

function normalizeGame(game: GameState | null, mode: OnlineMatchMode): GameState | null {
  if (!game) return null;
  game.matchMode = mode;
  game.activeCommanders = seatsForMode(mode);
  game.factions = seatRecord((commander) => game.factions[commander] ?? game.factions[teamForCommander(commander)] ?? "daybreak");
  game.resources = seatRecord((commander) => ({ ...(game.resources[commander] ?? DEFAULT_RESOURCES) }));
  game.syncEnabled = seatRecord((commander) => game.syncEnabled[commander] ?? false);
  game.syncClock = seatRecord((commander) => game.syncClock[commander] ?? 12);
  game.reprieveUsed = seatRecord((commander) => game.reprieveUsed[commander] ?? false);
  game.rallyHorn = seatRecord((commander) => game.rallyHorn[commander] ?? false);
  game.keepArmorUntil = seatRecord((commander) => game.keepArmorUntil[commander] ?? 0);
  game.stats = {
    buildingsPlaced: seatRecord((commander) => game.stats.buildingsPlaced[commander] ?? 0),
    buildingsLost: seatRecord((commander) => game.stats.buildingsLost[commander] ?? 0),
    unitsSpawned: seatRecord((commander) => game.stats.unitsSpawned[commander] ?? 0),
    unitsLost: seatRecord((commander) => game.stats.unitsLost[commander] ?? 0),
    keepDamage: seatRecord((commander) => game.stats.keepDamage[commander] ?? 0),
    upgrades: seatRecord((commander) => game.stats.upgrades[commander] ?? 0),
    itemsBought: seatRecord((commander) => game.stats.itemsBought[commander] ?? 0),
    bountyEarned: seatRecord((commander) => game.stats.bountyEarned[commander] ?? 0),
  };
  game.buildings = game.buildings.map((building) => ({ ...building, commander: building.commander ?? building.team }));
  game.units = game.units.map((unit) => ({ ...unit, commander: unit.commander ?? unit.team }));
  return game;
}

function normalizeRoom(stored: PersistedRoom | LegacyPersistedRoom): PersistedRoom {
  if ("schemaVersion" in stored && stored.schemaVersion === 2 && isOnlineMatchMode(stored.mode)) {
    stored.game = normalizeGame(stored.game, stored.mode);
    return stored;
  }
  return {
    schemaVersion: 2,
    code: stored.code,
    mode: "1v1",
    phase: stored.phase,
    factions: seatRecord((commander) => commander === "player_ally" || commander === "enemy_ally" ? null : stored.factions[commander]),
    tokenHashes: seatRecord((commander) => commander === "player_ally" || commander === "enemy_ally" ? null : stored.tokenHashes[commander]),
    ready: seatRecord((commander) => commander === "player_ally" || commander === "enemy_ally" ? false : stored.ready[commander]),
    lastSeq: seatRecord((commander) => commander === "player_ally" || commander === "enemy_ally" ? 0 : stored.lastSeq[commander]),
    reconnectDeadlines: seatRecord((commander) => commander === "player_ally" || commander === "enemy_ally" ? null : stored.reconnectDeadlines[commander]),
    game: normalizeGame(stored.game, "1v1"),
    revision: stored.revision,
    lastAdvancedAt: stored.lastAdvancedAt,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}

export class KeepstormMatchRoom extends DurableObject<CloudflareBindings> {
  async createRoom(code: string, faction: FactionId, mode: OnlineMatchMode): Promise<RoomSetupResult> {
    const existing = await this.loadRoom();
    if (existing) return { ok: false, code: "conflict", message: "That invitation code is already in use." };

    const token = secureToken();
    const now = Date.now();
    const room: PersistedRoom = {
      schemaVersion: 2,
      code,
      mode,
      phase: "waiting",
      factions: seatRecord((commander) => commander === "player" ? faction : null),
      tokenHashes: seatRecord(() => null),
      ready: seatRecord(() => false),
      lastSeq: seatRecord(() => 0),
      reconnectDeadlines: seatRecord(() => null),
      game: null,
      revision: 1,
      lastAdvancedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    room.tokenHashes.player = await hashToken(token);
    await this.ctx.storage.put(ROOM_STORAGE_KEY, room);
    await this.ctx.storage.setAlarm(now + ROOM_LIFETIME_MS);
    return { ok: true, token, commander: "player", mode };
  }

  async joinRoom(faction: FactionId): Promise<RoomSetupResult> {
    const room = await this.loadRoom();
    if (!room) return { ok: false, code: "not_found", message: "That Keepstorm room does not exist." };
    const commander = seatsForMode(room.mode).find((seat) => seat !== "player" && !room.tokenHashes[seat]);
    if (!commander) return { ok: false, code: "room_full", message: `That Keepstorm ${room.mode} room already has every commander.` };

    const token = secureToken();
    room.factions[commander] = faction;
    room.tokenHashes[commander] = await hashToken(token);
    room.updatedAt = Date.now();
    room.revision += 1;
    await this.persist(room);
    this.broadcast(room);
    return { ok: true, token, commander, mode: room.mode };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "Expected a WebSocket upgrade." }, { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ authenticated: false, sessionId: crypto.randomUUID() } satisfies SocketAttachment);
    send(server, { type: "hello_required", protocol: MULTIPLAYER_PROTOCOL_VERSION });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string" || rawMessage.length > MAX_MESSAGE_BYTES) {
      send(socket, { type: "error", code: "invalid_message", message: "The command was not valid Keepstorm data." });
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(rawMessage);
    } catch {
      send(socket, { type: "error", code: "invalid_json", message: "The command could not be read." });
      return;
    }
    const message = parseClientMessage(value);
    if (!message) {
      send(socket, { type: "error", code: "invalid_message", message: "The command did not match this multiplayer version." });
      return;
    }

    const attachment = socketAttachment(socket);
    if (!attachment) {
      send(socket, { type: "error", code: "invalid_session", message: "This multiplayer connection could not be restored." });
      socket.close(4003, "Invalid connection state");
      return;
    }
    if (!attachment.authenticated) {
      if (message.type !== "hello") {
        send(socket, { type: "error", code: "authentication_required", message: "Reconnect with the invitation seat token." });
        return;
      }
      await this.authenticate(socket, attachment, message.token);
      return;
    }
    if (!attachment.commander || message.type === "hello") {
      send(socket, { type: "error", code: "invalid_session", message: "This multiplayer seat is no longer valid." });
      return;
    }

    const room = await this.loadRoom();
    if (!room) {
      send(socket, { type: "error", code: "room_closed", message: "This Keepstorm room has expired." });
      socket.close(4004, "Room expired");
      return;
    }

    if (message.type === "tick") {
      const changed = this.advanceRoom(room, Date.now());
      if (changed) {
        await this.persist(room);
        this.broadcast(room);
      }
      return;
    }

    if (message.type === "leave_room") {
      await this.leaveRoom(room, attachment.commander, socket, attachment.sessionId);
      return;
    }

    if (message.type === "set_ready") {
      room.ready[attachment.commander] = message.ready;
      this.transitionReadyRoom(room, Date.now());
      room.revision += 1;
      await this.persist(room);
      this.broadcast(room);
      return;
    }

    if (message.seq <= room.lastSeq[attachment.commander]) {
      send(socket, { type: "error", code: "duplicate_command", message: "That command was already processed.", seq: message.seq });
      return;
    }
    room.lastSeq[attachment.commander] = message.seq;
    this.advanceRoom(room, Date.now());
    if (room.phase !== "playing" || !room.game) {
      await this.persist(room);
      send(socket, { type: "error", code: "match_not_playing", message: "The match is not accepting battlefield commands.", seq: message.seq });
      return;
    }

    const result = applyGameCommand(room.game, attachment.commander, message.command);
    if (!result.accepted) {
      await this.persist(room);
      send(socket, { type: "error", code: "command_rejected", message: result.message, seq: message.seq });
      return;
    }

    room.game = result.state;
    room.phase = phaseForGame(result.state);
    if (room.phase !== "playing") this.resetReady(room);
    room.revision += 1;
    await this.persist(room);
    send(socket, { type: "ack", seq: message.seq, revision: room.revision });
    this.broadcast(room);
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.markDisconnected(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.markDisconnected(socket);
  }

  async alarm(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) socket.close(4000, "Keepstorm room expired");
    await this.ctx.storage.deleteAll();
  }

  private async loadRoom(): Promise<PersistedRoom | null> {
    const stored = await this.ctx.storage.get<PersistedRoom | LegacyPersistedRoom>(ROOM_STORAGE_KEY);
    return stored ? normalizeRoom(stored) : null;
  }

  private async authenticate(socket: WebSocket, attachment: SocketAttachment, token: string): Promise<void> {
    const room = await this.loadRoom();
    if (!room) {
      send(socket, { type: "error", code: "room_closed", message: "This Keepstorm room has expired." });
      socket.close(4004, "Room expired");
      return;
    }

    let commander: CommanderId | null = null;
    for (const seat of seatsForMode(room.mode)) {
      if (await tokenMatches(token, room.tokenHashes[seat])) {
        commander = seat;
        break;
      }
    }
    if (!commander) {
      send(socket, { type: "error", code: "invalid_token", message: "That invitation seat token is not valid." });
      socket.close(4003, "Invalid seat token");
      return;
    }

    for (const existing of this.ctx.getWebSockets()) {
      if (existing === socket) continue;
      const existingAttachment = socketAttachment(existing);
      if (existingAttachment?.authenticated && existingAttachment.commander === commander) existing.close(4001, "Seat reconnected elsewhere");
    }

    socket.serializeAttachment({ ...attachment, authenticated: true, commander } satisfies SocketAttachment);
    room.reconnectDeadlines[commander] = null;
    room.lastAdvancedAt = Date.now();
    this.transitionReadyRoom(room, room.lastAdvancedAt);
    room.revision += 1;
    await this.persist(room);
    this.broadcast(room);
  }

  private transitionReadyRoom(room: PersistedRoom, now: number): void {
    const seats = seatsForMode(room.mode);
    if (!seats.every((commander) => room.factions[commander] && room.tokenHashes[commander])) return;
    if (!seats.every((commander) => this.isConnected(commander))) return;
    if (!seats.every((commander) => room.ready[commander])) return;

    if (room.phase === "waiting" || room.phase === "match_complete") {
      room.game = createMultiplayerState(room.mode, seatRecord((commander) => room.factions[commander] ?? "daybreak"));
    } else if (room.phase === "round_complete" && room.game) {
      room.game = startNextRound(room.game);
    } else {
      return;
    }
    room.phase = "playing";
    this.resetReady(room);
    room.reconnectDeadlines = seatRecord(() => null);
    room.lastAdvancedAt = now;
  }

  private advanceRoom(room: PersistedRoom, now: number): boolean {
    if (room.phase !== "playing" || !room.game) return false;
    const seats = seatsForMode(room.mode);
    if (!seats.every((commander) => this.isConnected(commander))) {
      const missing = seats.find((commander) => {
        const deadline = room.reconnectDeadlines[commander];
        return !this.isConnected(commander) && deadline !== null && now >= deadline;
      });
      if (missing) {
        room.game = forfeitGame(room.game, teamForCommander(missing));
        room.phase = "match_complete";
        this.resetReady(room);
        room.revision += 1;
        return true;
      }
      return false;
    }

    const elapsedMs = now - room.lastAdvancedAt;
    if (elapsedMs < MIN_TICK_MS) return false;
    room.game = advanceMultiplayerGame(room.game, elapsedMs / 1000);
    room.lastAdvancedAt = now;
    const nextPhase = phaseForGame(room.game);
    if (nextPhase !== room.phase) this.resetReady(room);
    room.phase = nextPhase;
    room.revision += 1;
    return true;
  }

  private async markDisconnected(socket: WebSocket): Promise<void> {
    const attachment = socketAttachment(socket);
    if (!attachment?.authenticated || !attachment.commander || this.isConnected(attachment.commander, socket)) return;
    const room = await this.loadRoom();
    if (!room) return;
    if (room.phase === "waiting") room.ready[attachment.commander] = false;
    if (room.phase === "playing") {
      room.reconnectDeadlines[attachment.commander] = Date.now() + RECONNECT_GRACE_MS;
      room.lastAdvancedAt = Date.now();
    }
    room.revision += 1;
    await this.persist(room);
    this.broadcast(room);
  }

  private async leaveRoom(room: PersistedRoom, commander: CommanderId, socket: WebSocket, sessionId: string): Promise<void> {
    socket.serializeAttachment({ authenticated: false, sessionId } satisfies SocketAttachment);

    if (room.phase === "playing" && room.game) {
      room.game = forfeitGame(room.game, teamForCommander(commander));
      room.phase = "match_complete";
      this.resetReady(room);
      room.reconnectDeadlines = seatRecord(() => null);
      if (commander !== "player") this.clearSeat(room, commander);
      room.revision += 1;
      await this.persist(room);
      this.broadcast(room);
      socket.close(1000, "Commander left the match");
      return;
    }

    if (commander !== "player") {
      this.clearSeat(room, commander);
      room.game = null;
      room.phase = "waiting";
      this.resetReady(room);
      room.revision += 1;
      await this.persist(room);
      this.broadcast(room);
      socket.close(1000, "Commander left the room");
      return;
    }

    for (const connected of this.ctx.getWebSockets()) {
      connected.serializeAttachment({ authenticated: false, sessionId: socketAttachment(connected)?.sessionId ?? crypto.randomUUID() } satisfies SocketAttachment);
      if (connected !== socket) send(connected, { type: "error", code: "room_closed", message: "The room host closed this Keepstorm room." });
      connected.close(1000, "Room host left");
    }
    await this.ctx.storage.deleteAll();
  }

  private clearSeat(room: PersistedRoom, commander: CommanderId): void {
    room.factions[commander] = null;
    room.tokenHashes[commander] = null;
    room.ready[commander] = false;
    room.lastSeq[commander] = 0;
    room.reconnectDeadlines[commander] = null;
  }

  private resetReady(room: PersistedRoom): void {
    room.ready = seatRecord(() => false);
  }

  private isConnected(commander: CommanderId, excluding?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (socket === excluding || socket.readyState !== WebSocket.OPEN) return false;
      const attachment = socketAttachment(socket);
      return attachment?.authenticated === true && attachment.commander === commander;
    });
  }

  private seatView(room: PersistedRoom, commander: CommanderId): RoomSeatView {
    return {
      faction: room.factions[commander],
      claimed: room.tokenHashes[commander] !== null,
      connected: this.isConnected(commander),
      ready: room.ready[commander],
      reconnectDeadline: room.reconnectDeadlines[commander],
    };
  }

  private snapshot(room: PersistedRoom, localCommander: CommanderId): RoomSnapshot {
    return {
      code: room.code,
      mode: room.mode,
      phase: room.phase,
      revision: room.revision,
      localCommander,
      localTeam: teamForCommander(localCommander),
      seats: seatRecord((commander) => this.seatView(room, commander)),
      game: room.game,
    };
  }

  private broadcast(room: PersistedRoom): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socketAttachment(socket);
      if (!attachment?.authenticated || !attachment.commander) continue;
      send(socket, { type: "snapshot", snapshot: this.snapshot(room, attachment.commander) });
    }
  }

  private async persist(room: PersistedRoom): Promise<void> {
    room.updatedAt = Date.now();
    await this.ctx.storage.put(ROOM_STORAGE_KEY, room);
  }
}
