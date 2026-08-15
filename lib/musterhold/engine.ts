import {
  BUILDING_SPECS,
  DAMAGE_MATRIX,
  FACTIONS,
  FACTION_IDS,
  SHOP_ITEMS,
  UNIT_SPECS,
  type ArmorType,
  type BuildingCategory,
  type BuildingKind,
  type DamageType,
  type FactionId,
  type ResourceCost,
  type ShopItemKind,
  type UnitKind,
} from "./content.ts";

export {
  BUILDING_SPECS,
  DAMAGE_MATRIX,
  FACTIONS,
  FACTION_IDS,
  SHOP_ITEMS,
  SHOP_ITEM_KINDS,
  UNIT_SPECS,
} from "./content.ts";
export type {
  ArmorType,
  BuildingCategory,
  BuildingKind,
  DamageType,
  FactionId,
  ResourceCost,
  ShopItemKind,
  UnitKind,
} from "./content";

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 896;
export const CELL_SIZE = 32;
export const GRID_COLUMNS = 100;
export const GRID_ROWS = 28;
export const KEEP_MAX_HP = 2400;
export const MATCH_LIMIT = 360;
export const REPRIEVE_READY_AT = 75;
export const BUILDING_CAP = 16;
export const UNIT_CAP = 160;
export const INCOME_INTERVAL = 7;
export const ROUNDS_TO_WIN = 2;

export type Team = "player" | "enemy";
export type MatchStatus = "playing" | "round_won" | "round_lost" | "won" | "lost";

export interface Point { x: number; y: number }
export interface GridPoint { x: number; y: number }
export interface GridRect { minX: number; maxX: number; minY: number; maxY: number }

export interface ResourceStock {
  marks: number;
  timber: number;
  sigils: number;
}

export interface Building {
  id: number;
  team: Team;
  kind: BuildingKind;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  level: 1 | 2 | 3;
  spawnClock: number;
  abilityClock: number;
  productionPaused: boolean;
  totalSpawned: number;
  lastDamagedBy?: Team;
}

export interface Unit {
  id: number;
  team: Team;
  kind: UnitKind;
  level: 1 | 2 | 3;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  cooldown: number;
  attackFlash: number;
  path: Point[];
  pathIndex: number;
  poisonTimer: number;
  poisonDps: number;
  poisonTeam?: Team;
  slowTimer: number;
  stunTimer: number;
  lastDamagedBy?: Team;
}

export type EffectType = "hit" | "spawn" | "destroy" | "reprieve" | "yield" | "shield" | "heal" | "pulse" | "upgrade" | "item";

export interface Effect {
  id: number;
  type: EffectType;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  life: number;
  team?: Team;
  label?: string;
}

export interface MatchStats {
  buildingsPlaced: Record<Team, number>;
  buildingsLost: Record<Team, number>;
  unitsSpawned: Record<Team, number>;
  unitsLost: Record<Team, number>;
  keepDamage: Record<Team, number>;
  upgrades: Record<Team, number>;
  itemsBought: Record<Team, number>;
  bountyEarned: Record<Team, number>;
}

export interface GameState {
  status: MatchStatus;
  started: boolean;
  elapsed: number;
  totalElapsed: number;
  round: number;
  roundWins: Record<Team, number>;
  factions: Record<Team, FactionId>;
  resources: Record<Team, ResourceStock>;
  keeps: Record<Team, number>;
  buildings: Building[];
  units: Unit[];
  effects: Effect[];
  incomeClock: number;
  aiClock: number;
  keepDefenseClock: number;
  syncEnabled: Record<Team, boolean>;
  syncClock: Record<Team, number>;
  reprieveUsed: Record<Team, boolean>;
  rallyHorn: Record<Team, boolean>;
  keepArmorUntil: Record<Team, number>;
  nextId: number;
  event: string;
  eventSerial: number;
  stats: MatchStats;
}

export interface PlacementValidation {
  valid: boolean;
  reason: string;
  path?: GridPoint[];
}

export interface StepGameOptions {
  runAi?: boolean;
}

export const BUILD_AREAS: Record<Team, readonly GridRect[]> = {
  player: [
    { minX: 9, maxX: 19, minY: 4, maxY: 11 },
    { minX: 9, maxX: 19, minY: 16, maxY: 23 },
  ],
  enemy: [
    { minX: 80, maxX: 90, minY: 4, maxY: 11 },
    { minX: 80, maxX: 90, minY: 16, maxY: 23 },
  ],
};

export const BUILD_ZONES: Record<Team, GridRect> = {
  player: { minX: 9, maxX: 19, minY: 4, maxY: 23 },
  enemy: { minX: 80, maxX: 90, minY: 4, maxY: 23 },
};

const NAV_ZONES: Record<Team, GridRect> = {
  player: { minX: 3, maxX: 23, minY: 2, maxY: 25 },
  enemy: { minX: 76, maxX: 96, minY: 2, maxY: 25 },
};

export const GATE_CELLS: Record<Team, GridPoint> = {
  player: { x: 23, y: 13 },
  enemy: { x: 76, y: 13 },
};

export const KEEP_POSITIONS: Record<Team, Point> = {
  player: { x: 128, y: 448 },
  enemy: { x: 3072, y: 448 },
};

const LANE_PATH: Point[] = [
  { x: 752, y: 448 },
  { x: 900, y: 463 },
  { x: 1080, y: 400 },
  { x: 1260, y: 439 },
  { x: 1430, y: 463 },
  { x: 1600, y: 448 },
  { x: 1770, y: 463 },
  { x: 1940, y: 439 },
  { x: 2120, y: 400 },
  { x: 2300, y: 463 },
  { x: 2448, y: 448 },
];

const STARTING_RESOURCES: ResourceStock = { marks: 520, timber: 70, sigils: 1 };
const RESOURCE_KEYS: Array<keyof ResourceStock> = ["marks", "timber", "sigils"];

function enemyOf(team: Team): Team {
  return team === "player" ? "enemy" : "player";
}

function emptyStats(): MatchStats {
  return {
    buildingsPlaced: { player: 0, enemy: 0 },
    buildingsLost: { player: 0, enemy: 0 },
    unitsSpawned: { player: 0, enemy: 0 },
    unitsLost: { player: 0, enemy: 0 },
    keepDamage: { player: 0, enemy: 0 },
    upgrades: { player: 0, enemy: 0 },
    itemsBought: { player: 0, enemy: 0 },
    bountyEarned: { player: 0, enemy: 0 },
  };
}

function chooseEnemyFaction(playerFaction: FactionId): FactionId {
  const index = FACTION_IDS.indexOf(playerFaction);
  return FACTION_IDS[(index + 1) % FACTION_IDS.length];
}

export function createInitialState(playerFaction: FactionId = "daybreak", enemyFaction: FactionId = chooseEnemyFaction(playerFaction)): GameState {
  return {
    status: "playing",
    started: false,
    elapsed: 0,
    totalElapsed: 0,
    round: 1,
    roundWins: { player: 0, enemy: 0 },
    factions: { player: playerFaction, enemy: enemyFaction },
    resources: {
      player: { ...STARTING_RESOURCES },
      enemy: { ...STARTING_RESOURCES },
    },
    keeps: { player: KEEP_MAX_HP, enemy: KEEP_MAX_HP },
    buildings: [],
    units: [],
    effects: [],
    incomeClock: INCOME_INTERVAL,
    aiClock: 3.2,
    keepDefenseClock: 1.15,
    syncEnabled: { player: false, enemy: false },
    syncClock: { player: 12, enemy: 12 },
    reprieveUsed: { player: false, enemy: false },
    rallyHorn: { player: false, enemy: false },
    keepArmorUntil: { player: 0, enemy: 0 },
    nextId: 1,
    event: "Choose a structure, then place it inside your construction yard.",
    eventSerial: 1,
    stats: emptyStats(),
  };
}

export function startNextRound(state: GameState): GameState {
  if (state.status !== "round_won" && state.status !== "round_lost") return state;
  const comebackMarks = state.status === "round_lost" ? 60 : 0;
  return {
    ...state,
    status: "playing",
    started: false,
    elapsed: 0,
    round: state.round + 1,
    resources: {
      player: { marks: STARTING_RESOURCES.marks + comebackMarks, timber: STARTING_RESOURCES.timber, sigils: 1 },
      enemy: { ...STARTING_RESOURCES },
    },
    keeps: { player: KEEP_MAX_HP, enemy: KEEP_MAX_HP },
    buildings: [],
    units: [],
    effects: [],
    incomeClock: INCOME_INTERVAL,
    aiClock: 3.2,
    keepDefenseClock: 1.15,
    syncEnabled: { player: false, enemy: false },
    syncClock: { player: 12, enemy: 12 },
    reprieveUsed: { player: false, enemy: false },
    rallyHorn: { player: false, enemy: false },
    keepArmorUntil: { player: 0, enemy: 0 },
    event: `Round ${state.round + 1}. Rebuild your muster and adapt to the rival's last formation.`,
    eventSerial: state.eventSerial + 1,
  };
}

export function factionBuildings(faction: FactionId, category?: BuildingCategory): BuildingKind[] {
  return FACTIONS[faction].buildings.filter((kind) => !category || BUILDING_SPECS[kind].category === category);
}

export function buildingCount(state: GameState, team: Team, kind?: BuildingKind): number {
  return state.buildings.filter((building) => building.team === team && (!kind || building.kind === kind)).length;
}

export function unitCount(state: GameState, team: Team): number {
  return state.units.filter((unit) => unit.team === team).length;
}

export function incomeFor(state: GameState, team: Team): number {
  return 45 + state.buildings
    .filter((building) => building.team === team)
    .reduce((total, building) => total + Math.round(BUILDING_SPECS[building.kind].yieldBonus * (1 + (building.level - 1) * 0.35)), 0);
}

export const yieldFor = incomeFor;

export function canAfford(resources: ResourceStock, cost: ResourceCost): boolean {
  return RESOURCE_KEYS.every((key) => resources[key] >= (cost[key] ?? 0));
}

function spend(resources: ResourceStock, cost: ResourceCost): ResourceStock {
  return {
    marks: resources.marks - cost.marks,
    timber: resources.timber - (cost.timber ?? 0),
    sigils: resources.sigils - (cost.sigils ?? 0),
  };
}

export function costForUpgrade(building: Building): ResourceCost | null {
  if (building.level === 1) return BUILDING_SPECS[building.kind].upgradeCost;
  if (building.level === 2) return BUILDING_SPECS[building.kind].legendaryCost;
  return null;
}

export function damageAgainstArmor(damageType: DamageType, armorType: ArmorType): number {
  return DAMAGE_MATRIX[damageType][armorType];
}

export function damageMultiplier(attacker: UnitKind, defender: UnitKind): number {
  return damageAgainstArmor(UNIT_SPECS[attacker].damageType, UNIT_SPECS[defender].armorType);
}

export function reprieveReady(state: GameState, team: Team): boolean {
  return state.status === "playing" && state.elapsed >= REPRIEVE_READY_AT && !state.reprieveUsed[team];
}

function gridKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function cellsForBuilding(building: Pick<Building, "gridX" | "gridY" | "kind">): GridPoint[] {
  const spec = BUILDING_SPECS[building.kind];
  const cells: GridPoint[] = [];
  for (let y = 0; y < spec.height; y += 1) {
    for (let x = 0; x < spec.width; x += 1) cells.push({ x: building.gridX + x, y: building.gridY + y });
  }
  return cells;
}

function centeredOffsets(length: number): number[] {
  const center = Math.floor((length - 1) / 2);
  return Array.from({ length }, (_, index) => index).sort((left, right) => Math.abs(left - center) - Math.abs(right - center));
}

function exitCells(building: Pick<Building, "team" | "gridX" | "gridY" | "kind">): GridPoint[] {
  const spec = BUILDING_SPECS[building.kind];
  const yOffsets = centeredOffsets(spec.height);
  const xOffsets = centeredOffsets(spec.width);
  const forwardX = building.team === "player" ? building.gridX + spec.width : building.gridX - 1;
  const rearX = building.team === "player" ? building.gridX - 1 : building.gridX + spec.width;
  const candidates: GridPoint[] = [
    ...yOffsets.map((offset) => ({ x: forwardX, y: building.gridY + offset })),
    ...xOffsets.map((offset) => ({ x: building.gridX + offset, y: building.gridY - 1 })),
    ...xOffsets.map((offset) => ({ x: building.gridX + offset, y: building.gridY + spec.height })),
    ...yOffsets.map((offset) => ({ x: rearX, y: building.gridY + offset })),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = gridKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cellCenter(point: GridPoint): Point {
  return { x: point.x * CELL_SIZE + CELL_SIZE / 2, y: point.y * CELL_SIZE + CELL_SIZE / 2 };
}

function findGridPath(start: GridPoint, goal: GridPoint, team: Team, blocked: Set<string>): GridPoint[] | null {
  const zone = NAV_ZONES[team];
  const queue: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint | null>([[gridKey(start), null]]);
  const directions: GridPoint[] = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.x === goal.x && current.y === goal.y) {
      const path: GridPoint[] = [];
      let cursor: GridPoint | null = current;
      while (cursor) {
        path.push(cursor);
        cursor = cameFrom.get(gridKey(cursor)) ?? null;
      }
      return path.reverse();
    }
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = gridKey(next);
      if (next.x < zone.minX || next.x > zone.maxX || next.y < zone.minY || next.y > zone.maxY) continue;
      if (blocked.has(key) && key !== gridKey(goal) && key !== gridKey(start)) continue;
      if (cameFrom.has(key)) continue;
      cameFrom.set(key, current);
      queue.push(next);
    }
  }
  return null;
}

function blockedCells(buildings: Array<Pick<Building, "gridX" | "gridY" | "kind">>): Set<string> {
  const blocked = new Set<string>();
  for (const building of buildings) for (const cell of cellsForBuilding(building)) blocked.add(gridKey(cell));
  return blocked;
}

function findBuildingExitPath(
  building: Pick<Building, "team" | "gridX" | "gridY" | "kind">,
  blocked: Set<string>,
): GridPoint[] | null {
  const zone = NAV_ZONES[building.team];
  for (const start of exitCells(building)) {
    if (start.x < zone.minX || start.x > zone.maxX || start.y < zone.minY || start.y > zone.maxY) continue;
    if (blocked.has(gridKey(start))) continue;
    const path = findGridPath(start, GATE_CELLS[building.team], building.team, blocked);
    if (path) return path;
  }
  return null;
}

export function validatePlacement(state: GameState, team: Team, kind: BuildingKind, gridX: number, gridY: number): PlacementValidation {
  const spec = BUILDING_SPECS[kind];
  if (state.status !== "playing") return { valid: false, reason: "The round is over." };
  if (spec.faction !== state.factions[team]) return { valid: false, reason: "That structure belongs to another faction." };
  if (!canAfford(state.resources[team], spec.cost)) return { valid: false, reason: "You cannot afford that Marks, Timber, or Sigil cost." };
  if (buildingCount(state, team) >= BUILDING_CAP) return { valid: false, reason: "Your construction yard is full." };

  const insideBuildArea = BUILD_AREAS[team].some((area) => (
    gridX >= area.minX
    && gridY >= area.minY
    && gridX + spec.width - 1 <= area.maxX
    && gridY + spec.height - 1 <= area.maxY
  ));
  if (!insideBuildArea) return { valid: false, reason: "That footprint leaves your construction yard." };

  const candidate: Building = {
    id: -1,
    team,
    kind,
    gridX,
    gridY,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    level: 1,
    spawnClock: 0,
    abilityClock: 0,
    productionPaused: false,
    totalSpawned: 0,
  };
  const existing = state.buildings.filter((building) => building.team === team);
  const candidateCells = new Set(cellsForBuilding(candidate).map(gridKey));
  if (existing.some((building) => cellsForBuilding(building).some((cell) => candidateCells.has(gridKey(cell))))) {
    return { valid: false, reason: "Another structure occupies those cells." };
  }

  const teamBuildings = [...existing, candidate];
  const blocked = blockedCells(teamBuildings);
  let candidatePath: GridPoint[] | undefined;
  for (const building of teamBuildings) {
    if (!BUILDING_SPECS[building.kind].unitKind) continue;
    const path = findBuildingExitPath(building, blocked);
    if (!path) return { valid: false, reason: "That placement would seal every available cohort exit." };
    if (building.id === -1) candidatePath = path;
  }

  return { valid: true, reason: "Valid placement.", path: candidatePath };
}

function withEvent(state: GameState, event: string): GameState {
  return { ...state, event, eventSerial: state.eventSerial + 1 };
}

export function placeBuilding(state: GameState, team: Team, kind: BuildingKind, gridX: number, gridY: number): GameState {
  const validation = validatePlacement(state, team, kind, gridX, gridY);
  if (!validation.valid) return team === "player" ? withEvent(state, validation.reason) : state;
  const spec = BUILDING_SPECS[kind];
  const building: Building = {
    id: state.nextId,
    team,
    kind,
    gridX,
    gridY,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    level: 1,
    spawnClock: spec.spawnEvery ? Math.min(spec.spawnEvery, 2.2 + (state.nextId % 3) * 0.4) : 0,
    abilityClock: spec.category === "special" ? 3.4 : spec.category === "tower" ? 1.2 : 0,
    productionPaused: false,
    totalSpawned: 0,
  };
  const resources = spend(state.resources[team], spec.cost);
  resources.timber += spec.timberGain;
  const next: GameState = {
    ...state,
    started: true,
    resources: { ...state.resources, [team]: resources },
    buildings: [...state.buildings, building],
    nextId: state.nextId + 1,
    stats: {
      ...state.stats,
      buildingsPlaced: { ...state.stats.buildingsPlaced, [team]: state.stats.buildingsPlaced[team] + 1 },
    },
  };
  if (team === "enemy") return next;
  const timberText = spec.timberGain ? ` It returned ${spec.timberGain} Timber to your stores.` : "";
  const actionText = spec.unitKind ? `${spec.cohort} will deploy automatically.` : spec.category === "economy" ? "Your recurring income is now higher." : "Its battlefield effect is now active.";
  return withEvent(next, `${spec.name} placed at ${gridX}, ${gridY}. ${actionText}${timberText}`);
}

export function upgradeBuilding(state: GameState, team: Team, buildingId: number): GameState {
  const building = state.buildings.find((candidate) => candidate.id === buildingId && candidate.team === team);
  if (!building) return state;
  const cost = costForUpgrade(building);
  if (!cost) return team === "player" ? withEvent(state, "That structure has already reached legendary rank.") : state;
  if (!canAfford(state.resources[team], cost)) return team === "player" ? withEvent(state, "The upgrade needs more Marks, Timber, or a Sigil.") : state;
  const nextLevel = (building.level + 1) as 2 | 3;
  const hpScale = nextLevel === 2 ? 1.28 : 1.68;
  const nextMaxHp = Math.round(BUILDING_SPECS[building.kind].maxHp * hpScale);
  const hpGain = nextMaxHp - building.maxHp;
  const resources = spend(state.resources[team], cost);
  const center = buildingCenter(building);
  const next: GameState = {
    ...state,
    resources: { ...state.resources, [team]: resources },
    buildings: state.buildings.map((candidate) => candidate.id === buildingId ? {
      ...candidate,
      level: nextLevel,
      hp: Math.min(nextMaxHp, candidate.hp + hpGain),
      maxHp: nextMaxHp,
      spawnClock: Math.min(candidate.spawnClock, productionPeriod(candidate, state)),
    } : candidate),
    effects: [...state.effects, { id: state.nextId, type: "upgrade", x: center.x, y: center.y, life: 1.2, team, label: nextLevel === 3 ? "LEGENDARY" : "VETERAN" }],
    nextId: state.nextId + 1,
    stats: { ...state.stats, upgrades: { ...state.stats.upgrades, [team]: state.stats.upgrades[team] + 1 } },
  };
  return team === "player" ? withEvent(next, `${BUILDING_SPECS[building.kind].name} is now ${nextLevel === 3 ? "Legendary" : "Veteran"}.`) : next;
}

export function toggleProduction(state: GameState, team: Team, buildingId: number): GameState {
  const building = state.buildings.find((candidate) => candidate.id === buildingId && candidate.team === team);
  if (!building || !BUILDING_SPECS[building.kind].unitKind) return state;
  const paused = !building.productionPaused;
  const next = {
    ...state,
    buildings: state.buildings.map((candidate) => candidate.id === buildingId ? { ...candidate, productionPaused: paused } : candidate),
  };
  return team === "player" ? withEvent(next, `${BUILDING_SPECS[building.kind].name} production ${paused ? "held for manual synchronization" : "resumed"}.`) : next;
}

export function toggleSynchronization(state: GameState, team: Team): GameState {
  if (state.status !== "playing") return state;
  const enabled = !state.syncEnabled[team];
  const production = state.buildings.filter((building) => building.team === team && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused);
  const longest = Math.max(4, ...production.map((building) => productionPeriod(building, state)));
  const next = {
    ...state,
    syncEnabled: { ...state.syncEnabled, [team]: enabled },
    syncClock: { ...state.syncClock, [team]: enabled ? Math.min(state.syncClock[team], longest) : longest },
  };
  return team === "player" ? withEvent(next, enabled
    ? "Rally Sync enabled. Active Foundries will deploy together at the slowest cadence."
    : "Rally Sync disabled. Each Foundry has returned to its own cadence.") : next;
}

export function buyShopItem(state: GameState, team: Team, item: ShopItemKind): GameState {
  if (state.status !== "playing") return state;
  const spec = SHOP_ITEMS[item];
  if (item === "rally_horn" && state.rallyHorn[team]) return team === "player" ? withEvent(state, "Your Rally Horn is already sounding.") : state;
  if (!canAfford(state.resources[team], spec.cost)) return team === "player" ? withEvent(state, "That commission needs more Marks or Timber.") : state;

  let resources = spend(state.resources[team], spec.cost);
  const keeps = { ...state.keeps };
  let units = state.units.map((unit) => ({ ...unit }));
  let buildings = state.buildings.map((building) => ({ ...building }));
  const rallyHorn = { ...state.rallyHorn };
  const keepArmorUntil = { ...state.keepArmorUntil };

  if (item === "rally_horn") rallyHorn[team] = true;
  if (item === "ember_flask") {
    units = units.map((unit) => unit.team !== team && onTeamHalf(unit.x, team) ? { ...unit, hp: unit.hp - 150, lastDamagedBy: team } : unit);
  }
  if (item === "iron_writ") {
    keeps[team] = Math.min(KEEP_MAX_HP, keeps[team] + 260);
    keepArmorUntil[team] = state.elapsed + 25;
  }
  if (item === "tempo_bell") {
    buildings = buildings.map((building) => building.team === team && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused ? { ...building, spawnClock: 0 } : building);
  }
  if (item === "sigil_shard") resources = { ...resources, sigils: resources.sigils + 1 };

  const keep = KEEP_POSITIONS[team];
  const next: GameState = {
    ...state,
    resources: { ...state.resources, [team]: resources },
    keeps,
    units,
    buildings,
    rallyHorn,
    keepArmorUntil,
    syncClock: item === "tempo_bell" ? { ...state.syncClock, [team]: 0 } : state.syncClock,
    effects: [...state.effects, { id: state.nextId, type: "item", x: keep.x, y: keep.y, life: 1.2, team, label: spec.name.toUpperCase() }],
    nextId: state.nextId + 1,
    stats: { ...state.stats, itemsBought: { ...state.stats.itemsBought, [team]: state.stats.itemsBought[team] + 1 } },
  };
  const cleaned = collectDefeated(next);
  return team === "player" ? withEvent(cleaned, `${spec.name} commissioned. ${spec.description}`) : cleaned;
}

function buildingPath(state: GameState, building: Building, unitId: number): Point[] {
  const blocked = blockedCells(state.buildings.filter((candidate) => candidate.team === building.team));
  const baseGridPath = findBuildingExitPath(building, blocked) ?? [GATE_CELLS[building.team]];
  const offset = ((unitId % 5) - 2) * 9;
  const lane = building.team === "player"
    ? LANE_PATH.map((point, index) => ({ x: point.x, y: point.y + (index > 0 && index < LANE_PATH.length - 1 ? offset : 0) }))
    : [...LANE_PATH].reverse().map((point, index, list) => ({ x: point.x, y: point.y + (index > 0 && index < list.length - 1 ? offset : 0) }));
  const keep = KEEP_POSITIONS[enemyOf(building.team)];
  return [...baseGridPath.map(cellCenter), ...lane.slice(1), keep];
}

function unitScale(level: 1 | 2 | 3): number {
  return level === 1 ? 1 : level === 2 ? 1.27 : 1.67;
}

function productionPeriod(building: Building, state: GameState): number {
  const base = BUILDING_SPECS[building.kind].spawnEvery ?? 12;
  const levelFactor = building.level === 1 ? 1 : building.level === 2 ? 0.88 : 0.76;
  const factionFactor = state.factions[building.team] === "stormglass" ? 0.92 : 1;
  return base * levelFactor * factionFactor;
}

function spawnUnit(state: GameState, building: Building): GameState {
  if (state.units.length >= UNIT_CAP) return state;
  const kind = BUILDING_SPECS[building.kind].unitKind;
  if (!kind) return state;
  const spec = UNIT_SPECS[kind];
  const path = buildingPath(state, building, state.nextId);
  const start = path[0] ?? cellCenter(GATE_CELLS[building.team]);
  const scale = unitScale(building.level);
  const maxHp = Math.round(spec.maxHp * scale);
  const unit: Unit = {
    id: state.nextId,
    team: building.team,
    kind,
    level: building.level,
    x: start.x,
    y: start.y,
    hp: maxHp,
    maxHp,
    shield: 0,
    cooldown: 0.25,
    attackFlash: 0,
    path,
    pathIndex: 1,
    poisonTimer: 0,
    poisonDps: 0,
    slowTimer: 0,
    stunTimer: 0,
  };
  return {
    ...state,
    buildings: state.buildings.map((candidate) => candidate.id === building.id ? { ...candidate, totalSpawned: candidate.totalSpawned + 1 } : candidate),
    units: [...state.units, unit],
    effects: [...state.effects, { id: state.nextId + 1, type: "spawn", x: start.x, y: start.y, life: 0.75, team: building.team, label: building.level === 3 ? "LEGENDARY" : undefined }],
    nextId: state.nextId + 2,
    stats: { ...state.stats, unitsSpawned: { ...state.stats.unitsSpawned, [building.team]: state.stats.unitsSpawned[building.team] + 1 } },
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildingCenter(building: Pick<Building, "gridX" | "gridY" | "kind">): Point {
  const spec = BUILDING_SPECS[building.kind];
  return { x: (building.gridX + spec.width / 2) * CELL_SIZE, y: (building.gridY + spec.height / 2) * CELL_SIZE };
}

function moveToward(unit: Unit, target: Point, amount: number): void {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const length = Math.hypot(dx, dy);
  if (length <= amount || length === 0) { unit.x = target.x; unit.y = target.y; return; }
  unit.x += dx / length * amount;
  unit.y += dy / length * amount;
}

function moveAlongPath(unit: Unit, amount: number): void {
  let remaining = amount;
  while (remaining > 0 && unit.pathIndex < unit.path.length) {
    const target = unit.path[unit.pathIndex];
    const d = distance(unit, target);
    if (d <= remaining) {
      unit.x = target.x;
      unit.y = target.y;
      unit.pathIndex += 1;
      remaining -= d;
    } else {
      moveToward(unit, target, remaining);
      remaining = 0;
    }
  }
}

function onTeamHalf(x: number, team: Team): boolean {
  return team === "player" ? x < WORLD_WIDTH / 2 : x > WORLD_WIDTH / 2;
}

function canTarget(attacker: Unit, target: Unit): boolean {
  const spec = UNIT_SPECS[attacker.kind];
  return !UNIT_SPECS[target.kind].flying || Boolean(spec.targetsAir || spec.flying);
}

function addEffect(effects: Effect[], nextId: { value: number }, effect: Omit<Effect, "id">): void {
  effects.push({ ...effect, id: nextId.value });
  nextId.value += 1;
}

function nearbyFormationResistance(target: Unit, units: Unit[]): number {
  if (UNIT_SPECS[target.kind].faction !== "daybreak") return 1;
  return units.some((unit) => unit.id !== target.id && unit.team === target.team && unit.hp > 0 && distance(unit, target) <= 105) ? 0.9 : 1;
}

function dealUnitDamage(target: Unit, raw: number, damageType: DamageType, attackerTeam: Team, units: Unit[]): number {
  let amount = raw * damageAgainstArmor(damageType, UNIT_SPECS[target.kind].armorType);
  if (UNIT_SPECS[target.kind].ability === "evasion") amount *= 1 - (UNIT_SPECS[target.kind].abilityPower ?? 0.18);
  if (UNIT_SPECS[target.kind].ability === "bulwark" && target.hp < target.maxHp * 0.5) amount *= 1 - (UNIT_SPECS[target.kind].abilityPower ?? 0.2);
  amount *= nearbyFormationResistance(target, units);
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
  }
  target.hp -= amount;
  target.lastDamagedBy = attackerTeam;
  return amount;
}

function attackSpeed(unit: Unit, units: Unit[], state: GameState): number {
  let speed = state.rallyHorn[unit.team] ? 1.12 : 1;
  if (state.factions[unit.team] === "stormglass") speed *= 1.08;
  const hasted = units.some((ally) => ally.team === unit.team && ally.hp > 0 && UNIT_SPECS[ally.kind].ability === "haste" && distance(ally, unit) <= (UNIT_SPECS[ally.kind].abilityRadius ?? 110));
  if (hasted) speed *= 1.16;
  return speed;
}

function simulateCombat(state: GameState, dt: number): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const buildings = state.buildings.map((building) => ({ ...building }));
  const keeps = { ...state.keeps };
  const resources = { player: { ...state.resources.player }, enemy: { ...state.resources.enemy } };
  const effects = state.effects.map((effect) => ({ ...effect, life: effect.life - dt })).filter((effect) => effect.life > 0);
  const nextId = { value: state.nextId };
  const keepDamage = { ...state.stats.keepDamage };

  for (const unit of units) {
    unit.attackFlash = Math.max(0, unit.attackFlash - dt);
    unit.slowTimer = Math.max(0, unit.slowTimer - dt);
    unit.stunTimer = Math.max(0, unit.stunTimer - dt);
    if (unit.poisonTimer > 0) {
      unit.poisonTimer = Math.max(0, unit.poisonTimer - dt);
      unit.hp -= unit.poisonDps * dt;
      if (unit.poisonTeam) unit.lastDamagedBy = unit.poisonTeam;
    }
    if (state.factions[unit.team] === "briarcrown") unit.hp = Math.min(unit.maxHp, unit.hp + 2.2 * dt * unitScale(unit.level));
    if (UNIT_SPECS[unit.kind].ability === "regrowth") unit.hp = Math.min(unit.maxHp, unit.hp + (UNIT_SPECS[unit.kind].abilityPower ?? 5) * dt);
    unit.cooldown = Math.max(0, unit.cooldown - dt * attackSpeed(unit, units, state));
  }

  for (const unit of units) {
    if (unit.hp <= 0 || unit.stunTimer > 0) continue;
    const spec = UNIT_SPECS[unit.kind];
    const eligible = units.filter((candidate) => candidate.team !== unit.team && candidate.hp > 0 && canTarget(unit, candidate));
    const nearestUnit = eligible.reduce<Unit | null>((nearest, candidate) => !nearest || distance(unit, candidate) < distance(unit, nearest) ? candidate : nearest, null);
    const nearestDistance = nearestUnit ? distance(unit, nearestUnit) : Number.POSITIVE_INFINITY;

    if (nearestUnit && nearestDistance <= spec.range) {
      if (unit.cooldown <= 0) {
        const baseDamage = spec.damage * unitScale(unit.level);
        const dealt = dealUnitDamage(nearestUnit, baseDamage, spec.damageType, unit.team, units);
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: nearestUnit.x, y2: nearestUnit.y, life: 0.22, team: unit.team });

        if (spec.ability === "chain") {
          const chained = eligible.find((candidate) => candidate.id !== nearestUnit.id && distance(candidate, nearestUnit) <= (spec.abilityRadius ?? 90));
          if (chained) dealUnitDamage(chained, baseDamage * (spec.abilityPower ?? 0.38), spec.damageType, unit.team, units);
        }
        if (spec.ability === "splash") {
          for (const target of eligible) if (target.id !== nearestUnit.id && distance(target, nearestUnit) <= (spec.abilityRadius ?? 80)) {
            dealUnitDamage(target, baseDamage * (spec.abilityPower ?? 0.4), spec.damageType, unit.team, units);
          }
        }
        if (spec.ability === "poison") {
          nearestUnit.poisonTimer = 4;
          nearestUnit.poisonDps = (spec.abilityPower ?? 7) * unitScale(unit.level);
          nearestUnit.poisonTeam = unit.team;
        }
        if (spec.ability === "slow") nearestUnit.slowTimer = 3.5;
        if (spec.ability === "stun" && (unit.id + nearestUnit.id + Math.floor(state.elapsed)) % 5 === 0) nearestUnit.stunTimer = 0.75;
        if (spec.ability === "lifedrain") unit.hp = Math.min(unit.maxHp, unit.hp + dealt * (spec.abilityPower ?? 0.22));
      }
      continue;
    }

    const moveFactor = (unit.slowTimer > 0 ? 0.68 : 1) * (state.rallyHorn[unit.team] ? 1.12 : 1);
    if (nearestUnit && nearestDistance <= spec.range + 115) {
      moveToward(unit, nearestUnit, spec.speed * moveFactor * dt);
      continue;
    }

    const inEnemyYard = unit.team === "player"
      ? unit.x > cellCenter(GATE_CELLS.enemy).x - 80
      : unit.x < cellCenter(GATE_CELLS.player).x + 80;
    const enemyBuildings = buildings.filter((building) => building.team !== unit.team && building.hp > 0);
    const nearestBuilding = inEnemyYard
      ? enemyBuildings.reduce<Building | null>((nearest, candidate) => !nearest || distance(unit, buildingCenter(candidate)) < distance(unit, buildingCenter(nearest)) ? candidate : nearest, null)
      : null;

    if (nearestBuilding) {
      const center = buildingCenter(nearestBuilding);
      if (distance(unit, center) <= spec.range + 38) {
        if (unit.cooldown <= 0) {
          const damage = spec.damage * unitScale(unit.level) * damageAgainstArmor(spec.damageType, "Fortified");
          nearestBuilding.hp -= damage;
          nearestBuilding.lastDamagedBy = unit.team;
          unit.cooldown = spec.attackEvery;
          unit.attackFlash = 0.2;
          addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: center.x, y2: center.y, life: 0.22, team: unit.team });
        }
      } else moveToward(unit, center, spec.speed * moveFactor * dt);
      continue;
    }

    const opposingTeam = enemyOf(unit.team);
    const keep = KEEP_POSITIONS[opposingTeam];
    if (distance(unit, keep) <= spec.range + 74) {
      if (unit.cooldown <= 0) {
        let dealt = spec.damage * unitScale(unit.level) * damageAgainstArmor(spec.damageType, "Fortified") * 0.72;
        if (state.keepArmorUntil[opposingTeam] > state.elapsed) dealt *= 0.65;
        keeps[opposingTeam] -= dealt;
        keepDamage[unit.team] += dealt;
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: keep.x, y2: keep.y, life: 0.24, team: unit.team });
      }
    } else moveAlongPath(unit, spec.speed * moveFactor * dt);
  }

  const intermediate: GameState = {
    ...state,
    units,
    buildings,
    keeps: { player: Math.max(0, keeps.player), enemy: Math.max(0, keeps.enemy) },
    resources,
    effects,
    nextId: nextId.value,
    stats: { ...state.stats, keepDamage },
  };
  return collectDefeated(intermediate);
}

function collectDefeated(state: GameState): GameState {
  const destroyedBuildings = state.buildings.filter((building) => building.hp <= 0);
  const lostUnits = state.units.filter((unit) => unit.hp <= 0);
  if (!destroyedBuildings.length && !lostUnits.length) return state;

  const resources = { player: { ...state.resources.player }, enemy: { ...state.resources.enemy } };
  const bountyEarned = { ...state.stats.bountyEarned };
  const buildingsLost = { ...state.stats.buildingsLost };
  const unitsLost = { ...state.stats.unitsLost };
  const effects = [...state.effects];
  let nextId = state.nextId;

  for (const unit of lostUnits) {
    unitsLost[unit.team] += 1;
    if (unit.lastDamagedBy) {
      const bounty = UNIT_SPECS[unit.kind].bounty + (unit.level - 1) * 5;
      resources[unit.lastDamagedBy].marks += bounty;
      bountyEarned[unit.lastDamagedBy] += bounty;
    }
    effects.push({ id: nextId++, type: "destroy", x: unit.x, y: unit.y, life: 0.85, team: unit.team });
  }
  for (const building of destroyedBuildings) {
    buildingsLost[building.team] += 1;
    if (building.lastDamagedBy) {
      const bounty = 35 + building.level * 15;
      resources[building.lastDamagedBy].marks += bounty;
      bountyEarned[building.lastDamagedBy] += bounty;
    }
    const center = buildingCenter(building);
    effects.push({ id: nextId++, type: "destroy", x: center.x, y: center.y, life: 1.2, team: building.team });
  }

  return {
    ...state,
    resources,
    units: state.units.filter((unit) => unit.hp > 0),
    buildings: state.buildings.filter((building) => building.hp > 0),
    effects,
    nextId,
    stats: { ...state.stats, buildingsLost, unitsLost, bountyEarned },
  };
}

function applyStructureEffects(state: GameState): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const buildings = state.buildings.map((building) => ({ ...building }));
  const effects = [...state.effects];
  let nextId = state.nextId;

  for (const building of buildings) {
    const spec = BUILDING_SPECS[building.kind];
    if (building.abilityClock > 0 || (spec.category !== "special" && spec.category !== "tower")) continue;
    const center = buildingCenter(building);
    const power = unitScale(building.level);
    if (spec.effect === "aegis") {
      const targets = units.filter((unit) => unit.team === building.team && onTeamHalf(unit.x, building.team)).sort((a, b) => (a.shield + a.hp) - (b.shield + b.hp)).slice(0, 3 + building.level);
      for (const unit of targets) unit.shield = Math.min(180 * power, unit.shield + 70 * power);
      effects.push({ id: nextId++, type: "shield", x: center.x, y: center.y, life: 1, team: building.team, label: `+${Math.round(70 * power)} SHIELD` });
      building.abilityClock = 7.5 / power;
    } else if (spec.effect === "renewal") {
      const targets = units.filter((unit) => unit.team === building.team && onTeamHalf(unit.x, building.team)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 4 + building.level);
      for (const unit of targets) unit.hp = Math.min(unit.maxHp, unit.hp + 62 * power);
      effects.push({ id: nextId++, type: "heal", x: center.x, y: center.y, life: 1, team: building.team, label: `+${Math.round(62 * power)} RENEW` });
      building.abilityClock = 6.8 / power;
    } else if (spec.effect === "tempest") {
      const targets = units.filter((unit) => unit.team !== building.team && distance(unit, center) <= 660).slice(0, 4 + building.level);
      for (const unit of targets) {
        dealUnitDamage(unit, 50 * power, "Arc", building.team, units);
        unit.slowTimer = Math.max(unit.slowTimer, 2.5);
      }
      effects.push({ id: nextId++, type: "pulse", x: center.x, y: center.y, life: 1, team: building.team, label: "STATIC PULSE" });
      building.abilityClock = 6.2 / power;
    } else if (spec.effect === "tower") {
      const targets = units.filter((unit) => unit.team !== building.team && distance(unit, center) <= 390 && (UNIT_SPECS[unit.kind].flying ? spec.faction === "stormglass" || building.level >= 2 : true));
      const target = targets.sort((a, b) => distance(a, center) - distance(b, center))[0];
      if (target) {
        const damageType: DamageType = spec.faction === "briarcrown" ? "Arrow" : spec.faction === "stormglass" ? "Arc" : "Pure";
        dealUnitDamage(target, 54 * power, damageType, building.team, units);
        if (spec.faction === "briarcrown") {
          target.poisonTimer = 3;
          target.poisonDps = 5 * power;
          target.poisonTeam = building.team;
        }
        effects.push({ id: nextId++, type: "hit", x: center.x, y: center.y, x2: target.x, y2: target.y, life: 0.24, team: building.team });
      }
      building.abilityClock = 1.25 / power;
    }
  }

  return collectDefeated({ ...state, units, buildings, effects, nextId });
}

function applyKeepDefense(state: GameState): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const effects = [...state.effects];
  let nextId = state.nextId;
  for (const team of ["player", "enemy"] as const) {
    const keep = KEEP_POSITIONS[team];
    const threat = units.filter((unit) => unit.team !== team && unit.hp > 0 && distance(unit, keep) < 220).sort((a, b) => distance(a, keep) - distance(b, keep))[0];
    if (threat) {
      dealUnitDamage(threat, 46, "Pure", team, units);
      effects.push({ id: nextId++, type: "hit", x: keep.x, y: keep.y, x2: threat.x, y2: threat.y, life: 0.3, team });
    }
  }
  return collectDefeated({ ...state, units, effects, nextId });
}

export function castReprieve(state: GameState, team: Team): GameState {
  if (!reprieveReady(state, team)) return state;
  const units = state.units.map((unit) => unit.team === team ? { ...unit } : {
    ...unit,
    hp: onTeamHalf(unit.x, team) ? 0 : unit.hp * 0.68,
    lastDamagedBy: team,
  });
  const keep = KEEP_POSITIONS[team];
  const next: GameState = {
    ...state,
    units,
    reprieveUsed: { ...state.reprieveUsed, [team]: true },
    effects: [...state.effects, { id: state.nextId, type: "reprieve", x: keep.x, y: keep.y, life: 1.5, team, label: "REPRIEVE" }],
    nextId: state.nextId + 1,
  };
  const cleaned = collectDefeated(next);
  return withEvent(cleaned, `${FACTIONS[state.factions[team]].name} invoked Reprieve. Invaders on the ${team === "player" ? "western" : "eastern"} half were erased; the distant host was wounded.`);
}

function shouldBotCastReprieve(state: GameState): boolean {
  if (!reprieveReady(state, "enemy")) return false;
  const invaders = state.units.filter((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy"));
  const closeThreats = invaders.filter((unit) => distance(unit, KEEP_POSITIONS.enemy) < 760);
  const pressure = invaders.reduce((total, unit) => {
    const spec = UNIT_SPECS[unit.kind];
    const roleWeight = spec.role === "siege" ? 2.25 : spec.role === "vanguard" ? 1.25 : 1;
    const proximityWeight = distance(unit, KEEP_POSITIONS.enemy) < 950 ? 1.5 : 1;
    return total + unit.level * roleWeight * proximityWeight * Math.max(0.35, unit.hp / unit.maxHp);
  }, 0);
  const keepRatio = state.keeps.enemy / KEEP_MAX_HP;
  return closeThreats.length >= 2
    || invaders.length >= 4
    || pressure >= 5.5
    || (keepRatio < 0.7 && invaders.length >= 1)
    || keepRatio < 0.4;
}

function dominantEnemyArmor(state: GameState, team: Team): ArmorType {
  const opponent = enemyOf(team);
  const counts = new Map<ArmorType, number>();
  for (const unit of state.units.filter((candidate) => candidate.team === opponent)) {
    const armor = UNIT_SPECS[unit.kind].armorType;
    counts.set(armor, (counts.get(armor) ?? 0) + 2);
  }
  for (const building of state.buildings.filter((candidate) => candidate.team === opponent)) {
    const kind = BUILDING_SPECS[building.kind].unitKind;
    if (!kind) continue;
    const armor = UNIT_SPECS[kind].armorType;
    counts.set(armor, (counts.get(armor) ?? 0) + building.level);
  }
  return (["Plate", "Cloth", "Ward", "Fortified", "Ethereal"] as ArmorType[]).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
}

function aiDesiredTroop(state: GameState): BuildingKind {
  const team: Team = "enemy";
  const armor = dominantEnemyArmor(state, team);
  const airThreat = state.units.filter((unit) => unit.team === "player" && UNIT_SPECS[unit.kind].flying).length;
  return factionBuildings(state.factions.enemy, "troop").sort((a, b) => {
    const aUnit = UNIT_SPECS[BUILDING_SPECS[a].unitKind!];
    const bUnit = UNIT_SPECS[BUILDING_SPECS[b].unitKind!];
    const aScore = DAMAGE_MATRIX[aUnit.damageType][armor] + (airThreat && aUnit.targetsAir ? 0.45 : 0);
    const bScore = DAMAGE_MATRIX[bUnit.damageType][armor] + (airThreat && bUnit.targetsAir ? 0.45 : 0);
    return bScore - aScore;
  })[0];
}

function aiDesiredBuilding(state: GameState): BuildingKind {
  const faction = state.factions.enemy;
  const total = buildingCount(state, "enemy");
  const economy = factionBuildings(faction, "economy")[0];
  const special = factionBuildings(faction, "special")[0];
  const tower = factionBuildings(faction, "tower")[0];
  if (total >= 2 && buildingCount(state, "enemy", economy) < Math.floor((total + 1) / 5)) return economy;
  if (total >= 4 && buildingCount(state, "enemy", special) === 0) return special;
  if (total >= 6 && buildingCount(state, "enemy", tower) === 0) return tower;
  return aiDesiredTroop(state);
}

function aiPlace(state: GameState, preferred: BuildingKind): GameState {
  const choices = [preferred, ...factionBuildings(state.factions.enemy, "troop"), ...factionBuildings(state.factions.enemy, "economy")]
    .filter((kind, index, list) => list.indexOf(kind) === index);
  for (const kind of choices) {
    if (!canAfford(state.resources.enemy, BUILDING_SPECS[kind].cost)) continue;
    const spec = BUILDING_SPECS[kind];
    for (const area of BUILD_AREAS.enemy) {
      for (let x = area.maxX - spec.width + 1; x >= area.minX; x -= 1) {
        for (let y = area.minY; y <= area.maxY - spec.height + 1; y += 1) {
          if (validatePlacement(state, "enemy", kind, x, y).valid) return placeBuilding(state, "enemy", kind, x, y);
        }
      }
    }
  }
  return state;
}

function runAi(state: GameState): GameState {
  if (!state.started) return state;
  let next = state;
  if (next.keeps.enemy < KEEP_MAX_HP * 0.58 && canAfford(next.resources.enemy, SHOP_ITEMS.iron_writ.cost)) next = buyShopItem(next, "enemy", "iron_writ");
  if (buildingCount(next, "enemy") >= 7 && !next.rallyHorn.enemy && canAfford(next.resources.enemy, SHOP_ITEMS.rally_horn.cost)) next = buyShopItem(next, "enemy", "rally_horn");
  if (next.resources.enemy.sigils === 0 && next.resources.enemy.marks > 700 && canAfford(next.resources.enemy, SHOP_ITEMS.sigil_shard.cost)) next = buyShopItem(next, "enemy", "sigil_shard");

  const upgrade = [...next.buildings]
    .filter((building) => building.team === "enemy" && building.level < 3)
    .sort((a, b) => a.level - b.level || b.totalSpawned - a.totalSpawned)
    .find((building) => {
      const cost = costForUpgrade(building);
      return cost ? canAfford(next.resources.enemy, cost) : false;
    });
  if (upgrade && buildingCount(next, "enemy") >= 5 && next.resources.enemy.marks > 260) next = upgradeBuilding(next, "enemy", upgrade.id);

  if (buildingCount(next, "enemy") < BUILDING_CAP) next = aiPlace(next, aiDesiredBuilding(next));
  const production = next.buildings.filter((building) => building.team === "enemy" && BUILDING_SPECS[building.kind].unitKind).length;
  if (production >= 4 && next.elapsed > 70 && !next.syncEnabled.enemy) next = toggleSynchronization(next, "enemy");
  return next;
}

function finishRound(state: GameState, winner: Team, reason: string): GameState {
  const roundWins = { ...state.roundWins, [winner]: state.roundWins[winner] + 1 };
  const matchFinished = roundWins[winner] >= ROUNDS_TO_WIN;
  const status: MatchStatus = matchFinished
    ? (winner === "player" ? "won" : "lost")
    : (winner === "player" ? "round_won" : "round_lost");
  return withEvent({ ...state, roundWins, status }, matchFinished ? `${reason} ${FACTIONS[state.factions[winner]].name} wins the match ${roundWins.player}–${roundWins.enemy}.` : `${reason} Round ${state.round} goes to ${FACTIONS[state.factions[winner]].name}.`);
}

function resolveRound(state: GameState): GameState {
  if (state.keeps.enemy <= 0) return finishRound(state, "player", "The eastern Anchorhold has fallen.");
  if (state.keeps.player <= 0) return finishRound(state, "enemy", "The western Anchorhold has fallen.");
  if (state.elapsed < MATCH_LIMIT) return state;

  const unusedPlayer = state.reprieveUsed.player ? 0 : 1;
  const unusedEnemy = state.reprieveUsed.enemy ? 0 : 1;
  if (unusedPlayer !== unusedEnemy) return finishRound(state, unusedPlayer > unusedEnemy ? "player" : "enemy", "The ledger closed; the unused Reprieve decided the tie.");
  const playerIncome = incomeFor(state, "player");
  const enemyIncome = incomeFor(state, "enemy");
  if (playerIncome !== enemyIncome) return finishRound(state, playerIncome > enemyIncome ? "player" : "enemy", "The ledger closed; stronger recurring income decided the tie.");
  if (state.keeps.player !== state.keeps.enemy) return finishRound(state, state.keeps.player > state.keeps.enemy ? "player" : "enemy", "The ledger closed; the healthier Anchorhold decided the tie.");
  const playerArmy = state.units.filter((unit) => unit.team === "player").reduce((total, unit) => total + unit.hp + unit.shield, 0);
  const enemyArmy = state.units.filter((unit) => unit.team === "enemy").reduce((total, unit) => total + unit.hp + unit.shield, 0);
  return finishRound(state, playerArmy >= enemyArmy ? "player" : "enemy", "The ledger closed; remaining field strength broke the final tie.");
}

function processProduction(state: GameState): GameState {
  let next = state;
  for (const team of ["player", "enemy"] as const) {
    const active = next.buildings.filter((building) => building.team === team && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused);
    if (next.syncEnabled[team]) {
      if (next.syncClock[team] <= 0 && active.length) {
        const ids = new Set(active.map((building) => building.id));
        for (const snapshot of active) {
          const current = next.buildings.find((building) => building.id === snapshot.id);
          if (current) next = spawnUnit(next, current);
        }
        const longest = Math.max(...active.map((building) => productionPeriod(building, next)));
        next = {
          ...next,
          buildings: next.buildings.map((building) => ids.has(building.id) ? { ...building, spawnClock: productionPeriod(building, next) } : building),
          syncClock: { ...next.syncClock, [team]: longest },
        };
      }
    } else {
      const ready = active.filter((building) => building.spawnClock <= 0);
      for (const snapshot of ready) {
        const current = next.buildings.find((building) => building.id === snapshot.id);
        if (!current) continue;
        next = spawnUnit(next, current);
        next = { ...next, buildings: next.buildings.map((building) => building.id === current.id ? { ...building, spawnClock: productionPeriod(building, next) } : building) };
      }
    }
  }
  return next;
}

export function stepGame(input: GameState, dt: number, options: StepGameOptions = {}): GameState {
  if (input.status !== "playing" || !input.started) return input;
  const safeDt = Math.max(0, Math.min(0.2, dt));
  let state: GameState = {
    ...input,
    elapsed: input.elapsed + safeDt,
    totalElapsed: input.totalElapsed + safeDt,
    incomeClock: input.incomeClock - safeDt,
    aiClock: input.aiClock - safeDt,
    keepDefenseClock: input.keepDefenseClock - safeDt,
    syncClock: {
      player: input.syncEnabled.player ? input.syncClock.player - safeDt : input.syncClock.player,
      enemy: input.syncEnabled.enemy ? input.syncClock.enemy - safeDt : input.syncClock.enemy,
    },
    buildings: input.buildings.map((building) => ({
      ...building,
      spawnClock: !building.productionPaused && !input.syncEnabled[building.team] ? building.spawnClock - safeDt : building.spawnClock,
      abilityClock: building.abilityClock - safeDt,
    })),
  };

  if (state.incomeClock <= 0) {
    const playerIncome = incomeFor(state, "player");
    const enemyIncome = incomeFor(state, "enemy");
    state = {
      ...state,
      resources: {
        player: { ...state.resources.player, marks: state.resources.player.marks + playerIncome },
        enemy: { ...state.resources.enemy, marks: state.resources.enemy.marks + enemyIncome },
      },
      incomeClock: state.incomeClock + INCOME_INTERVAL,
      effects: [
        ...state.effects,
        { id: state.nextId, type: "yield", x: KEEP_POSITIONS.player.x, y: KEEP_POSITIONS.player.y, life: 0.8, team: "player", label: `+${playerIncome}` },
        { id: state.nextId + 1, type: "yield", x: KEEP_POSITIONS.enemy.x, y: KEEP_POSITIONS.enemy.y, life: 0.8, team: "enemy", label: `+${enemyIncome}` },
      ],
      nextId: state.nextId + 2,
    };
  }

  if (options.runAi !== false && state.aiClock <= 0) {
    state = runAi(state);
    state = { ...state, aiClock: 4.8 };
  }

  state = processProduction(state);
  state = applyStructureEffects(state);
  state = simulateCombat(state, safeDt);

  if (state.keepDefenseClock <= 0) {
    state = applyKeepDefense(state);
    state = { ...state, keepDefenseClock: 1.15 };
  }

  if (options.runAi !== false && shouldBotCastReprieve(state)) state = castReprieve(state, "enemy");

  return resolveRound(state);
}

export function matchReport(state: GameState, playtestAnswer?: string): string {
  const player = FACTIONS[state.factions.player].name;
  const enemy = FACTIONS[state.factions.enemy].name;
  const result = state.status === "won" ? `${player} victory` : state.status === "lost" ? `${enemy} victory` : state.status.replace("_", " ");
  return [
    "KEEPSTORM PLAYTEST ALPHA — MATCH REPORT",
    `Result: ${result}`,
    `Rounds: ${state.roundWins.player} / ${state.roundWins.enemy}`,
    `Total duration: ${Math.floor(state.totalElapsed / 60)}:${String(Math.floor(state.totalElapsed % 60)).padStart(2, "0")}`,
    `Factions: ${player} / ${enemy}`,
    `Anchorholds: ${Math.ceil(state.keeps.player)} / ${Math.ceil(state.keeps.enemy)}`,
    `Structures placed: ${state.stats.buildingsPlaced.player} / ${state.stats.buildingsPlaced.enemy}`,
    `Upgrades purchased: ${state.stats.upgrades.player} / ${state.stats.upgrades.enemy}`,
    `Cohorts raised: ${state.stats.unitsSpawned.player} / ${state.stats.unitsSpawned.enemy}`,
    `Bounty earned: ${state.stats.bountyEarned.player} / ${state.stats.bountyEarned.enemy}`,
    `Items commissioned: ${state.stats.itemsBought.player} / ${state.stats.itemsBought.enemy}`,
    `Reprieve used this round: ${state.reprieveUsed.player ? "yes" : "no"} / ${state.reprieveUsed.enemy ? "yes" : "no"}`,
    `What felt decisive: ${playtestAnswer || "not answered"}`,
    "Build: multiplayer-alpha-0.3.0",
  ].join("\n");
}
