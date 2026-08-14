import assert from "node:assert/strict";
import test from "node:test";
import {
  STORM_READY_AT,
  UNIT_SPECS,
  castStormbreak,
  createInitialState,
  damageMultiplier,
  purchaseWork,
  stepGame,
} from "../lib/game-engine.ts";

function advance<T>(state: T, seconds: number, step: (value: T, dt: number) => T): T {
  let current = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) current = step(current, 0.1);
  return current;
}

test("the three company materials form a complete counter cycle", () => {
  assert.equal(damageMultiplier("kilnward", "windlass"), 1.75);
  assert.equal(damageMultiplier("windlass", "prism"), 1.75);
  assert.equal(damageMultiplier("prism", "kilnward"), 1.75);
  assert.equal(damageMultiplier("windlass", "kilnward"), 0.72);
});

test("a Musterwork spends Coin and automatically raises its company", () => {
  let state = purchaseWork(createInitialState(), "player", "kilnward");
  assert.equal(state.playerCoin, 300 - UNIT_SPECS.kilnward.cost);
  assert.equal(state.works.player.kilnward, 1);

  state = advance(state, 1.5, stepGame);
  assert.ok(state.units.some((unit) => unit.team === "player" && unit.kind === "kilnward"));
});

test("Stormbreak clears invaders from the caster half and can only be spent once", () => {
  const initial = createInitialState();
  initial.elapsed = STORM_READY_AT;
  initial.units = [
    { id: 1, team: "enemy", kind: "kilnward", x: 300, hp: 250, maxHp: 250, cooldown: 0, attackFlash: 0 },
    { id: 2, team: "enemy", kind: "windlass", x: 700, hp: 145, maxHp: 145, cooldown: 0, attackFlash: 0 },
  ];

  const after = castStormbreak(initial, "player");
  assert.equal(after.units.length, 1);
  assert.equal(after.units[0].id, 2);
  assert.ok(after.units[0].hp < 145);
  assert.equal(after.stormUsed.player, true);
  assert.equal(castStormbreak(after, "player"), after);
});

test("lane pressure resolves a fully developed match before the time limit", () => {
  let state = createInitialState();
  let nextBuild = 0;
  let buildIndex = 0;

  while (state.status === "playing" && state.elapsed < 241) {
    if (state.elapsed >= nextBuild) {
      state = purchaseWork(state, "player", ["kilnward", "windlass", "prism"][buildIndex % 3] as "kilnward" | "windlass" | "prism");
      buildIndex += 1;
      nextBuild += 4;
    }
    state = stepGame(state, 0.1);
  }

  assert.notEqual(state.status, "playing");
  assert.ok(state.playerKeep === 0 || state.enemyKeep === 0 || state.elapsed >= 240);
});
