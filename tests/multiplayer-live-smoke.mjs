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
    socket.send(JSON.stringify({ type: "hello", protocol: 2, token: credential.token }));
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
    credential,
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

function allConnected(snapshot, commanders) {
  return commanders.every((commander) => snapshot.seats[commander].connected);
}

async function runOneVersusOne() {
  const hostCredential = await post("/api/multiplayer/rooms", { faction: "daybreak", mode: "1v1" });
  const guestCredential = await post(`/api/multiplayer/rooms/${hostCredential.roomCode}/join`, { faction: "stormglass" });
  assert.equal(hostCredential.commander, "player");
  assert.equal(guestCredential.commander, "enemy");
  assert.equal(hostCredential.mode, "1v1");

  const host = openSeat(hostCredential);
  const guest = openSeat(guestCredential);
  const commanders = ["player", "enemy"];
  await Promise.all([
    host.next((message) => message.type === "snapshot" && allConnected(message.snapshot, commanders)),
    guest.next((message) => message.type === "snapshot" && allConnected(message.snapshot, commanders)),
  ]);

  host.send({ type: "set_ready", ready: true });
  guest.send({ type: "set_ready", ready: true });
  await Promise.all([
    host.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing"),
    guest.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing"),
  ]);

  host.send({ type: "command", seq: 1, command: { action: "place_building", kind: "dawn_bastion", gridX: 9, gridY: 4 } });
  guest.send({ type: "command", seq: 1, command: { action: "place_building", kind: "storm_coilforge", gridX: 80, gridY: 4 } });
  await host.next((message) => message.type === "snapshot" && message.snapshot.game?.buildings.length === 2);

  host.send({ type: "command", seq: 2, command: { action: "move_keep_warden", x: 400, y: 240 } });
  const wardenMoved = await host.next((message) => message.type === "snapshot" && message.snapshot.game?.keepWardens?.player.targetX === 400);
  assert.equal(wardenMoved.snapshot.game.keepWardens.player.targetY, 240);
  assert.equal("hp" in wardenMoved.snapshot.game.keepWardens.player, false);
  assert.equal("respawnClock" in wardenMoved.snapshot.game.keepWardens.player, false);

  host.socket.close(1000, "Reconnect smoke test");
  await guest.next((message) => message.type === "snapshot" && !message.snapshot.seats.player.connected && message.snapshot.seats.player.reconnectDeadline !== null);
  const reconnectedHost = openSeat(hostCredential);
  const restored = await reconnectedHost.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing" && allConnected(message.snapshot, commanders));
  assert.equal(restored.snapshot.game.buildings.length, 2);

  guest.send({ type: "leave_room" });
  const forfeited = await reconnectedHost.next((message) => message.type === "snapshot" && message.snapshot.phase === "match_complete" && message.snapshot.game?.status === "won");
  assert.equal(forfeited.snapshot.seats.enemy.claimed, false);
  reconnectedHost.send({ type: "leave_room" });
}

async function runTwoVersusTwo() {
  const credentials = [];
  const host = await post("/api/multiplayer/rooms", { faction: "daybreak", mode: "2v2" });
  credentials.push(host);
  credentials.push(await post(`/api/multiplayer/rooms/${host.roomCode}/join`, { faction: "stormglass" }));
  credentials.push(await post(`/api/multiplayer/rooms/${host.roomCode}/join`, { faction: "briarcrown" }));
  credentials.push(await post(`/api/multiplayer/rooms/${host.roomCode}/join`, { faction: "daybreak" }));
  assert.deepEqual(credentials.map((credential) => credential.commander), ["player", "enemy", "player_ally", "enemy_ally"]);
  assert.ok(credentials.every((credential) => credential.mode === "2v2"));

  const seats = credentials.map(openSeat);
  const commanders = credentials.map((credential) => credential.commander);
  await Promise.all(seats.map((seat) => seat.next((message) => message.type === "snapshot" && allConnected(message.snapshot, commanders))));
  seats.forEach((seat) => seat.send({ type: "set_ready", ready: true }));
  await Promise.all(seats.map((seat) => seat.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing")));

  const commands = [
    { action: "place_building", kind: "dawn_bastion", gridX: 9, gridY: 4 },
    { action: "place_building", kind: "storm_coilforge", gridX: 80, gridY: 4 },
    { action: "place_building", kind: "briar_hollow", gridX: 9, gridY: 16 },
    { action: "place_building", kind: "dawn_bastion", gridX: 80, gridY: 16 },
  ];
  seats.forEach((seat, index) => seat.send({ type: "command", seq: 1, command: commands[index] }));
  const built = await seats[0].next((message) => message.type === "snapshot" && message.snapshot.game?.buildings.length === 4);
  assert.deepEqual(new Set(built.snapshot.game.buildings.map((building) => building.commander)), new Set(commanders));
  assert.equal(built.snapshot.game.resources.player_ally.marks, 288);
  assert.equal(built.snapshot.game.resources.player.marks, 290);

  const wardenCommands = [
    { action: "move_keep_warden", x: 400, y: 240 },
    { action: "move_keep_warden", x: 2800, y: 240 },
    { action: "move_keep_warden", x: 400, y: 624 },
    { action: "move_keep_warden", x: 2800, y: 624 },
  ];
  seats.forEach((seat, index) => seat.send({ type: "command", seq: 2, command: wardenCommands[index] }));
  const wardensMoved = await seats[0].next((message) => message.type === "snapshot"
    && message.snapshot.game?.keepWardens?.player.targetX === 400
    && message.snapshot.game?.keepWardens?.enemy.targetX === 2800
    && message.snapshot.game?.keepWardens?.player_ally.targetX === 400
    && message.snapshot.game?.keepWardens?.enemy_ally.targetX === 2800);
  assert.equal(wardensMoved.snapshot.game.keepWardens.player_ally.targetX, 400);

  seats[0].send({ type: "command", seq: 3, command: { action: "move_keep_warden", x: 400, y: 624 } });
  const rejectedMove = await seats[0].next((message) => message.type === "error" && message.seq === 3);
  assert.equal(rejectedMove.code, "command_rejected");

  seats[2].socket.close(1000, "2v2 ally reconnect smoke test");
  await seats[0].next((message) => message.type === "snapshot" && !message.snapshot.seats.player_ally.connected && message.snapshot.seats.player_ally.reconnectDeadline !== null);
  const restoredAlly = openSeat(credentials[2]);
  const restored = await restoredAlly.next((message) => message.type === "snapshot" && message.snapshot.phase === "playing" && allConnected(message.snapshot, commanders));
  assert.equal(restored.snapshot.game.buildings.length, 4);

  seats[3].send({ type: "leave_room" });
  const forfeited = await seats[0].next((message) => message.type === "snapshot" && message.snapshot.phase === "match_complete" && message.snapshot.game?.status === "won");
  assert.equal(forfeited.snapshot.seats.enemy_ally.claimed, false);
  seats[0].send({ type: "leave_room" });
  seats[1].socket.close();
  restoredAlly.socket.close();
}

await runOneVersusOne();
await runTwoVersusTwo();
console.log("Keepstorm live 1v1 and 2v2 multiplayer smoke passed.");
