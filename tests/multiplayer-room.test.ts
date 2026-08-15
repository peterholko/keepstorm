import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../lib/musterhold/engine.ts";
import { isGameCommand, normalizeRoomCode, parseClientMessage } from "../lib/multiplayer/protocol.ts";
import { advanceMultiplayerGame, applyGameCommand, forfeitGame, phaseForGame } from "../lib/multiplayer/room.ts";

test("multiplayer messages accept only bounded, versioned battlefield commands", () => {
  assert.equal(normalizeRoomCode(" abcd-23oi-99 "), "ABCD2399");
  assert.deepEqual(parseClientMessage({ type: "set_ready", ready: true }), { type: "set_ready", ready: true });
  assert.deepEqual(parseClientMessage({ type: "leave_room" }), { type: "leave_room" });
  assert.equal(parseClientMessage({ type: "hello", protocol: 99, token: "a".repeat(64) }), null);
  assert.equal(isGameCommand({ action: "place_building", kind: "dawn_bastion", gridX: 9, gridY: 4 }), true);
  assert.equal(isGameCommand({ action: "place_building", kind: "not_a_building", gridX: 9, gridY: 4 }), false);
  assert.equal(isGameCommand({ action: "upgrade_building", buildingId: -1 }), false);
});

test("each online seat can commission only its own faction inside its own yard", () => {
  const initial = createInitialState("daybreak", "stormglass");
  const enemyBuild = applyGameCommand(initial, "enemy", { action: "place_building", kind: "storm_coilforge", gridX: 80, gridY: 4 });
  assert.equal(enemyBuild.accepted, true);
  assert.equal(enemyBuild.state.buildings[0]?.team, "enemy");
  assert.equal(enemyBuild.state.started, true);

  const wrongFaction = applyGameCommand(initial, "enemy", { action: "place_building", kind: "dawn_bastion", gridX: 80, gridY: 4 });
  assert.equal(wrongFaction.accepted, false);
  assert.match(wrongFaction.message, /faction/i);

  const wrongYard = applyGameCommand(initial, "enemy", { action: "place_building", kind: "storm_coilforge", gridX: 9, gridY: 4 });
  assert.equal(wrongYard.accepted, false);
  assert.match(wrongYard.message, /construction yard/i);
});

test("authoritative multiplayer advances simulation without invoking the solo bot", () => {
  let state = createInitialState("daybreak", "briarcrown");
  state = applyGameCommand(state, "player", { action: "place_building", kind: "dawn_bastion", gridX: 9, gridY: 4 }).state;
  state.aiClock = 0;
  const advanced = advanceMultiplayerGame(state, 1);
  assert.equal(advanced.elapsed, 1);
  assert.equal(advanced.buildings.filter((building) => building.team === "enemy").length, 0);
  assert.equal(phaseForGame(advanced), "playing");
});

test("a commander who exceeds reconnect grace forfeits the complete match", () => {
  const state = createInitialState("daybreak", "stormglass");
  const forfeited = forfeitGame(state, "enemy");
  assert.equal(forfeited.status, "won");
  assert.equal(forfeited.roundWins.player, 2);
  assert.match(forfeited.event, /did not reconnect/i);
});
