import {
  BUILDING_SPECS,
  FACTION_IDS,
  SHOP_ITEM_KINDS,
  type BuildingKind,
  type FactionId,
  type GameState,
  type ShopItemKind,
  type Team,
} from "../musterhold/engine.ts";

export const MULTIPLAYER_PROTOCOL_VERSION = 1 as const;
export const ROOM_CODE_LENGTH = 8;
export const RECONNECT_GRACE_MS = 30_000;

export type RoomPhase = "waiting" | "playing" | "round_complete" | "match_complete";
export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export type GameCommand =
  | { action: "place_building"; kind: BuildingKind; gridX: number; gridY: number }
  | { action: "upgrade_building"; buildingId: number }
  | { action: "toggle_production"; buildingId: number }
  | { action: "toggle_sync" }
  | { action: "buy_item"; item: ShopItemKind }
  | { action: "cast_reprieve" };

export type ClientMessage =
  | { type: "hello"; protocol: typeof MULTIPLAYER_PROTOCOL_VERSION; token: string }
  | { type: "tick" }
  | { type: "leave_room" }
  | { type: "set_ready"; ready: boolean }
  | { type: "command"; seq: number; command: GameCommand };

export interface RoomSeatView {
  faction: FactionId | null;
  claimed: boolean;
  connected: boolean;
  ready: boolean;
  reconnectDeadline: number | null;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  revision: number;
  localTeam: Team;
  seats: Record<Team, RoomSeatView>;
  game: GameState | null;
}

export type ServerMessage =
  | { type: "hello_required"; protocol: typeof MULTIPLAYER_PROTOCOL_VERSION }
  | { type: "snapshot"; snapshot: RoomSnapshot }
  | { type: "ack"; seq: number; revision: number }
  | { type: "error"; code: string; message: string; seq?: number };

export interface RoomCredential {
  roomCode: string;
  team: Team;
  token: string;
}

export interface CreateRoomResponse extends RoomCredential {
  team: "player";
}

export interface JoinRoomResponse extends RoomCredential {
  team: "enemy";
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonObject : null;
}

export function isFactionId(value: unknown): value is FactionId {
  return typeof value === "string" && (FACTION_IDS as string[]).includes(value);
}

export function isRoomCode(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^[A-HJ-NP-Z2-9]{${ROOM_CODE_LENGTH}}$`).test(value);
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isGameCommand(value: unknown): value is GameCommand {
  const candidate = asObject(value);
  if (!candidate || typeof candidate.action !== "string") return false;

  if (candidate.action === "place_building") {
    return typeof candidate.kind === "string"
      && candidate.kind in BUILDING_SPECS
      && Number.isInteger(candidate.gridX)
      && Number.isInteger(candidate.gridY);
  }
  if (candidate.action === "upgrade_building" || candidate.action === "toggle_production") {
    return Number.isSafeInteger(candidate.buildingId) && Number(candidate.buildingId) > 0;
  }
  if (candidate.action === "toggle_sync" || candidate.action === "cast_reprieve") return true;
  if (candidate.action === "buy_item") {
    return typeof candidate.item === "string" && (SHOP_ITEM_KINDS as string[]).includes(candidate.item);
  }
  return false;
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  const candidate = asObject(value);
  if (!candidate || typeof candidate.type !== "string") return null;

  if (candidate.type === "hello") {
    return candidate.protocol === MULTIPLAYER_PROTOCOL_VERSION
      && typeof candidate.token === "string"
      && candidate.token.length >= 32
      && candidate.token.length <= 128
      ? { type: "hello", protocol: MULTIPLAYER_PROTOCOL_VERSION, token: candidate.token }
      : null;
  }
  if (candidate.type === "tick") return { type: "tick" };
  if (candidate.type === "leave_room") return { type: "leave_room" };
  if (candidate.type === "set_ready") {
    return typeof candidate.ready === "boolean" ? { type: "set_ready", ready: candidate.ready } : null;
  }
  if (candidate.type === "command") {
    return Number.isSafeInteger(candidate.seq)
      && Number(candidate.seq) > 0
      && isGameCommand(candidate.command)
      ? { type: "command", seq: Number(candidate.seq), command: candidate.command }
      : null;
  }
  return null;
}

export function isServerMessage(value: unknown): value is ServerMessage {
  const candidate = asObject(value);
  if (!candidate || typeof candidate.type !== "string") return false;
  if (candidate.type === "hello_required") return candidate.protocol === MULTIPLAYER_PROTOCOL_VERSION;
  if (candidate.type === "ack") return Number.isSafeInteger(candidate.seq) && Number.isSafeInteger(candidate.revision);
  if (candidate.type === "error") return typeof candidate.code === "string" && typeof candidate.message === "string";
  if (candidate.type !== "snapshot") return false;
  const snapshot = asObject(candidate.snapshot);
  return Boolean(snapshot
    && isRoomCode(snapshot.code)
    && typeof snapshot.phase === "string"
    && ["waiting", "playing", "round_complete", "match_complete"].includes(snapshot.phase)
    && Number.isSafeInteger(snapshot.revision)
    && (snapshot.localTeam === "player" || snapshot.localTeam === "enemy")
    && asObject(snapshot.seats));
}
