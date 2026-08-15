import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILDING_SPECS,
  DAMAGE_MATRIX,
  FACTIONS,
  GRID_COLUMNS,
  KEEP_POSITIONS,
  MATCH_LIMIT,
  REPRIEVE_READY_AT,
  UNIT_SPECS,
  WORLD_WIDTH,
  buyShopItem,
  canAfford,
  castReprieve,
  createInitialState,
  createMultiplayerState,
  factionBuildings,
  incomeFor,
  placeBuilding,
  reprieveReady,
  startNextRound,
  stepGame,
  toggleSynchronization,
  upgradeBuilding,
  validatePlacement,
  type GameState,
  type Team,
  type Unit,
  type UnitKind,
} from "../lib/keepstorm/engine.ts";
import {
  motionDurationForSnapshots,
  retargetUnitMotion,
  sampleUnitMotion,
  stationaryUnitMotion,
} from "../lib/keepstorm/render-motion.ts";
import { placementCellFromClientPoint, TOUCH_PLACEMENT_LIFT_PX } from "../lib/keepstorm/placement-input.ts";

function advance(state: GameState, seconds: number): GameState {
  let current = state;
  for (let elapsed = 0; elapsed < seconds && current.status === "playing"; elapsed += .1) current = stepGame(current, .1);
  return current;
}

function testUnit(id: number, team: Team, kind: UnitKind, x: number, cooldown = 0): Unit {
  const spec = UNIT_SPECS[kind];
  return {
    id,
    team,
    kind,
    level: 1,
    x,
    y: 448,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    shield: 0,
    cooldown,
    attackFlash: 0,
    path: [],
    pathIndex: 0,
    poisonTimer: 0,
    poisonDps: 0,
    slowTimer: 0,
    stunTimer: 0,
  };
}

test("touch placement lifts the preview above the finger and clamps it to the battlefield", () => {
  const bounds = { left: 100, top: 50, width: 1000, height: 280 };
  const direct = placementCellFromClientPoint(600, 190, bounds);
  const lifted = placementCellFromClientPoint(600, 190, bounds, TOUCH_PLACEMENT_LIFT_PX);

  assert.deepEqual(direct, { x: 50, y: 14 });
  assert.deepEqual(lifted, { x: 50, y: 8 });
  assert.equal(placementCellFromClientPoint(50, 40, bounds, TOUCH_PLACEMENT_LIFT_PX).x, 0);
  assert.equal(placementCellFromClientPoint(600, 40, bounds, TOUCH_PLACEMENT_LIFT_PX).y, 0);
});

test("each original faction has five troop lines and three strategic works", () => {
  for (const faction of Object.keys(FACTIONS) as Array<keyof typeof FACTIONS>) {
    assert.equal(factionBuildings(faction, "troop").length, 5);
    assert.equal(factionBuildings(faction, "special").length, 1);
    assert.equal(factionBuildings(faction, "economy").length, 1);
    assert.equal(factionBuildings(faction, "tower").length, 1);
  }
});

test("the five damage classes create explicit armor strengths and weaknesses", () => {
  assert.equal(DAMAGE_MATRIX.Hammer.Plate, 1.6);
  assert.equal(DAMAGE_MATRIX.Arrow.Cloth, 1.6);
  assert.equal(DAMAGE_MATRIX.Arc.Ward, 1.6);
  assert.equal(DAMAGE_MATRIX.Siege.Fortified, 1.9);
  assert.equal(DAMAGE_MATRIX.Siege.Ethereal, .5);
  assert.deepEqual(Object.values(DAMAGE_MATRIX.Pure), [1, 1, 1, 1, 1]);
});

test("placement respects faction, resources, split X/Y yards, footprints, and exits", () => {
  const initial = createInitialState("daybreak");
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 9, 4).valid, true);
  assert.match(validatePlacement(initial, "player", "briar_hollow", 9, 4).reason, /another faction/i);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 8, 4).valid, false);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 9, 12).valid, false);

  const placed = placeBuilding(initial, "player", "dawn_bastion", 9, 4);
  assert.equal(placed.buildings.length, 1);
  assert.equal(placed.resources.player.marks, initial.resources.player.marks - BUILDING_SPECS.dawn_bastion.cost.marks);
  assert.equal(placed.resources.player.timber, initial.resources.player.timber + BUILDING_SPECS.dawn_bastion.timberGain);
  assert.match(validatePlacement(placed, "player", "dawn_quillery", 10, 5).reason, /occupies/i);
});

test("touching structures can share an edge and cohorts reroute around the block", () => {
  let state = placeBuilding(createInitialState("daybreak"), "player", "dawn_bastion", 9, 4);
  const adjacent = validatePlacement(state, "player", "dawn_quillery", 12, 4);
  assert.equal(adjacent.valid, true);
  assert.ok(adjacent.path);
  state = placeBuilding(state, "player", "dawn_quillery", 12, 4);
  assert.equal(state.buildings.length, 2);
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = advance(state, 3.3);
  assert.deepEqual(new Set(state.units.filter((unit) => unit.team === "player").map((unit) => unit.kind)), new Set(["ramguard", "quillrunner"]));
});

test("normal structures grow income and Timber while economy works sacrifice cohorts for income", () => {
  const troopState = placeBuilding(createInitialState("daybreak"), "player", "dawn_bastion", 9, 4);
  assert.equal(incomeFor(troopState, "player"), 49);
  assert.equal(troopState.resources.player.timber, 90);

  let economyState = placeBuilding(createInitialState("daybreak"), "player", "dawn_tally", 9, 4);
  assert.equal(incomeFor(economyState, "player"), 69);
  const marksAfterPurchase = economyState.resources.player.marks;
  economyState = advance(economyState, 7.1);
  assert.equal(economyState.resources.player.marks, marksAfterPurchase + 69);
  assert.equal(economyState.units.filter((unit) => unit.team === "player").length, 0);
  assert.ok(canAfford(economyState.resources.player, { marks: 100, timber: 10 }));
});

test("a Foundry automatically deploys an ability-bearing cohort along the two-axis route", () => {
  let state = placeBuilding(createInitialState("daybreak"), "player", "dawn_beacon", 9, 4);
  state = advance(state, 3.2);
  const spawned = state.units.find((unit) => unit.team === "player");
  assert.ok(spawned);
  assert.equal(spawned.kind, "wispwright");
  assert.equal(UNIT_SPECS[spawned.kind].ability, "chain");
  assert.equal(spawned.path.at(-1)?.x, KEEP_POSITIONS.enemy.x);
  assert.ok(spawned.path.some((point) => point.x === WORLD_WIDTH / 2));
});

test("Veteran and Legendary upgrades scale structures and spend the scarce Sigil", () => {
  let state = createInitialState("daybreak");
  state.resources.player = { marks: 2000, timber: 1000, sigils: 1 };
  state = placeBuilding(state, "player", "dawn_bastion", 9, 4);
  const id = state.buildings[0].id;
  const baseHp = state.buildings[0].maxHp;
  state = upgradeBuilding(state, "player", id);
  assert.equal(state.buildings[0].level, 2);
  assert.ok(state.buildings[0].maxHp > baseHp);
  state = upgradeBuilding(state, "player", id);
  assert.equal(state.buildings[0].level, 3);
  assert.equal(state.resources.player.sigils, 0);
  assert.equal(state.stats.upgrades.player, 2);
});

test("Rally Sync deploys active Foundries together", () => {
  let state = createInitialState("daybreak");
  state = placeBuilding(state, "player", "dawn_bastion", 9, 4);
  state = placeBuilding(state, "player", "dawn_quillery", 13, 4);
  state = toggleSynchronization(state, "player");
  state.syncClock.player = 0;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = stepGame(state, .1);
  assert.equal(state.syncEnabled.player, true);
  assert.equal(state.units.filter((unit) => unit.team === "player").length, 2);
  assert.deepEqual(new Set(state.units.filter((unit) => unit.team === "player").map((unit) => unit.kind)), new Set(["ramguard", "quillrunner"]));
});

test("2v2 allies earn, synchronize, spawn, and spend Reprieves independently", () => {
  let state = createMultiplayerState("2v2", {
    player: "daybreak",
    player_ally: "briarcrown",
    enemy: "stormglass",
    enemy_ally: "daybreak",
  });
  state = placeBuilding(state, "player", "dawn_bastion", 9, 4);
  state = placeBuilding(state, "player_ally", "briar_hollow", 9, 16);
  const primaryMarks = state.resources.player.marks;
  const allyMarks = state.resources.player_ally.marks;
  state = toggleSynchronization(state, "player_ally");
  state.syncClock.player_ally = 0;
  state.incomeClock = 0;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = stepGame(state, .1, { runAi: false });
  assert.equal(state.syncEnabled.player, false);
  assert.equal(state.syncEnabled.player_ally, true);
  assert.equal(state.units.length, 1);
  assert.equal(state.units[0].commander, "player_ally");
  assert.equal(state.resources.player.marks, primaryMarks + 49);
  assert.equal(state.resources.player_ally.marks, allyMarks + 49);

  state.elapsed = REPRIEVE_READY_AT;
  state = castReprieve(state, "player_ally");
  assert.equal(state.reprieveUsed.player_ally, true);
  assert.equal(reprieveReady(state, "player"), true);
});

test("ground-only vanguards cannot hit air, while anti-air cohorts can", () => {
  let state = createInitialState("daybreak", "briarcrown");
  state.started = true;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state.units = [testUnit(1, "player", "ramguard", 1000), testUnit(2, "enemy", "gloomwing", 1030, 100)];
  state = stepGame(state, .2);
  assert.equal(state.units.find((unit) => unit.id === 2)?.hp, UNIT_SPECS.gloomwing.maxHp);

  state.units = [testUnit(3, "player", "quillrunner", 1000), testUnit(4, "enemy", "gloomwing", 1030, 100)];
  state = stepGame(state, .2);
  assert.ok((state.units.find((unit) => unit.id === 4)?.hp ?? 0) < UNIT_SPECS.gloomwing.maxHp);
});

test("faction special works apply recurring battlefield support", () => {
  let state = createInitialState("daybreak", "briarcrown");
  state.resources.player = { marks: 1000, timber: 1000, sigils: 1 };
  state = placeBuilding(state, "player", "dawn_aegis", 9, 4);
  state.buildings[0].abilityClock = 0;
  state.units = [testUnit(10, "player", "ramguard", 600)];
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = stepGame(state, .1);
  assert.ok((state.units[0]?.shield ?? 0) > 0);
  assert.ok(state.effects.some((effect) => effect.type === "shield"));
});

test("shop commissions support permanent tempo, defense, and legendary capacity", () => {
  let state = createInitialState("stormglass", "daybreak");
  state.resources.player = { marks: 3000, timber: 1000, sigils: 0 };
  state.keeps.player = 1500;
  state = buyShopItem(state, "player", "rally_horn");
  assert.equal(state.rallyHorn.player, true);
  state = buyShopItem(state, "player", "iron_writ");
  assert.equal(state.keeps.player, 1760);
  assert.ok(state.keepArmorUntil.player > state.elapsed);
  state = buyShopItem(state, "player", "sigil_shard");
  assert.equal(state.resources.player.sigils, 1);
  assert.equal(state.stats.itemsBought.player, 3);
});

test("the AI reads armor and opens an affordable counter from its own faction", () => {
  let state = placeBuilding(createInitialState("daybreak", "briarcrown"), "player", "dawn_bastion", 9, 4);
  state = advance(state, 4);
  const enemyTroop = state.buildings.find((building) => building.team === "enemy" && BUILDING_SPECS[building.kind].unitKind);
  assert.ok(enemyTroop);
  assert.equal(BUILDING_SPECS[enemyTroop.kind].faction, "briarcrown");
  const counter = UNIT_SPECS[BUILDING_SPECS[enemyTroop.kind].unitKind!];
  assert.equal(counter.damageType, "Arc");
});

test("Reprieve clears the caster half, wounds the far half, and remains single-use", () => {
  const initial = createInitialState("daybreak", "briarcrown");
  initial.elapsed = REPRIEVE_READY_AT;
  initial.units = [testUnit(1, "enemy", "barkmaul", 300), testUnit(2, "enemy", "barkmaul", 1920)];
  assert.equal(reprieveReady(initial, "player"), true);
  const after = castReprieve(initial, "player");
  assert.equal(after.units.length, 1);
  assert.equal(after.units[0].id, 2);
  assert.ok(after.units[0].hp < UNIT_SPECS.barkmaul.maxHp);
  assert.equal(after.reprieveUsed.player, true);
  assert.equal(castReprieve(after, "player"), after);
});

test("the bot continuously detects invasion pressure, casts Reprieve, and announces it", () => {
  let state = createInitialState("daybreak", "stormglass");
  state.started = true;
  state.elapsed = REPRIEVE_READY_AT;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state.units = [
    testUnit(20, "player", "ramguard", 1900, 100),
    testUnit(21, "player", "quillrunner", 2100, 100),
    testUnit(22, "player", "wispwright", 2300, 100),
    testUnit(23, "player", "cinder_mortar", 2500, 100),
  ];
  state = stepGame(state, .1);
  assert.equal(state.reprieveUsed.enemy, true);
  assert.equal(state.units.filter((unit) => unit.team === "player").length, 0);
  assert.match(state.event, /Stormglass Collegium invoked Reprieve/i);
  assert.ok(state.effects.some((effect) => effect.type === "reprieve" && effect.team === "enemy"));
});

test("round victories persist into a first-to-two match", () => {
  let state = createInitialState("stormglass", "daybreak");
  state.started = true;
  state.keeps.enemy = 0;
  state = stepGame(state, .1);
  assert.equal(state.status, "round_won");
  assert.equal(state.roundWins.player, 1);
  state = startNextRound(state);
  assert.equal(state.status, "playing");
  assert.equal(state.round, 2);
  assert.equal(state.buildings.length, 0);
  state.started = true;
  state.keeps.enemy = 0;
  state = stepGame(state, .1);
  assert.equal(state.status, "won");
  assert.equal(state.roundWins.player, 2);
});

test("time-limit ties use the documented tie-break chain and always close", () => {
  let state = createInitialState("daybreak", "stormglass");
  state.started = true;
  state.elapsed = MATCH_LIMIT - .1;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = stepGame(state, .2);
  assert.notEqual(state.status, "playing");
  assert.equal(state.status, "round_won");
});

test("the battlefield remains a sharp double-width one-hundred-column world", () => {
  assert.equal(WORLD_WIDTH, 3200);
  assert.equal(GRID_COLUMNS, 100);
  assert.ok(KEEP_POSITIONS.enemy.x - KEEP_POSITIONS.player.x > 2800);
});

test("unit rendering fills the gaps between simulation snapshots", () => {
  const initial = stationaryUnitMotion({ x: 100, y: 200 }, 0);
  const moving = retargetUnitMotion(initial, { x: 200, y: 260 }, 0, 100);
  assert.deepEqual(sampleUnitMotion(moving, 50), { x: 150, y: 230 });
  assert.deepEqual(sampleUnitMotion(moving, 100), { x: 200, y: 260 });
});

test("unit rendering retargets from its visible position without a jump", () => {
  const first = retargetUnitMotion(stationaryUnitMotion({ x: 0, y: 0 }, 0), { x: 100, y: 0 }, 0, 100);
  const second = retargetUnitMotion(first, { x: 200, y: 0 }, 50, motionDurationForSnapshots(1, 1.15));
  assert.deepEqual(sampleUnitMotion(second, 50), { x: 50, y: 0 });
  assert.ok(Math.abs(sampleUnitMotion(second, 125).x - 125) < .0001);
});
