import assert from "node:assert/strict";

const baseUrl = process.env.KEEPSTORM_BASE_URL ?? "http://localhost:3001";

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) assert.fail(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json();
}

function openSeat(credential) {
  const url = new URL(`/api/multiplayer/rooms/${credential.roomCode}/socket`, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url);
  const messages = [];
  const waiters = [];
  let helloSent = false;

  const authenticate = () => {
    if (helloSent || socket.readyState !== WebSocket.OPEN) return;
    helloSent = true;
    socket.send(JSON.stringify({ type: "hello", protocol: 1, token: credential.token }));
  };

  const deliver = (message) => {
    messages.push(message);
    for (const waiter of [...waiters]) {
      const found = messages.find(waiter.predicate);
      if (!found) continue;
      waiter.resolve(found);
      waiters.splice(waiters.indexOf(waiter), 1);
    }
  };

  socket.addEventListener("open", authenticate);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.type === "hello_required" && socket.readyState === WebSocket.OPEN) {
      authenticate();
      return;
    }
    deliver(message);
  });

  return {
    socket,
    send(message) { socket.send(JSON.stringify(message)); },
    next(predicate, timeoutMs = 5_000) {
      const found = messages.find(predicate);
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve };
        waiters.push(waiter);
        setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error("Timed out waiting for multiplayer state."));
        }, timeoutMs).unref();
      });
    },
  };
}

const hostCredential = await post("/api/multiplayer/rooms", { faction: "daybreak" });
const guestCredential = await post(`/api/multiplayer/rooms/${hostCredential.roomCode}/join`, { faction: "stormglass" });
assert.equal(hostCredential.team, "player");
assert.equal(guestCredential.team, "enemy");

const host = openSeat(hostCredential);
const guest = openSeat(guestCredential);
await Promise.all([
  host.next((message) => message.type === "snapshot" && message.snapshot.seats.player.connected && message.snapshot.seats.enemy.connected),
  guest.next((message) => message.type === "snapshot" && message.snapshot.seats.player.connected && message.snapshot.seats.enemy.connected),
]);

host.send({ type: "set_ready", ready: true });
guest.send({ type: "set_ready", ready: true });
await Promise.all([
  host.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing"),
  guest.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing"),
]);

host.send({ type: "command", seq: 1, command: { action: "place_building", kind: "dawn_bastion", gridX: 9, gridY: 4 } });
guest.send({ type: "command", seq: 1, command: { action: "place_building", kind: "storm_coilforge", gridX: 80, gridY: 4 } });
await host.next((message) => message.type === "snapshot" && message.snapshot.game?.buildings.some((building) => building.team === "player") && message.snapshot.game.buildings.some((building) => building.team === "enemy"));

host.socket.close(1000, "Reconnect smoke test");
await guest.next((message) => message.type === "snapshot" && !message.snapshot.seats.player.connected && message.snapshot.seats.player.reconnectDeadline !== null);
const reconnectedHost = openSeat(hostCredential);
const restored = await reconnectedHost.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing" && message.snapshot.seats.player.connected && message.snapshot.seats.enemy.connected);
assert.equal(restored.snapshot.game.buildings.length, 2);

guest.send({ type: "leave_room" });
const forfeited = await reconnectedHost.next((message) => message.type === "snapshot" && message.snapshot.phase === "match_complete" && message.snapshot.game?.status === "won");
assert.equal(forfeited.snapshot.seats.enemy.claimed, false);
reconnectedHost.send({ type: "leave_room" });
console.log(`Keepstorm live multiplayer smoke passed for room ${hostCredential.roomCode}.`);
