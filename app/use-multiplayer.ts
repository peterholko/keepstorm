"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  isRoomCode,
  isServerMessage,
  normalizeRoomCode,
  type ConnectionState,
  type GameCommand,
  type RoomCredential,
  type RoomSnapshot,
} from "@/lib/multiplayer/protocol";
import type { FactionId, Team } from "@/lib/musterhold/engine";

const SEAT_STORAGE_KEY = "keepstorm.multiplayer.seat.v1";
const TICK_INTERVAL_MS = 150;

interface StoredSeat {
  credential: RoomCredential;
  nextSeq: number;
}

interface ApiError {
  message?: string;
}

function readStoredSeat(): StoredSeat | null {
  try {
    const raw = window.sessionStorage.getItem(SEAT_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<StoredSeat>;
    const credential = candidate.credential;
    if (!credential || !isRoomCode(credential.roomCode) || (credential.team !== "player" && credential.team !== "enemy") || typeof credential.token !== "string") return null;
    return { credential, nextSeq: Number.isSafeInteger(candidate.nextSeq) && Number(candidate.nextSeq) > 0 ? Number(candidate.nextSeq) : 1 };
  } catch {
    return null;
  }
}

function writeStoredSeat(credential: RoomCredential, nextSeq: number): void {
  window.sessionStorage.setItem(SEAT_STORAGE_KEY, JSON.stringify({ credential, nextSeq } satisfies StoredSeat));
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as ApiError;
    return body.message || "The multiplayer room could not be reached.";
  } catch {
    return "The multiplayer room could not be reached.";
  }
}

export function useMultiplayer() {
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const credentialRef = useRef<RoomCredential | null>(null);
  const nextSeqRef = useRef(1);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const connectRef = useRef<(credential: RoomCredential, reconnecting?: boolean) => void>(() => undefined);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const connect = useCallback((credential: RoomCredential, reconnecting = false) => {
    clearReconnectTimer();
    const previous = socketRef.current;
    if (previous && previous.readyState < WebSocket.CLOSING) previous.close(1000, "Connection replaced");

    credentialRef.current = credential;
    shouldReconnectRef.current = true;
    setTeam(credential.team);
    setRoomCode(credential.roomCode);
    setConnection(reconnecting ? "reconnecting" : "connecting");

    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${scheme}//${window.location.host}/api/multiplayer/rooms/${credential.roomCode}/socket`);
    socketRef.current = socket;
    let helloSent = false;

    const authenticate = () => {
      if (helloSent || socket.readyState !== WebSocket.OPEN) return;
      helloSent = true;
      socket.send(JSON.stringify({ type: "hello", protocol: MULTIPLAYER_PROTOCOL_VERSION, token: credential.token }));
    };

    socket.addEventListener("open", authenticate);
    socket.addEventListener("message", (event) => {
      let value: unknown;
      try { value = JSON.parse(String(event.data)); } catch { return; }
      if (!isServerMessage(value)) return;
      if (value.type === "hello_required") { authenticate(); return; }
      if (value.type === "snapshot") {
        reconnectAttemptRef.current = 0;
        setSnapshot(value.snapshot);
        setConnection("connected");
        setNotice(null);
        return;
      }
      if (value.type === "error") {
        setNotice(value.message);
        if (value.code === "room_closed" || value.code === "invalid_token") {
          shouldReconnectRef.current = false;
          window.sessionStorage.removeItem(SEAT_STORAGE_KEY);
          setConnection("error");
        }
      }
    });
    socket.addEventListener("close", () => {
      if (socketRef.current !== socket || !shouldReconnectRef.current) return;
      setConnection("reconnecting");
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(8_000, 500 * (2 ** Math.min(attempt, 4)));
      reconnectTimerRef.current = window.setTimeout(() => connectRef.current(credential, true), delay);
    });
    socket.addEventListener("error", () => {
      if (socketRef.current === socket) setNotice("The live match connection was interrupted. Reconnecting…");
    });
  }, [clearReconnectTimer]);

  useEffect(() => { connectRef.current = connect; }, [connect]);

  useEffect(() => {
    const stored = readStoredSeat();
    if (!stored) return;
    const invitation = normalizeRoomCode(new URL(window.location.href).searchParams.get("room") ?? "");
    if (invitation && invitation !== stored.credential.roomCode) return;
    nextSeqRef.current = stored.nextSeq;
    const timeout = window.setTimeout(() => connect(stored.credential), 0);
    return () => window.clearTimeout(timeout);
  }, [connect]);

  useEffect(() => {
    if (connection !== "connected") return;
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "tick" }));
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [connection]);

  useEffect(() => () => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();
    socketRef.current?.close(1000, "Page closed");
  }, [clearReconnectTimer]);

  const enterRoom = useCallback((credential: RoomCredential) => {
    nextSeqRef.current = 1;
    writeStoredSeat(credential, nextSeqRef.current);
    const url = new URL(window.location.href);
    url.searchParams.set("room", credential.roomCode);
    window.history.replaceState(null, "", url);
    setSnapshot(null);
    setNotice(null);
    connect(credential);
  }, [connect]);

  const createRoom = useCallback(async (faction: FactionId) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/multiplayer/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faction }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      enterRoom(await response.json() as RoomCredential);
    } catch (error) {
      setConnection("error");
      setNotice(error instanceof Error ? error.message : "A Keepstorm room could not be created.");
    } finally {
      setBusy(false);
    }
  }, [enterRoom]);

  const joinRoom = useCallback(async (code: string, faction: FactionId) => {
    const normalized = normalizeRoomCode(code);
    if (!isRoomCode(normalized)) {
      setNotice("Enter the full eight-character invitation code.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/multiplayer/rooms/${normalized}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faction }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      enterRoom(await response.json() as RoomCredential);
    } catch (error) {
      setConnection("error");
      setNotice(error instanceof Error ? error.message : "That Keepstorm room could not be joined.");
    } finally {
      setBusy(false);
    }
  }, [enterRoom]);

  const setReady = useCallback((ready: boolean) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "set_ready", ready }));
  }, []);

  const sendCommand = useCallback((command: GameCommand) => {
    const socket = socketRef.current;
    const credential = credentialRef.current;
    if (!credential || socket?.readyState !== WebSocket.OPEN || connection !== "connected") {
      setNotice("Your command will be available once the room reconnects.");
      return;
    }
    const seq = nextSeqRef.current++;
    writeStoredSeat(credential, nextSeqRef.current);
    socket.send(JSON.stringify({ type: "command", seq, command }));
  }, [connection]);

  const leaveRoom = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "leave_room" }));
    socketRef.current?.close(1000, "Commander left");
    socketRef.current = null;
    credentialRef.current = null;
    window.sessionStorage.removeItem(SEAT_STORAGE_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState(null, "", url);
    setSnapshot(null);
    setTeam(null);
    setRoomCode("");
    setConnection("idle");
    setNotice(null);
  }, [clearReconnectTimer]);

  return { connection, snapshot, team, roomCode, notice, busy, createRoom, joinRoom, setReady, sendCommand, leaveRoom };
}
