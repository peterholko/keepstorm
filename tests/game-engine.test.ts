import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_INCOME,
  BUILD_AREAS,
  BUILDING_CAP,
  BUILDING_SPECS,
  DAMAGE_MATRIX,
  ECONOMY_BUILDING_CAP,
  FACTIONS,
  FACTION_IDS,
  GRID_COLUMNS,
  GRID_ROWS,
  INCOME_INTERVAL,
  KEEP_MAX_HP,
  KEEP_POSITIONS,
  MATCH_LIMIT,
  REPRIEVE_READY_AT,
  STARTING_RESOURCES,
  TIMBER_RETURN_LIMIT,
  UNIT_SPECS,
  WORLD_WIDTH,
  buildingBountyFor,
  buildingIncomeFor,
  buildingIncomeRate,
  buyShopItem,
  canAfford,
  castReprieve,
  costForUpgrade,
  createInitialState,
  createMultiplayerState,
  economyMultiplier,
  factionBuildings,
  incomeAfterProgressiveTax,
  incomeBreakdownForCommander,
  incomeFor,
  keepWardenForCommander,
  moveKeepWarden,
  placeBuilding,
  reprieveReady,
  startNextRound,
  stepGame,
  timberReturnFor,
  toggleSynchronization,
  unitBountyFor,
  upgradeBuilding,
  validateKeepWardenDestination,
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
import {
  cellRectPercent,
  gridRectPercent,
  placementCellFromClientPoint,
  shouldCancelPlacementFromContextMenu,
  TOUCH_PLACEMENT_LIFT_PX,
  unitIdAtWorldPoint,
  worldPointFromClientPoint,
  yardFrame,
  yardZoomFactor,
} from "../lib/keepstorm/placement-input.ts";
import {
  IOS_INSTALL_PROMPT_DISMISSAL_MS,
  shouldShowIOSInstallPrompt,
} from "../lib/keepstorm/install-prompt.ts";
import { assetLoadingPercent, atlasCellSizeForHeight, magentaBackdropAlpha } from "../app/atlas-assets.ts";

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

function placeFirstLegalPlayerBuilding(state: GameState, kind: keyof typeof BUILDING_SPECS): GameState {
  const spec = BUILDING_SPECS[kind];
  for (const area of BUILD_AREAS.player) {
    for (let x = area.maxX - spec.width + 1; x >= area.minX; x -= 1) {
      for (let y = area.minY; y <= area.maxY - spec.height + 1; y += 1) {
        if (validatePlacement(state, "player", kind, x, y).valid) return placeBuilding(state, "player", kind, x, y);
      }
    }
  }
  return state;
}

test("the Home Screen reminder targets iOS Safari outside standalone mode", () => {
  const now = 1_800_000_000_000;
  const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1";
  const iphoneChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1";
  const ipadDesktopSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";

  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneSafari, now }), true);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneSafari, displayModeStandalone: true, now }), false);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneSafari, navigatorStandalone: true, now }), false);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneChrome, now }), false);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: ipadDesktopSafari, platform: "MacIntel", maxTouchPoints: 5, now }), true);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: ipadDesktopSafari, platform: "MacIntel", maxTouchPoints: 0, now }), false);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneSafari, dismissedAt: now - IOS_INSTALL_PROMPT_DISMISSAL_MS + 1, now }), false);
  assert.equal(shouldShowIOSInstallPrompt({ userAgent: iphoneSafari, dismissedAt: now - IOS_INSTALL_PROMPT_DISMISSAL_MS, now }), true);
});

test("touch placement lifts the preview above the finger and clamps it to the battlefield", () => {
  const bounds = { left: 100, top: 50, width: 1000, height: 280 };
  const direct = placementCellFromClientPoint(600, 190, bounds);
  const lifted = placementCellFromClientPoint(600, 190, bounds, TOUCH_PLACEMENT_LIFT_PX);

  assert.deepEqual(direct, { x: 50, y: 14 });
  assert.deepEqual(lifted, { x: 50, y: 8 });
  assert.equal(placementCellFromClientPoint(50, 40, bounds, TOUCH_PLACEMENT_LIFT_PX).x, 0);
  assert.equal(placementCellFromClientPoint(600, 40, bounds, TOUCH_PLACEMENT_LIFT_PX).y, 0);
});

test("battlefield inspection maps pointer positions and selects the nearest cohort", () => {
  const bounds = { left: 100, top: 50, width: 1000, height: 280 };
  assert.deepEqual(worldPointFromClientPoint(600, 190, bounds), { x: 1600, y: 448 });
  assert.equal(unitIdAtWorldPoint([
    { id: 11, x: 1560, y: 448 },
    { id: 12, x: 1610, y: 448 },
  ], { x: 1600, y: 448 }, 48), 12);
  assert.equal(unitIdAtWorldPoint([{ id: 11, x: 1560, y: 448 }], { x: 1600, y: 448 }, 30), null);
});

test("Keep Wardens are personal defenders confined to each commander's base yard", () => {
  const duel = createInitialState("daybreak", "stormglass");
  assert.equal(duel.activeCommanders.length, 2);
  assert.equal("hp" in keepWardenForCommander(duel, "player"), false);
  assert.equal("respawnClock" in keepWardenForCommander(duel, "player"), false);
  duel.keepWardens.player = {
    ...duel.keepWardens.player,
    hp: 1,
    maxHp: 360,
    respawnClock: 18,
  } as typeof duel.keepWardens.player;
  assert.equal("hp" in keepWardenForCommander(duel, "player"), false);
  assert.equal("respawnClock" in keepWardenForCommander(duel, "player"), false);
  assert.equal(validateKeepWardenDestination(duel, "player", 400, 200).valid, true);
  assert.equal(validateKeepWardenDestination(duel, "player", WORLD_WIDTH / 2, 448).valid, false);

  const moved = moveKeepWarden(duel, "player", 400, 200);
  assert.deepEqual(
    { x: keepWardenForCommander(moved, "player").targetX, y: keepWardenForCommander(moved, "player").targetY },
    { x: 400, y: 200 },
  );
  const escaped = moveKeepWarden(moved, "player", WORLD_WIDTH / 2, 448);
  assert.deepEqual(
    { x: keepWardenForCommander(escaped, "player").targetX, y: keepWardenForCommander(escaped, "player").targetY },
    { x: 400, y: 200 },
  );

  const teams = createMultiplayerState("2v2", {});
  assert.equal(validateKeepWardenDestination(teams, "player", 400, 624).valid, false);
  assert.equal(validateKeepWardenDestination(teams, "player_ally", 400, 624).valid, true);
});

test("Keep Wardens move and fire while enemy cohorts ignore them and continue toward the Keep", () => {
  let state = createInitialState("daybreak", "stormglass");
  state = { ...state, started: true };
  state = moveKeepWarden(state, "player", 400, 200);
  const moving = stepGame(state, .1, { runAi: false });
  assert.ok(keepWardenForCommander(moving, "player").x > keepWardenForCommander(state, "player").x);

  for (let elapsed = .1; elapsed < 3; elapsed += .1) state = stepGame(state, .1, { runAi: false });
  const warden = keepWardenForCommander(state, "player");
  const invader = {
    ...testUnit(9001, "enemy", "glassbolt", warden.x + 100, 10),
    y: warden.y,
    path: [KEEP_POSITIONS.player],
  };
  const defended = stepGame({ ...state, units: [invader] }, .1, { runAi: false });
  assert.ok(defended.units[0].hp < invader.hp);
  assert.ok(keepWardenForCommander(defended, "player").cooldown > 0);
  assert.ok(defended.units[0].x < invader.x);
  assert.ok(defended.units[0].y > invader.y);
  assert.equal(defended.units[0].attackFlash, 0);
});

test("placement rectangles map cells and yards to battlefield percentages", () => {
  assert.deepEqual(cellRectPercent({ x: 10, y: 7 }, { width: 4, height: 3 }), {
    left: 10,
    top: 25,
    width: 4,
    height: 3 / 28 * 100,
  });
  assert.deepEqual(gridRectPercent({ minX: 9, maxX: 19, minY: 3, maxY: 10 }), {
    left: 9,
    top: 3 / 28 * 100,
    width: 11,
    height: 8 / 28 * 100,
  });
});

test("context menus cancel mouse placement but never an active touch placement", () => {
  assert.equal(shouldCancelPlacementFromContextMenu("mouse"), true);
  assert.equal(shouldCancelPlacementFromContextMenu("mouse", true), false);
  assert.equal(shouldCancelPlacementFromContextMenu("touch"), false);
  assert.equal(shouldCancelPlacementFromContextMenu(undefined), false);
});

test("yard zoom keeps phone cells legible and frames the upper or nearest build area", () => {
  const areas = [
    { minX: 9, maxX: 19, minY: 3, maxY: 10 },
    { minX: 9, maxX: 19, minY: 15, maxY: 22 },
  ];
  const zoom812 = yardZoomFactor(704, 375);
  const zoom640 = yardZoomFactor(532, 360);
  const cell812 = 375 / GRID_ROWS * zoom812;
  const cell640 = 360 / GRID_ROWS * zoom640;

  assert.ok(cell812 >= 20 && cell812 <= 28);
  assert.ok(cell640 >= 20 && cell640 <= 28);
  assert.ok(13 * cell812 <= 704);
  assert.ok(13 * cell640 <= 532);
  assert.deepEqual(yardFrame(areas), { x: 464, y: 224 });
  assert.deepEqual(yardFrame(areas, { x: 460, y: 650 }), { x: 464, y: 608 });
  assert.equal(yardFrame([]), null);
});

test("each original faction has five troop lines and three strategic works", () => {
  for (const faction of Object.keys(FACTIONS) as Array<keyof typeof FACTIONS>) {
    assert.equal(factionBuildings(faction, "troop").length, 5);
    assert.equal(factionBuildings(faction, "special").length, 1);
    assert.equal(factionBuildings(faction, "economy").length, 1);
    assert.equal(factionBuildings(faction, "tower").length, 1);
  }
});

test("each faction exposes a distinct generated selection emblem", () => {
  const emblems = Object.values(FACTIONS).map((faction) => faction.emblem);
  assert.equal(new Set(emblems).size, emblems.length);
  for (const emblem of emblems) assert.match(emblem, /^\/game\/factions\/[a-z-]+-emblem-v1\.png$/);
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
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 8, 3).valid, true);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 18, 9).valid, true);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 8, 21).valid, true);
  assert.match(validatePlacement(initial, "player", "briar_hollow", 8, 3).reason, /another faction/i);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 7, 3).valid, false);
  assert.equal(validatePlacement(initial, "player", "dawn_bastion", 8, 12).valid, false);

  const placed = placeBuilding(initial, "player", "dawn_bastion", 8, 3);
  assert.equal(placed.buildings.length, 1);
  assert.equal(placed.resources.player.marks, initial.resources.player.marks - BUILDING_SPECS.dawn_bastion.cost.marks);
  assert.equal(placed.resources.player.timber, initial.resources.player.timber + BUILDING_SPECS.dawn_bastion.cost.marks);
  assert.match(validatePlacement(placed, "player", "dawn_quillery", 9, 4).reason, /occupies/i);
});

test("construction yards provide two art-aligned thirteen-by-nine grids and a thirty-structure ceiling", () => {
  assert.equal(BUILDING_CAP, 30);
  assert.deepEqual(BUILD_AREAS.player, [
    { minX: 8, maxX: 20, minY: 3, maxY: 11 },
    { minX: 8, maxX: 20, minY: 15, maxY: 23 },
  ]);
  assert.deepEqual(BUILD_AREAS.enemy, [
    { minX: 79, maxX: 91, minY: 3, maxY: 11 },
    { minX: 79, maxX: 91, minY: 15, maxY: 23 },
  ]);
});

test("touching structures can share an edge and cohorts reroute around the block", () => {
  let state = placeBuilding(createInitialState("daybreak"), "player", "dawn_bastion", 8, 3);
  const adjacent = validatePlacement(state, "player", "dawn_quillery", 11, 3);
  assert.equal(adjacent.valid, true);
  assert.ok(adjacent.path);
  state = placeBuilding(state, "player", "dawn_quillery", 11, 3);
  assert.equal(state.buildings.length, 2);
  state.buildings = state.buildings.map((building) => ({ ...building, spawnClock: 0 }));
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state = stepGame(state, .1, { runAi: false });
  assert.deepEqual(new Set(state.units.filter((unit) => unit.team === "player").map((unit) => unit.kind)), new Set(["ramguard", "quillrunner"]));
});

test("standard economy uses ten-second income, progressive tax, lumber returns, and diminishing treasuries", () => {
  const initial = createInitialState("daybreak");
  assert.deepEqual(initial.resources.player, STARTING_RESOURCES);
  assert.deepEqual(STARTING_RESOURCES, { marks: 400, timber: 125, sigils: 1 });
  assert.equal(initial.incomeClock, INCOME_INTERVAL);
  assert.equal(INCOME_INTERVAL, 10);
  assert.equal(BASE_INCOME, 5);
  assert.equal(incomeFor(initial, "player"), 5);

  let troopState = placeBuilding(initial, "player", "dawn_bastion", 8, 3);
  const troopIncome = incomeBreakdownForCommander(troopState, "player");
  assert.equal(buildingIncomeFor(troopState.buildings[0]), 2.2);
  assert.equal(troopIncome.gross, 7.2);
  assert.equal(troopIncome.paid, 7);
  assert.equal(troopState.resources.player.timber, 235);
  const marksAfterPurchase = troopState.resources.player.marks;
  troopState.incomeClock = 0;
  troopState = stepGame(troopState, .1, { runAi: false });
  assert.equal(troopState.resources.player.marks, marksAfterPurchase + 7);

  let economyState = createInitialState("daybreak");
  economyState.resources.player = { marks: 2000, timber: 2000, sigils: 1 };
  economyState = placeBuilding(economyState, "player", "dawn_tally", 8, 3);
  let economyIncome = incomeBreakdownForCommander(economyState, "player");
  assert.equal(costForUpgrade(economyState.buildings[0]), null);
  assert.equal(economyMultiplier(1), 1.25);
  assert.equal(economyIncome.gross, 11.5);
  assert.equal(economyIncome.paid, 12);
  economyState = placeBuilding(economyState, "player", "dawn_tally", 10, 3);
  economyIncome = incomeBreakdownForCommander(economyState, "player");
  assert.equal(economyMultiplier(2), 1.4625);
  assert.ok(Math.abs(economyIncome.gross - 19.5975) < 1e-9);
  assert.equal(economyIncome.paid, 20);
  assert.equal(economyState.units.filter((unit) => unit.team === "player").length, 0);
});

test("opening Marks fund three entry troop structures but not four", () => {
  for (const faction of Object.keys(FACTIONS) as Array<keyof typeof FACTIONS>) {
    const troopCosts = factionBuildings(faction, "troop")
      .map((kind) => BUILDING_SPECS[kind].cost.marks ?? 0)
      .sort((left, right) => left - right);
    const threeTroops = troopCosts.slice(0, 3).reduce((total, cost) => total + cost, 0);
    const fourTroops = troopCosts.slice(0, 4).reduce((total, cost) => total + cost, 0);

    assert.ok(threeTroops <= STARTING_RESOURCES.marks, `${faction} cannot afford three opening troop structures`);
    assert.ok(fourTroops > STARTING_RESOURCES.marks, `${faction} can afford four opening troop structures`);
  }
});

test("income tax follows eight 25-Mark brackets and caps at eighty percent", () => {
  assert.equal(incomeAfterProgressiveTax(24), 24);
  assert.equal(incomeAfterProgressiveTax(25), 25);
  assert.equal(incomeAfterProgressiveTax(50), 47.5);
  assert.equal(incomeAfterProgressiveTax(100), 85);
  assert.equal(incomeAfterProgressiveTax(200), 130);
  assert.equal(incomeAfterProgressiveTax(225), 135);
});

test("a commander can operate at most five diminishing-return treasury structures", () => {
  let state = createInitialState("daybreak");
  state.resources.player = { marks: 10_000, timber: 10_000, sigils: 1 };
  for (let index = 0; index < ECONOMY_BUILDING_CAP; index += 1) {
    state = placeBuilding(state, "player", "dawn_tally", 8 + index * 2, 3);
  }
  assert.equal(state.buildings.length, 5);
  assert.match(validatePlacement(state, "player", "dawn_tally", 18, 3).reason, /five-structure limit/i);
});

test("unit works return category-accurate Timber and combat bounties scale from investment", () => {
  assert.equal(timberReturnFor("dawn_bastion", { marks: 110 }, 1), 110);
  assert.equal(timberReturnFor("dawn_bombard", { marks: 205 }, 1), 154);
  assert.equal(timberReturnFor("dawn_bastion", { marks: 280 }, 3), 70);
  assert.equal(timberReturnFor("dawn_aegis", { marks: 190, timber: 95 }, 1), 0);
  assert.equal(timberReturnFor("dawn_bastion", { marks: 400 }, 2), TIMBER_RETURN_LIMIT);
  assert.equal(unitBountyFor("ramguard", 1), 4);
  assert.equal(unitBountyFor("ramguard", 2), 9);
  assert.equal(unitBountyFor("ramguard", 3), 19);
  assert.equal(buildingBountyFor({ kind: "dawn_bastion", level: 1 }), 22);
  assert.equal(buildingBountyFor({ kind: "dawn_bastion", level: 3 }), 108);
});

test("every faction uses the same economy categories and treasury price", () => {
  for (const [kind, spec] of Object.entries(BUILDING_SPECS)) {
    if (spec.category === "troop") {
      assert.equal(spec.cost.timber, undefined);
      assert.equal(spec.upgradeCost.timber, undefined);
      assert.equal(buildingIncomeRate(kind as keyof typeof BUILDING_SPECS), spec.unitKind && UNIT_SPECS[spec.unitKind].role === "siege" ? 0.018 : 0.02);
    }
    if (spec.category === "economy") assert.deepEqual(spec.cost, { marks: 350, timber: 500 });
  }
  assert.equal(buildingIncomeRate("dawn_aegis"), 0.012);
  assert.equal(buildingIncomeRate("storm_static_spire"), 0.009);
  assert.equal(buildingIncomeRate("dawn_sunlance"), 0.008);
});

test("a Foundry automatically deploys an ability-bearing cohort along the two-axis route", () => {
  let state = placeBuilding(createInitialState("daybreak"), "player", "dawn_beacon", 8, 3);
  state.buildings[0].spawnClock = 0;
  state = stepGame(state, .1, { runAi: false });
  const spawned = state.units.find((unit) => unit.team === "player");
  assert.ok(spawned);
  assert.equal(spawned.kind, "wispwright");
  assert.equal(UNIT_SPECS[spawned.kind].ability, "chain");
  assert.equal(spawned.path.at(-1)?.x, KEEP_POSITIONS.enemy.x);
  assert.ok(spawned.path.some((point) => point.x === WORLD_WIDTH / 2));
});

test("cohorts rejoin the nearest forward route segment instead of returning to a stale waypoint", () => {
  const cases = [
    {
      team: "player" as const,
      startX: 550,
      path: [{ x: 300, y: 448 }, { x: 400, y: 448 }, { x: 600, y: 448 }, { x: 800, y: 448 }, { x: 1000, y: 448 }],
      advances: (before: number, after: number) => after > before,
    },
    {
      team: "enemy" as const,
      startX: 650,
      path: [{ x: 1000, y: 448 }, { x: 800, y: 448 }, { x: 600, y: 448 }, { x: 400, y: 448 }, { x: 200, y: 448 }],
      advances: (before: number, after: number) => after < before,
    },
  ];

  for (const scenario of cases) {
    const unit = { ...testUnit(7000, scenario.team, "quillrunner", scenario.startX), path: scenario.path, pathIndex: 1 };
    const state: GameState = { ...createInitialState(), started: true, units: [unit] };
    const advanced = stepGame(state, .1, { runAi: false });
    assert.ok(scenario.advances(unit.x, advanced.units[0].x));
    assert.ok(advanced.units[0].pathIndex >= 2);
  }

  const exhaustedUnit = {
    ...testUnit(7001, "player", "quillrunner", 2400),
    path: [{ x: 2448, y: 448 }, { x: KEEP_POSITIONS.enemy.x, y: KEEP_POSITIONS.enemy.y }],
    pathIndex: 2,
  };
  const exhaustedState: GameState = { ...createInitialState(), started: true, units: [exhaustedUnit] };
  const returningToKeep = stepGame(exhaustedState, .1, { runAi: false });
  assert.ok(returningToKeep.units[0].x > exhaustedUnit.x);
  assert.equal(returningToKeep.units[0].pathIndex, 1);
});

test("Veteran and Legendary upgrades scale structures and spend the scarce Sigil", () => {
  let state = createInitialState("daybreak");
  state.resources.player = { marks: 2000, timber: 1000, sigils: 1 };
  state = placeBuilding(state, "player", "dawn_bastion", 9, 4);
  const id = state.buildings[0].id;
  const baseHp = state.buildings[0].maxHp;
  assert.equal(state.resources.player.timber, 1110);
  state = upgradeBuilding(state, "player", id);
  assert.equal(state.buildings[0].level, 2);
  assert.ok(state.buildings[0].maxHp > baseHp);
  assert.equal(state.resources.player.timber, 1260);
  state = upgradeBuilding(state, "player", id);
  assert.equal(state.buildings[0].level, 3);
  assert.equal(state.resources.player.timber, 1220);
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
  assert.equal(state.resources.player.marks, primaryMarks + 7);
  assert.equal(state.resources.player_ally.marks, allyMarks + 7);

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
  state.resources.enemy = { marks: 1_000, timber: 1_000, sigils: 1 };
  state = advance(state, 4);
  const enemyTroops = state.buildings.filter((building) => building.team === "enemy" && BUILDING_SPECS[building.kind].unitKind);
  assert.ok(enemyTroops.length >= 3);
  assert.ok(enemyTroops.every((building) => BUILDING_SPECS[building.kind].faction === "briarcrown"));
  assert.ok(enemyTroops.some((building) => UNIT_SPECS[BUILDING_SPECS[building.kind].unitKind!].damageType === "Arc"));
  assert.ok(enemyTroops.some((building) => UNIT_SPECS[BUILDING_SPECS[building.kind].unitKind!].flying));
});

test("the AI spends its opening resources promptly and can place a legal build burst", () => {
  let state = placeBuilding(createInitialState("daybreak", "briarcrown"), "player", "dawn_bastion", 9, 4);
  state = advance(state, 1);
  const enemyBuildings = state.buildings.filter((building) => building.team === "enemy");
  assert.equal(enemyBuildings.length, 3);
  assert.equal(state.stats.buildingsPlaced.enemy, 3);
  assert.ok(enemyBuildings.every((building) => BUILDING_SPECS[building.kind].faction === "briarcrown"));
  assert.ok(enemyBuildings.every((building) => building.gridX === BUILD_AREAS.enemy[0].minX));
  assert.equal(new Set(enemyBuildings.map((building) => building.gridY < GRID_ROWS / 2)).size, 2);
});

test("the AI reserves for support and upgrades once its production line is competitive", () => {
  let state = createInitialState("daybreak", "briarcrown");
  state.resources.enemy = { marks: 10_000, timber: 10_000, sigils: 1 };
  state = placeBuilding(state, "enemy", "briar_hollow", 79, 3);
  state = placeBuilding(state, "enemy", "briar_mothery", 82, 3);
  state = placeBuilding(state, "enemy", "briar_hollow", 85, 3);
  state = placeBuilding(state, "enemy", "briar_sporecourt", 79, 15);
  state = placeBuilding(state, "enemy", "briar_mirepool", 82, 15);
  assert.equal(state.buildings.length, 5);

  state.resources.enemy = { marks: 188, timber: 1_000, sigils: 1 };
  state.aiClock = 0;
  state = stepGame(state, .1);
  assert.equal(state.buildings.filter((building) => building.team === "enemy" && building.kind === "briar_heartgrove").length, 1);

  state.resources.enemy = { marks: 150, timber: 1_000, sigils: 1 };
  state.aiClock = 0;
  state = stepGame(state, .1);
  assert.equal(state.stats.upgrades.enemy, 1);
  assert.ok(state.buildings.some((building) => building.team === "enemy" && building.level === 2));
});

test("the AI commissions an Ember Flask against early pressure instead of waiting for Reprieve", () => {
  let state = createInitialState("daybreak", "stormglass");
  state.started = true;
  state.elapsed = 50;
  state.aiClock = 0;
  state.keepDefenseClock = 100;
  state.resources.enemy = { marks: 165, timber: 45, sigils: 1 };
  state.units = [
    testUnit(40, "player", "ramguard", 2_500, 100),
    testUnit(41, "player", "ramguard", 2_550, 100),
    testUnit(42, "player", "ramguard", 2_600, 100),
  ];

  state = stepGame(state, .1);
  assert.equal(state.stats.itemsBought.enemy, 1);
  assert.equal(state.resources.enemy.marks, 0);
  assert.equal(state.reprieveUsed.enemy, false);
  assert.ok(state.units.every((unit) => unit.hp <= UNIT_SPECS.ramguard.maxHp - 150));
});

test("the adaptive AI defeats a one-note ground-production strategy without bonus resources", () => {
  let state = createInitialState("daybreak", "briarcrown");
  for (let tick = 0; tick < 3_000 && state.status === "playing"; tick += 1) {
    if (tick % 18 === 0) {
      const affordable = factionBuildings("daybreak", "troop")
        .filter((kind) => canAfford(state.resources.player, BUILDING_SPECS[kind].cost))
        .sort((left, right) => BUILDING_SPECS[left].cost.marks - BUILDING_SPECS[right].cost.marks);
      if (affordable[0]) state = placeFirstLegalPlayerBuilding(state, affordable[0]);
      const invaders = state.units.filter((unit) => unit.team === "enemy" && unit.x < WORLD_WIDTH / 2);
      if (invaders.length >= 3 && reprieveReady(state, "player")) state = castReprieve(state, "player");
    }
    state = stepGame(state, .1);
  }

  assert.equal(state.status, "round_lost");
  assert.equal(state.roundWins.enemy, 1);
  assert.equal(state.keeps.enemy, KEEP_MAX_HP);
  assert.ok(state.stats.buildingsPlaced.enemy >= state.stats.buildingsPlaced.player);
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

test("the bot uses Reprieve before a three-unit invasion reaches the Keep", () => {
  let state = createInitialState("daybreak", "stormglass");
  state.started = true;
  state.elapsed = REPRIEVE_READY_AT;
  state.aiClock = 100;
  state.keepDefenseClock = 100;
  state.units = [
    testUnit(30, "player", "ramguard", 1700, 100),
    testUnit(31, "player", "quillrunner", 1800, 100),
    testUnit(32, "player", "wispwright", 1900, 100),
  ];
  state = stepGame(state, .1);
  assert.equal(state.reprieveUsed.enemy, true);
  assert.equal(state.units.filter((unit) => unit.team === "player").length, 0);
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
  assert.deepEqual(state.resources.player, STARTING_RESOURCES);
  assert.deepEqual(state.resources.enemy, STARTING_RESOURCES);
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

test("map sprites derive width from the atlas cell ratio without changing height", () => {
  assert.deepEqual(atlasCellSizeForHeight({ width: 1254, height: 1254 }, 140, 4, 4), { width: 140, height: 140 });
  assert.deepEqual(atlasCellSizeForHeight({ width: 1254, height: 1254 }, 78, 4, 4), { width: 78, height: 78 });
  assert.deepEqual(atlasCellSizeForHeight({ width: 1536, height: 1024 }, 270, 2, 4), { width: 202.5, height: 270 });
});

test("each faction renders its own keep artwork", () => {
  const keepSources = FACTION_IDS.map((faction) => FACTIONS[faction].keep.src);
  assert.deepEqual(keepSources, [
    "/game/daybreak-atlas-magenta-v1.png",
    "/game/factions/briarcrown-keep-v1.png",
    "/game/factions/stormglass-keep-v1.png",
  ]);
  assert.equal(new Set(keepSources).size, FACTION_IDS.length);
  assert.ok(keepSources.every((source) => !source.includes("nightveil")));
});

test("battlefield loading progress is bounded and reaches completion", () => {
  assert.equal(assetLoadingPercent(0, 7), 0);
  assert.equal(assetLoadingPercent(3, 7), 43);
  assert.equal(assetLoadingPercent(7, 7), 100);
  assert.equal(assetLoadingPercent(8, 7), 100);
  assert.equal(assetLoadingPercent(-1, 7), 0);
});

test("atlas processing removes generated magenta while preserving sprite colors", () => {
  assert.equal(magentaBackdropAlpha(240, 9, 232), 0);
  assert.equal(magentaBackdropAlpha(222, 38, 210), 0);
  assert.equal(magentaBackdropAlpha(230, 45, 30), 255);
  assert.equal(magentaBackdropAlpha(50, 230, 220), 255);
  assert.equal(magentaBackdropAlpha(245, 230, 180), 255);
  assert.equal(magentaBackdropAlpha(120, 35, 150), 255);
  assert.ok(magentaBackdropAlpha(190, 50, 180) > 0);
  assert.ok(magentaBackdropAlpha(190, 50, 180) < 255);
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
