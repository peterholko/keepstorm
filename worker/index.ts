/** Cloudflare Worker entry point for Keepstorm and its authoritative match rooms. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { teamForCommander } from "../lib/keepstorm/engine.ts";
import { isFactionId, isOnlineMatchMode, type CreateRoomResponse, type JoinRoomResponse } from "../lib/multiplayer/protocol.ts";
import { KeepstormMatchRoom, type RoomSetupResult } from "./match-room.ts";

interface ImageBinding {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
    };
  };
}

type KeepstormEnv = Omit<CloudflareBindings, "MATCH_ROOMS"> & {
  ASSETS: Fetcher;
  IMAGES: ImageBinding;
  MATCH_ROOMS: DurableObjectNamespace<KeepstormMatchRoom>;
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_HTTP_BODY_BYTES = 4_096;

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readSmallJson(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTTP_BODY_BYTES) return null;
  const text = await request.text();
  if (text.length > MAX_HTTP_BODY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function randomRoomCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
}

function setupError(result: Extract<RoomSetupResult, { ok: false }>): Response {
  const status = result.code === "not_found" ? 404 : result.code === "room_full" ? 409 : 503;
  return json({ error: result.code, message: result.message }, { status });
}

async function createRoom(request: Request, env: KeepstormEnv): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "origin_rejected", message: "Create the room from Keepstorm itself." }, { status: 403 });
  const body = await readSmallJson(request);
  if (!body || !isFactionId(body.faction)) return json({ error: "invalid_faction", message: "Choose a valid Keepstorm faction." }, { status: 400 });
  if (!isOnlineMatchMode(body.mode)) return json({ error: "invalid_mode", message: "Choose a 1v1 or 2v2 Keepstorm room." }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = randomRoomCode();
    const room = env.MATCH_ROOMS.getByName(roomCode);
    const result = await room.createRoom(roomCode, body.faction, body.mode);
    if (result.ok) {
      const response: CreateRoomResponse = { roomCode, mode: result.mode, commander: "player", team: "player", token: result.token };
      return json(response, { status: 201 });
    }
    if (result.code !== "conflict") return setupError(result);
  }
  return json({ error: "room_creation_failed", message: "A room could not be reserved. Please try again." }, { status: 503 });
}

async function joinRoom(request: Request, env: KeepstormEnv, roomCode: string): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "origin_rejected", message: "Join the room from Keepstorm itself." }, { status: 403 });
  const body = await readSmallJson(request);
  if (!body || !isFactionId(body.faction)) return json({ error: "invalid_faction", message: "Choose a valid Keepstorm faction." }, { status: 400 });

  const room = env.MATCH_ROOMS.getByName(roomCode);
  const result = await room.joinRoom(body.faction);
  if (!result.ok) return setupError(result);
  const response: JoinRoomResponse = {
    roomCode,
    mode: result.mode,
    commander: result.commander,
    team: teamForCommander(result.commander),
    token: result.token,
  };
  return json(response);
}

function logError(request: Request, error: unknown): void {
  console.error(JSON.stringify({
    message: "Keepstorm request failed",
    method: request.method,
    path: new URL(request.url).pathname,
    error: error instanceof Error ? error.message : String(error),
  }));
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: KeepstormEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/api/multiplayer/rooms") return await createRoom(request, env);

      const roomRoute = url.pathname.match(/^\/api\/multiplayer\/rooms\/([A-HJ-NP-Z2-9]{8})\/(join|socket)$/);
      if (roomRoute) {
        const [, roomCode, action] = roomRoute;
        if (action === "join" && request.method === "POST") return await joinRoom(request, env, roomCode);
        if (action === "socket" && request.method === "GET") {
          if (!sameOrigin(request)) return json({ error: "origin_rejected", message: "Open the connection from Keepstorm itself." }, { status: 403 });
          return await env.MATCH_ROOMS.getByName(roomCode).fetch(request);
        }
        return json({ error: "method_not_allowed", message: "That multiplayer action is not available." }, { status: 405 });
      }

      if (url.pathname === "/_vinext/image") {
        const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
        return await handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths);
      }

      return await handler.fetch(request, env, ctx);
    } catch (error) {
      logError(request, error);
      if (url.pathname.startsWith("/api/multiplayer/")) return json({ error: "service_unavailable", message: "The multiplayer service is temporarily unavailable." }, { status: 503 });
      return json({ error: "site_error", message: "Keepstorm could not complete that request." }, { status: 500 });
    }
  },
};

export { KeepstormMatchRoom };
export default worker;
