import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILDING_SPECS,
  REPRIEVE_READY_AT,
  UNIT_SPECS,
  castReprieve,
  createInitialState,
  damageMultiplier,
  placeBuilding,
  reprieveReady,
  stepGame,
  validatePlacement,
  yieldFor,
  type BuildingKind,
  type GameState,
  type Unit,
} from "../lib/musterhold/engine.ts";

function advance(state: GameState, seconds: number): GameState {
  let current = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) current = stepGame(current, 0.1);
  return current;
}

test("Hammer, Arrow, and Arc form a complete readable counter cycle", () => {
  assert.equal(damageMultiplier("ramguard", "quillrunner"), 1.7);
  assert.equal(damageMultiplier("quillrunner", "wispwright"), 1.7);
  assert.equal(damageMultiplier("wispwright", "ramguard"), 1.7);
  assert.equal(damageMultiplier("quillrunner", "ramguard"), 0.74);
});

test("placement respects the X/Y yard, footprints, and existing Foundries", () => {
  const initial = createInitialState();
  assert.equal(validatePlacement(initial, "player", "ramworks", 4, 3).valid, true);
  assert.equal(validatePlacement(initial, "player", "ramworks", 3, 3).valid, false);
  assert.equal(validatePlacement(initial, "player", "ramworks", 14, 3).valid, false);

  const placed = placeBuilding(initial, "player", "ramworks", 4, 3);
  assert.equal(placed.buildings.length, 1);
  assert.equal(placed.coins.player, initial.coins.player - BUILDING_SPECS.ramworks.cost);
  assert.match(validatePlacement(placed, "player", "quillnest", 5, 4).reason, /occupies/i);
});

test("a placement cannot block another Foundry's cohort exit", () => {
  const state = placeBuilding(createInitialState(), "player", "ramworks", 4, 10);
  const blocked = validatePlacement(state, "player", "tallyhouse", 7, 10);
  assert.equal(blocked.valid, false);
  assert.match(blocked.reason, /exit would be blocked/i);
});

test("a Foundry automatically deploys a cohort that moves in both axes", () => {
  let state = placeBuilding(createInitialState(), "player", "ramworks", 13, 4);
  state = advance(state, 2.5);
  const spawned = state.units.find((unit) => unit.team === "player");
  assert.ok(spawned);
  assert.equal(spawned.kind, "ramguard");
  const firstPosition = { x: spawned.x, y: spawned.y };
  state = advance(state, 2);
  const moved = state.units.find((unit) => unit.id === spawned.id);
  assert.ok(moved);
  assert.ok(moved.x > firstPosition.x || moved.y > firstPosition.y);
  assert.notEqual(moved.y, firstPosition.y);
});

test("a Tallyhouse increases each seven-second Yield without spawning a cohort", () => {
  let state = placeBuilding(createInitialState(), "player", "tallyhouse", 4, 4);
  assert.equal(yieldFor(state, "player"), 68);
  const afterPurchase = state.coins.player;
  state = advance(state, 7.1);
  assert.equal(state.coins.player, afterPurchase + 68);
  assert.equal(state.units.filter((unit) => unit.team === "player").length, 0);
});

test("Nightveil reads the player's dominant cohort and opens with its counter", () => {
  let state = placeBuilding(createInitialState(), "player", "ramworks", 4, 4);
  state = advance(state, 4);
  assert.ok(state.buildings.some((building) => building.team === "enemy" && building.kind === "beaconarium"));
});

test("Reprieve clears the caster half, wounds the far half, and is spent once", () => {
  const initial = createInitialState();
  initial.elapsed = REPRIEVE_READY_AT;
  const unit = (id: number, x: number): Unit => ({
    id,
    team: "enemy",
    kind: "ramguard",
    x,
    y: 440,
    hp: UNIT_SPECS.ramguard.maxHp,
    maxHp: UNIT_SPECS.ramguard.maxHp,
    cooldown: 0,
    attackFlash: 0,
    path: [],
    pathIndex: 0,
  });
  initial.units = [unit(1, 300), unit(2, 920)];
  assert.equal(reprieveReady(initial, "player"), true);

  const after = castReprieve(initial, "player");
  assert.equal(after.units.length, 1);
  assert.equal(after.units[0].id, 2);
  assert.ok(after.units[0].hp < UNIT_SPECS.ramguard.maxHp);
  assert.equal(after.reprieveUsed.player, true);
  assert.equal(castReprieve(after, "player"), after);
});

test("a developed skirmish always closes its ledger by the five-minute limit", () => {
  let state = createInitialState();
  const buildOrder: BuildingKind[] = ["ramworks", "quillnest", "beaconarium", "tallyhouse"];
  const positions = [
    [4, 4], [8, 4], [12, 4], [4, 9], [8, 9], [12, 9],
    [4, 14], [8, 14], [12, 14], [4, 19], [8, 19], [12, 19],
  ] as const;
  let nextBuild = 0;
  let position = 0;

  while (state.status === "playing" && state.elapsed < 302) {
    if (state.elapsed >= nextBuild && position < positions.length) {
      const kind = buildOrder[position % buildOrder.length];
      state = placeBuilding(state, "player", kind, positions[position][0], positions[position][1]);
      if (state.stats.buildingsPlaced.player > position) position += 1;
      nextBuild += 3;
    }
    if (reprieveReady(state, "player") && state.units.filter((unit) => unit.team === "enemy" && unit.x < 800).length >= 3) {
      state = castReprieve(state, "player");
    }
    state = stepGame(state, 0.1);
  }

  assert.notEqual(state.status, "playing");
  assert.ok(state.elapsed <= 300.2);
});
