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
export const MATCH_LIMIT = 30 * 60;
export const REPRIEVE_READY_AT = 75;
export const BUILDING_CAP = 30;
export const UNIT_CAP = 160;
export const INCOME_INTERVAL = 10;
export const BASE_INCOME = 5;
export const TAX_BRACKET_SIZE = 25;
export const MAX_INCOME_TAX = 0.8;
export const TIMBER_RETURN_LIMIT = 300;
export const ECONOMY_BUILDING_CAP = 5;
export const ROUNDS_TO_WIN = 2;
export const KEEP_WARDEN_DAMAGE = 34;
export const KEEP_WARDEN_RANGE = 230;
export const KEEP_WARDEN_SPEED = 140;
export const KEEP_WARDEN_ATTACK_EVERY = 0.9;
export const KEEP_WARDEN_ATLAS_INDEX = 13;
export const GAME_VERSION = "0.6.6";
export const GAME_BUILD = `keep-warden-alpha-${GAME_VERSION}`;

const AI_OPENING_DELAY = 0.65;
const AI_ACTION_INTERVAL = 1.35;
const AI_MAX_PLACEMENTS_PER_TURN = 3;
const AI_BASELINE_PRODUCTION = 5;
const AI_SPECIAL_START = 5;
const AI_LEGENDARY_START = 8;
const AI_RALLY_HORN_START = 10;
const AI_TREASURY_START = 12;

export type Team = "player" | "enemy";
export type CommanderId = Team | "player_ally" | "enemy_ally";
export type MatchMode = "solo" | "1v1" | "2v2";
export type CommanderRecord<T> = Record<CommanderId, T>;
export type MatchStatus = "playing" | "round_won" | "round_lost" | "won" | "lost";

export const COMMANDER_IDS: readonly CommanderId[] = ["player", "player_ally", "enemy", "enemy_ally"];

export function teamForCommander(commander: CommanderId): Team {
  return commander === "player" || commander === "player_ally" ? "player" : "enemy";
}

export function commanderLabel(commander: CommanderId): string {
  const side = teamForCommander(commander) === "player" ? "West" : "East";
  return `${side} ${commander.endsWith("_ally") ? "South" : "North"}`;
}

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
  commander?: CommanderId;
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
  lastDamagedBy?: CommanderId;
}

export interface Unit {
  id: number;
  team: Team;
  commander?: CommanderId;
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
  poisonTeam?: CommanderId;
  slowTimer: number;
  stunTimer: number;
  lastDamagedBy?: CommanderId;
}

export interface KeepWarden {
  commander: CommanderId;
  team: Team;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  cooldown: number;
  attackFlash: number;
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
  buildingsPlaced: CommanderRecord<number>;
  buildingsLost: CommanderRecord<number>;
  unitsSpawned: CommanderRecord<number>;
  unitsLost: CommanderRecord<number>;
  keepDamage: CommanderRecord<number>;
  upgrades: CommanderRecord<number>;
  itemsBought: CommanderRecord<number>;
  bountyEarned: CommanderRecord<number>;
}

export interface GameState {
  matchMode: MatchMode;
  activeCommanders: CommanderId[];
  status: MatchStatus;
  started: boolean;
  elapsed: number;
  totalElapsed: number;
  round: number;
  roundWins: Record<Team, number>;
  factions: CommanderRecord<FactionId>;
  resources: CommanderRecord<ResourceStock>;
  keeps: Record<Team, number>;
  buildings: Building[];
  units: Unit[];
  keepWardens: CommanderRecord<KeepWarden>;
  effects: Effect[];
  incomeClock: number;
  aiClock: number;
  keepDefenseClock: number;
  syncEnabled: CommanderRecord<boolean>;
  syncClock: CommanderRecord<number>;
  reprieveUsed: CommanderRecord<boolean>;
  rallyHorn: CommanderRecord<boolean>;
  keepArmorUntil: CommanderRecord<number>;
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
    { minX: 8, maxX: 20, minY: 3, maxY: 11 },
    { minX: 8, maxX: 20, minY: 15, maxY: 23 },
  ],
  enemy: [
    { minX: 79, maxX: 91, minY: 3, maxY: 11 },
    { minX: 79, maxX: 91, minY: 15, maxY: 23 },
  ],
};

export function buildAreasForCommander(state: Pick<GameState, "matchMode">, commander: CommanderId): readonly GridRect[] {
  const team = teamForCommander(commander);
  if (state.matchMode !== "2v2") return BUILD_AREAS[team];
  return [BUILD_AREAS[team][commander.endsWith("_ally") ? 1 : 0]];
}

export function keepWardenBoundsForCommander(state: Pick<GameState, "matchMode">, commander: CommanderId): GridRect {
  const team = teamForCommander(commander);
  const areas = buildAreasForCommander(state, commander);
  const minY = state.matchMode === "2v2" ? Math.max(NAV_ZONES[team].minY, areas[0].minY - 1) : NAV_ZONES[team].minY;
  const maxY = state.matchMode === "2v2" ? Math.min(NAV_ZONES[team].maxY, areas[0].maxY + 1) : NAV_ZONES[team].maxY;
  return { minX: NAV_ZONES[team].minX, maxX: NAV_ZONES[team].maxX, minY, maxY };
}

function keepWardenWorldBounds(state: Pick<GameState, "matchMode">, commander: CommanderId): { minX: number; maxX: number; minY: number; maxY: number } {
  const bounds = keepWardenBoundsForCommander(state, commander);
  const padding = 12;
  return {
    minX: bounds.minX * CELL_SIZE + padding,
    maxX: (bounds.maxX + 1) * CELL_SIZE - padding,
    minY: bounds.minY * CELL_SIZE + padding,
    maxY: (bounds.maxY + 1) * CELL_SIZE - padding,
  };
}

export function validateKeepWardenDestination(state: Pick<GameState, "matchMode" | "activeCommanders" | "status">, commander: CommanderId, x: number, y: number): PlacementValidation {
  if (state.status !== "playing") return { valid: false, reason: "The round is over." };
  if (!activeCommandersFor(state).includes(commander)) return { valid: false, reason: "That Keep Warden is not active in this match." };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { valid: false, reason: "Choose a point inside your base." };
  const bounds = keepWardenWorldBounds(state, commander);
  const valid = x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  return { valid, reason: valid ? "Keep Warden moving to defend that position." : "Your Keep Warden cannot leave its assigned base yard." };
}

export const BUILD_ZONES: Record<Team, GridRect> = {
  player: { minX: 8, maxX: 20, minY: 3, maxY: 23 },
  enemy: { minX: 79, maxX: 91, minY: 3, maxY: 23 },
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

export const STARTING_RESOURCES: ResourceStock = { marks: 400, timber: 125, sigils: 1 };
const RESOURCE_KEYS: Array<keyof ResourceStock> = ["marks", "timber", "sigils"];

function commanderRecord<T>(factory: (commander: CommanderId) => T): CommanderRecord<T> {
  return Object.fromEntries(COMMANDER_IDS.map((commander) => [commander, factory(commander)])) as CommanderRecord<T>;
}

function keepWardenHomePoint(matchMode: MatchMode, commander: CommanderId): Point {
  const team = teamForCommander(commander);
  const y = matchMode === "2v2" ? (commander.endsWith("_ally") ? 624 : 240) : 448;
  return { x: team === "player" ? 224 : WORLD_WIDTH - 224, y };
}

function createKeepWarden(matchMode: MatchMode, commander: CommanderId): KeepWarden {
  const home = keepWardenHomePoint(matchMode, commander);
  return {
    commander,
    team: teamForCommander(commander),
    x: home.x,
    y: home.y,
    targetX: home.x,
    targetY: home.y,
    cooldown: 0,
    attackFlash: 0,
  };
}

function keepWardenRecordForState(state: Pick<GameState, "matchMode" | "keepWardens">): CommanderRecord<KeepWarden> {
  return commanderRecord((commander) => keepWardenForCommander(state, commander));
}

export function keepWardenForCommander(state: Pick<GameState, "matchMode" | "keepWardens">, commander: CommanderId): KeepWarden {
  const fallback = createKeepWarden(state.matchMode, commander);
  const current = state.keepWardens?.[commander] ?? fallback;
  return {
    commander,
    team: teamForCommander(commander),
    x: current.x,
    y: current.y,
    targetX: current.targetX,
    targetY: current.targetY,
    cooldown: current.cooldown,
    attackFlash: current.attackFlash,
  };
}

export function activeKeepWardens(state: Pick<GameState, "matchMode" | "activeCommanders" | "keepWardens">): KeepWarden[] {
  return activeCommandersFor(state).map((commander) => keepWardenForCommander(state, commander));
}

export function activeCommandersFor(state: Pick<GameState, "activeCommanders">): CommanderId[] {
  return state.activeCommanders?.length ? state.activeCommanders : ["player", "enemy"];
}

export function commanderForBuilding(building: Pick<Building, "team" | "commander">): CommanderId {
  return building.commander ?? building.team;
}

export function commanderForUnit(unit: Pick<Unit, "team" | "commander">): CommanderId {
  return unit.commander ?? unit.team;
}

export function commandersForTeam(state: Pick<GameState, "activeCommanders">, team: Team): CommanderId[] {
  return activeCommandersFor(state).filter((commander) => teamForCommander(commander) === team);
}

function enemyOf(team: Team): Team {
  return team === "player" ? "enemy" : "player";
}

function emptyStats(): MatchStats {
  return {
    buildingsPlaced: commanderRecord(() => 0),
    buildingsLost: commanderRecord(() => 0),
    unitsSpawned: commanderRecord(() => 0),
    unitsLost: commanderRecord(() => 0),
    keepDamage: commanderRecord(() => 0),
    upgrades: commanderRecord(() => 0),
    itemsBought: commanderRecord(() => 0),
    bountyEarned: commanderRecord(() => 0),
  };
}

function chooseEnemyFaction(playerFaction: FactionId): FactionId {
  const index = FACTION_IDS.indexOf(playerFaction);
  return FACTION_IDS[(index + 1) % FACTION_IDS.length];
}

function createGameState(matchMode: MatchMode, chosenFactions: Partial<CommanderRecord<FactionId>>): GameState {
  const playerFaction = chosenFactions.player ?? "daybreak";
  const enemyFaction = chosenFactions.enemy ?? chooseEnemyFaction(playerFaction);
  const factions = commanderRecord((commander) => chosenFactions[commander]
    ?? (teamForCommander(commander) === "player" ? playerFaction : enemyFaction));
  const activeCommanders: CommanderId[] = matchMode === "2v2"
    ? ["player", "player_ally", "enemy", "enemy_ally"]
    : ["player", "enemy"];
  return {
    matchMode,
    activeCommanders,
    status: "playing",
    started: false,
    elapsed: 0,
    totalElapsed: 0,
    round: 1,
    roundWins: { player: 0, enemy: 0 },
    factions,
    resources: commanderRecord(() => ({ ...STARTING_RESOURCES })),
    keeps: { player: KEEP_MAX_HP, enemy: KEEP_MAX_HP },
    buildings: [],
    units: [],
    keepWardens: commanderRecord((commander) => createKeepWarden(matchMode, commander)),
    effects: [],
    incomeClock: INCOME_INTERVAL,
    aiClock: AI_OPENING_DELAY,
    keepDefenseClock: 1.15,
    syncEnabled: commanderRecord(() => false),
    syncClock: commanderRecord(() => 12),
    reprieveUsed: commanderRecord(() => false),
    rallyHorn: commanderRecord(() => false),
    keepArmorUntil: commanderRecord(() => 0),
    nextId: 1,
    event: "Choose a structure to begin. Tap empty base ground to reposition your Keep Warden.",
    eventSerial: 1,
    stats: emptyStats(),
  };
}

export function createInitialState(playerFaction: FactionId = "daybreak", enemyFaction: FactionId = chooseEnemyFaction(playerFaction)): GameState {
  return createGameState("solo", { player: playerFaction, enemy: enemyFaction });
}

export function createMultiplayerState(mode: "1v1" | "2v2", factions: Partial<CommanderRecord<FactionId>>): GameState {
  return createGameState(mode, factions);
}

export function startNextRound(state: GameState): GameState {
  if (state.status !== "round_won" && state.status !== "round_lost") return state;
  return {
    ...state,
    status: "playing",
    started: false,
    elapsed: 0,
    round: state.round + 1,
    resources: commanderRecord(() => ({ ...STARTING_RESOURCES })),
    keeps: { player: KEEP_MAX_HP, enemy: KEEP_MAX_HP },
    buildings: [],
    units: [],
    keepWardens: commanderRecord((commander) => createKeepWarden(state.matchMode, commander)),
    effects: [],
    incomeClock: INCOME_INTERVAL,
    aiClock: AI_OPENING_DELAY,
    keepDefenseClock: 1.15,
    syncEnabled: commanderRecord(() => false),
    syncClock: commanderRecord(() => 12),
    reprieveUsed: commanderRecord(() => false),
    rallyHorn: commanderRecord(() => false),
    keepArmorUntil: commanderRecord(() => 0),
    event: `Round ${state.round + 1}. Rebuild your host; every Keep Warden has returned to guard its base yard.`,
    eventSerial: state.eventSerial + 1,
  };
}

export function factionBuildings(faction: FactionId, category?: BuildingCategory): BuildingKind[] {
  return FACTIONS[faction].buildings.filter((kind) => !category || BUILDING_SPECS[kind].category === category);
}

export function buildingCount(state: GameState, team: Team, kind?: BuildingKind): number {
  return state.buildings.filter((building) => building.team === team && (!kind || building.kind === kind)).length;
}

export function commanderBuildingCount(state: GameState, commander: CommanderId, kind?: BuildingKind): number {
  return state.buildings.filter((building) => commanderForBuilding(building) === commander && (!kind || building.kind === kind)).length;
}

export function unitCount(state: GameState, team: Team): number {
  return state.units.filter((unit) => unit.team === team).length;
}

export function commanderUnitCount(state: GameState, commander: CommanderId): number {
  return state.units.filter((unit) => commanderForUnit(unit) === commander).length;
}

function marksInvestedThroughLevel(kind: BuildingKind, level: 1 | 2 | 3): number {
  const spec = BUILDING_SPECS[kind];
  return spec.cost.marks
    + (level >= 2 ? spec.upgradeCost.marks : 0)
    + (level >= 3 ? spec.legendaryCost.marks : 0);
}

export function marksInvestedInBuilding(building: Pick<Building, "kind" | "level">): number {
  return marksInvestedThroughLevel(building.kind, building.level);
}

export function buildingIncomeRate(kind: BuildingKind): number {
  const spec = BUILDING_SPECS[kind];
  if (spec.category === "tower") return 0.008;
  if (spec.category === "special") return spec.effect === "tempest" ? 0.009 : 0.012;
  if (spec.category === "economy") return 0.012;
  return spec.unitKind && UNIT_SPECS[spec.unitKind].role === "siege" ? 0.018 : 0.02;
}

export function buildingIncomeFor(building: Pick<Building, "kind" | "level">): number {
  return marksInvestedInBuilding(building) * buildingIncomeRate(building.kind);
}

export function economyMultiplier(buildingCount: number): number {
  let multiplier = 1;
  let nextBonus = 0.25;
  for (let index = 0; index < Math.max(0, buildingCount); index += 1) {
    multiplier += nextBonus;
    nextBonus *= 0.85;
  }
  return multiplier;
}

export function incomeAfterProgressiveTax(grossIncome: number, bracketSize = TAX_BRACKET_SIZE): number {
  let remaining = Math.max(0, grossIncome);
  let net = 0;
  for (let bracket = 0; bracket < 8 && remaining > 0; bracket += 1) {
    const amount = Math.min(bracketSize, remaining);
    net += amount * (1 - bracket * 0.1);
    remaining -= amount;
  }
  if (remaining > 0) net += remaining * (1 - MAX_INCOME_TAX);
  return net;
}

export interface IncomeBreakdown {
  base: number;
  buildings: number;
  economyBuildings: number;
  multiplier: number;
  gross: number;
  net: number;
  paid: number;
  effectiveTaxRate: number;
}

export function incomeBreakdownForCommander(state: GameState, commander: CommanderId): IncomeBreakdown {
  const buildings = state.buildings.filter((building) => commanderForBuilding(building) === commander);
  const buildingIncome = buildings.reduce((total, building) => total + buildingIncomeFor(building), 0);
  const economyBuildings = buildings.filter((building) => BUILDING_SPECS[building.kind].category === "economy").length;
  const multiplier = economyMultiplier(economyBuildings);
  const gross = (BASE_INCOME + buildingIncome) * multiplier;
  const net = incomeAfterProgressiveTax(gross);
  return {
    base: BASE_INCOME,
    buildings: buildingIncome,
    economyBuildings,
    multiplier,
    gross,
    net,
    paid: Math.round(net),
    effectiveTaxRate: gross > 0 ? 1 - net / gross : 0,
  };
}

export function incomeForCommander(state: GameState, commander: CommanderId): number {
  return incomeBreakdownForCommander(state, commander).paid;
}

export function incomeFor(state: GameState, team: Team): number {
  return commandersForTeam(state, team).reduce((total, commander) => total + incomeForCommander(state, commander), 0);
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
  if (BUILDING_SPECS[building.kind].category === "economy") return null;
  if (building.level === 1) return BUILDING_SPECS[building.kind].upgradeCost;
  if (building.level === 2) return BUILDING_SPECS[building.kind].legendaryCost;
  return null;
}

export function timberReturnFor(kind: BuildingKind, cost: ResourceCost, purchasedLevel: 1 | 2 | 3): number {
  const spec = BUILDING_SPECS[kind];
  if (spec.category !== "troop") return 0;
  const rate = purchasedLevel === 3
    ? 0.25
    : spec.unitKind && UNIT_SPECS[spec.unitKind].role === "siege" ? 0.75 : 1;
  return Math.min(TIMBER_RETURN_LIMIT, Math.round(cost.marks * rate));
}

export function unitBountyFor(kind: UnitKind, level: 1 | 2 | 3): number {
  const producer = Object.values(BUILDING_SPECS).find((spec) => spec.unitKind === kind);
  if (!producer) return UNIT_SPECS[kind].bounty;
  const invested = producer.cost.marks
    + (level >= 2 ? producer.upgradeCost.marks : 0)
    + (level >= 3 ? producer.legendaryCost.marks : 0);
  return Math.max(1, Math.round(invested * 0.035));
}

export function buildingBountyFor(building: Pick<Building, "kind" | "level">): number {
  return Math.max(1, Math.round(marksInvestedInBuilding(building) * 0.2));
}

export function damageAgainstArmor(damageType: DamageType, armorType: ArmorType): number {
  return DAMAGE_MATRIX[damageType][armorType];
}

export function damageMultiplier(attacker: UnitKind, defender: UnitKind): number {
  return damageAgainstArmor(UNIT_SPECS[attacker].damageType, UNIT_SPECS[defender].armorType);
}

export function reprieveReady(state: GameState, commander: CommanderId): boolean {
  return state.status === "playing" && state.elapsed >= REPRIEVE_READY_AT && !state.reprieveUsed[commander];
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

export function validatePlacement(state: GameState, commander: CommanderId, kind: BuildingKind, gridX: number, gridY: number): PlacementValidation {
  const team = teamForCommander(commander);
  const spec = BUILDING_SPECS[kind];
  if (state.status !== "playing") return { valid: false, reason: "The round is over." };
  if (spec.faction !== state.factions[commander]) return { valid: false, reason: "That structure belongs to another faction." };
  if (!canAfford(state.resources[commander], spec.cost)) return { valid: false, reason: "You cannot afford that Marks, Timber, or Sigil cost." };
  if (commanderBuildingCount(state, commander) >= BUILDING_CAP) return { valid: false, reason: "Your construction yard is full." };
  if (spec.category === "economy" && commanderBuildingCount(state, commander, kind) >= ECONOMY_BUILDING_CAP) {
    return { valid: false, reason: "Your treasury network has reached its five-structure limit." };
  }

  const insideBuildArea = buildAreasForCommander(state, commander).some((area) => (
    gridX >= area.minX
    && gridY >= area.minY
    && gridX + spec.width - 1 <= area.maxX
    && gridY + spec.height - 1 <= area.maxY
  ));
  if (!insideBuildArea) return { valid: false, reason: "That footprint leaves your construction yard." };

  const candidate: Building = {
    id: -1,
    team,
    commander,
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

export function moveKeepWarden(state: GameState, commander: CommanderId, x: number, y: number): GameState {
  const validation = validateKeepWardenDestination(state, commander, x, y);
  if (!validation.valid) return teamForCommander(commander) === "player" ? withEvent(state, validation.reason) : state;
  const keepWardens = keepWardenRecordForState(state);
  keepWardens[commander] = { ...keepWardens[commander], targetX: x, targetY: y };
  return teamForCommander(commander) === "player"
    ? withEvent({ ...state, keepWardens }, "Keep Warden repositioning inside the base yard.")
    : { ...state, keepWardens };
}

export function placeBuilding(state: GameState, commander: CommanderId, kind: BuildingKind, gridX: number, gridY: number): GameState {
  const team = teamForCommander(commander);
  const validation = validatePlacement(state, commander, kind, gridX, gridY);
  if (!validation.valid) return team === "player" ? withEvent(state, validation.reason) : state;
  const spec = BUILDING_SPECS[kind];
  const building: Building = {
    id: state.nextId,
    team,
    commander,
    kind,
    gridX,
    gridY,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    level: 1,
    spawnClock: 0,
    abilityClock: spec.category === "special" ? 3.4 : spec.category === "tower" ? 1.2 : 0,
    productionPaused: false,
    totalSpawned: 0,
  };
  building.spawnClock = spec.spawnEvery ? productionPeriod(building, state) : 0;
  const resources = spend(state.resources[commander], spec.cost);
  const timberReturned = timberReturnFor(kind, spec.cost, 1);
  resources.timber += timberReturned;
  const next: GameState = {
    ...state,
    started: true,
    resources: { ...state.resources, [commander]: resources },
    buildings: [...state.buildings, building],
    nextId: state.nextId + 1,
    stats: {
      ...state.stats,
      buildingsPlaced: { ...state.stats.buildingsPlaced, [commander]: state.stats.buildingsPlaced[commander] + 1 },
    },
  };
  if (team === "enemy") return next;
  const timberText = timberReturned ? ` It returned ${timberReturned} Timber to your stores.` : "";
  const actionText = spec.unitKind ? `${spec.cohort} will deploy automatically.` : spec.category === "economy" ? "Your treasury now amplifies every income payment." : "Its battlefield effect is now active.";
  return withEvent(next, `${spec.name} placed at ${gridX}, ${gridY}. ${actionText}${timberText}`);
}

export function upgradeBuilding(state: GameState, commander: CommanderId, buildingId: number): GameState {
  const team = teamForCommander(commander);
  const building = state.buildings.find((candidate) => candidate.id === buildingId && commanderForBuilding(candidate) === commander);
  if (!building) return state;
  const cost = costForUpgrade(building);
  if (!cost) return team === "player" ? withEvent(state, "That structure has already reached legendary rank.") : state;
  if (!canAfford(state.resources[commander], cost)) return team === "player" ? withEvent(state, "The upgrade needs more Marks, Timber, or a Sigil.") : state;
  const nextLevel = (building.level + 1) as 2 | 3;
  const hpScale = nextLevel === 2 ? 1.28 : 1.68;
  const nextMaxHp = Math.round(BUILDING_SPECS[building.kind].maxHp * hpScale);
  const hpGain = nextMaxHp - building.maxHp;
  const resources = spend(state.resources[commander], cost);
  const timberReturned = timberReturnFor(building.kind, cost, nextLevel);
  resources.timber += timberReturned;
  const center = buildingCenter(building);
  const next: GameState = {
    ...state,
    resources: { ...state.resources, [commander]: resources },
    buildings: state.buildings.map((candidate) => candidate.id === buildingId ? {
      ...candidate,
      level: nextLevel,
      hp: Math.min(nextMaxHp, candidate.hp + hpGain),
      maxHp: nextMaxHp,
      spawnClock: Math.min(candidate.spawnClock, productionPeriod(candidate, state)),
    } : candidate),
    effects: [...state.effects, { id: state.nextId, type: "upgrade", x: center.x, y: center.y, life: 1.2, team, label: nextLevel === 3 ? "LEGENDARY" : "VETERAN" }],
    nextId: state.nextId + 1,
    stats: { ...state.stats, upgrades: { ...state.stats.upgrades, [commander]: state.stats.upgrades[commander] + 1 } },
  };
  const timberText = timberReturned ? ` ${timberReturned} Timber returned to your stores.` : "";
  return team === "player" ? withEvent(next, `${BUILDING_SPECS[building.kind].name} is now ${nextLevel === 3 ? "Legendary" : "Veteran"}.${timberText}`) : next;
}

export function toggleProduction(state: GameState, commander: CommanderId, buildingId: number): GameState {
  const team = teamForCommander(commander);
  const building = state.buildings.find((candidate) => candidate.id === buildingId && commanderForBuilding(candidate) === commander);
  if (!building || !BUILDING_SPECS[building.kind].unitKind) return state;
  const paused = !building.productionPaused;
  const next = {
    ...state,
    buildings: state.buildings.map((candidate) => candidate.id === buildingId ? { ...candidate, productionPaused: paused } : candidate),
  };
  return team === "player" ? withEvent(next, `${BUILDING_SPECS[building.kind].name} production ${paused ? "held for manual synchronization" : "resumed"}.`) : next;
}

export function toggleSynchronization(state: GameState, commander: CommanderId): GameState {
  const team = teamForCommander(commander);
  if (state.status !== "playing") return state;
  const enabled = !state.syncEnabled[commander];
  const production = state.buildings.filter((building) => commanderForBuilding(building) === commander && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused);
  const longest = Math.max(4, ...production.map((building) => productionPeriod(building, state)));
  const next = {
    ...state,
    syncEnabled: { ...state.syncEnabled, [commander]: enabled },
    syncClock: { ...state.syncClock, [commander]: enabled ? Math.min(state.syncClock[commander], longest) : longest },
  };
  return team === "player" ? withEvent(next, enabled
    ? "Rally Sync enabled. Active Foundries will deploy together at the slowest cadence."
    : "Rally Sync disabled. Each Foundry has returned to its own cadence.") : next;
}

export function buyShopItem(state: GameState, commander: CommanderId, item: ShopItemKind): GameState {
  const team = teamForCommander(commander);
  if (state.status !== "playing") return state;
  const spec = SHOP_ITEMS[item];
  if (item === "rally_horn" && state.rallyHorn[commander]) return team === "player" ? withEvent(state, "Your Rally Horn is already sounding.") : state;
  if (!canAfford(state.resources[commander], spec.cost)) return team === "player" ? withEvent(state, "That commission needs more Marks or Timber.") : state;

  let resources = spend(state.resources[commander], spec.cost);
  const keeps = { ...state.keeps };
  let units = state.units.map((unit) => ({ ...unit }));
  let buildings = state.buildings.map((building) => ({ ...building }));
  const rallyHorn = { ...state.rallyHorn };
  const keepArmorUntil = { ...state.keepArmorUntil };

  if (item === "rally_horn") rallyHorn[commander] = true;
  if (item === "ember_flask") {
    units = units.map((unit) => unit.team !== team && onTeamHalf(unit.x, team) ? { ...unit, hp: unit.hp - 150, lastDamagedBy: commander } : unit);
  }
  if (item === "iron_writ") {
    keeps[team] = Math.min(KEEP_MAX_HP, keeps[team] + 260);
    keepArmorUntil[commander] = state.elapsed + 25;
  }
  if (item === "tempo_bell") {
    buildings = buildings.map((building) => commanderForBuilding(building) === commander && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused ? { ...building, spawnClock: 0 } : building);
  }
  if (item === "sigil_shard") resources = { ...resources, sigils: resources.sigils + 1 };

  const keep = KEEP_POSITIONS[team];
  const next: GameState = {
    ...state,
    resources: { ...state.resources, [commander]: resources },
    keeps,
    units,
    buildings,
    rallyHorn,
    keepArmorUntil,
    syncClock: item === "tempo_bell" ? { ...state.syncClock, [commander]: 0 } : state.syncClock,
    effects: [...state.effects, { id: state.nextId, type: "item", x: keep.x, y: keep.y, life: 1.2, team, label: spec.name.toUpperCase() }],
    nextId: state.nextId + 1,
    stats: { ...state.stats, itemsBought: { ...state.stats.itemsBought, [commander]: state.stats.itemsBought[commander] + 1 } },
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
  const base = 15 + marksInvestedInBuilding(building) / 20;
  const factionFactor = state.factions[commanderForBuilding(building)] === "stormglass" ? 0.92 : 1;
  return base * factionFactor;
}

function spawnUnit(state: GameState, building: Building): GameState {
  if (state.units.length >= UNIT_CAP * (state.matchMode === "2v2" ? 2 : 1)) return state;
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
    commander: commanderForBuilding(building),
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
    stats: {
      ...state.stats,
      unitsSpawned: {
        ...state.stats.unitsSpawned,
        [commanderForBuilding(building)]: (state.stats.unitsSpawned[commanderForBuilding(building)] ?? 0) + 1,
      },
    },
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildingCenter(building: Pick<Building, "gridX" | "gridY" | "kind">): Point {
  const spec = BUILDING_SPECS[building.kind];
  return { x: (building.gridX + spec.width / 2) * CELL_SIZE, y: (building.gridY + spec.height / 2) * CELL_SIZE };
}

function moveToward(mover: Point, target: Point, amount: number): void {
  const dx = target.x - mover.x;
  const dy = target.y - mover.y;
  const length = Math.hypot(dx, dy);
  if (length <= amount || length === 0) { mover.x = target.x; mover.y = target.y; return; }
  mover.x += dx / length * amount;
  mover.y += dy / length * amount;
}

function clampKeepWardenPoint(state: Pick<GameState, "matchMode">, commander: CommanderId, point: Point): Point {
  const bounds = keepWardenWorldBounds(state, commander);
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y)),
  };
}

function squaredDistanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projectedX = start.x + dx * projection;
  const projectedY = start.y + dy * projection;
  return (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2;
}

function rejoinForwardPath(unit: Unit): void {
  if (!unit.path.length) return;
  if (unit.pathIndex >= unit.path.length) {
    unit.pathIndex = unit.path.length - 1;
    return;
  }
  if (unit.pathIndex <= 0 || unit.path.length < 2) return;

  let bestEndIndex = unit.pathIndex;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  for (let segmentIndex = unit.pathIndex - 1; segmentIndex < unit.path.length - 1; segmentIndex += 1) {
    const distanceSquared = squaredDistanceToSegment(unit, unit.path[segmentIndex], unit.path[segmentIndex + 1]);
    if (distanceSquared < bestDistanceSquared - .01 || (Math.abs(distanceSquared - bestDistanceSquared) <= .01 && segmentIndex + 1 > bestEndIndex)) {
      bestDistanceSquared = distanceSquared;
      bestEndIndex = segmentIndex + 1;
    }
  }
  unit.pathIndex = Math.max(unit.pathIndex, bestEndIndex);
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

function dealUnitDamage(target: Unit, raw: number, damageType: DamageType, attackerCommander: CommanderId, units: Unit[]): number {
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
  target.lastDamagedBy = attackerCommander;
  return amount;
}

function attackSpeed(unit: Unit, units: Unit[], state: GameState): number {
  const commander = commanderForUnit(unit);
  let speed = state.rallyHorn[commander] ? 1.12 : 1;
  if (state.factions[commander] === "stormglass") speed *= 1.08;
  const hasted = units.some((ally) => ally.team === unit.team && ally.hp > 0 && UNIT_SPECS[ally.kind].ability === "haste" && distance(ally, unit) <= (UNIT_SPECS[ally.kind].abilityRadius ?? 110));
  if (hasted) speed *= 1.16;
  return speed;
}

function simulateCombat(state: GameState, dt: number): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const buildings = state.buildings.map((building) => ({ ...building }));
  const keepWardens = keepWardenRecordForState(state);
  const keeps = { ...state.keeps };
  const resources = commanderRecord((commander) => ({ ...(state.resources[commander] ?? STARTING_RESOURCES) }));
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
    if (state.factions[commanderForUnit(unit)] === "briarcrown") unit.hp = Math.min(unit.maxHp, unit.hp + 2.2 * dt * unitScale(unit.level));
    if (UNIT_SPECS[unit.kind].ability === "regrowth") unit.hp = Math.min(unit.maxHp, unit.hp + (UNIT_SPECS[unit.kind].abilityPower ?? 5) * dt);
    unit.cooldown = Math.max(0, unit.cooldown - dt * attackSpeed(unit, units, state));
  }

  for (const commander of activeCommandersFor(state)) {
    const keepWarden = keepWardens[commander];
    keepWarden.attackFlash = Math.max(0, keepWarden.attackFlash - dt);
    keepWarden.cooldown = Math.max(0, keepWarden.cooldown - dt);

    if (state.matchMode === "solo" && commander === "enemy") {
      const invaders = units
        .filter((unit) => unit.team === "player" && unit.hp > 0 && onTeamHalf(unit.x, "enemy"))
        .sort((left, right) => distance(left, KEEP_POSITIONS.enemy) - distance(right, KEEP_POSITIONS.enemy));
      const target = invaders[0] ?? keepWardenHomePoint(state.matchMode, commander);
      const guardedTarget = clampKeepWardenPoint(state, commander, target);
      keepWarden.targetX = guardedTarget.x;
      keepWarden.targetY = guardedTarget.y;
    }

    const guardedTarget = clampKeepWardenPoint(state, commander, { x: keepWarden.targetX, y: keepWarden.targetY });
    keepWarden.targetX = guardedTarget.x;
    keepWarden.targetY = guardedTarget.y;
    moveToward(keepWarden, guardedTarget, KEEP_WARDEN_SPEED * dt);

    const eligible = units.filter((unit) => unit.team !== keepWarden.team && unit.hp > 0);
    const nearest = eligible.reduce<Unit | null>((current, candidate) => !current || distance(keepWarden, candidate) < distance(keepWarden, current) ? candidate : current, null);
    if (nearest && distance(keepWarden, nearest) <= KEEP_WARDEN_RANGE && keepWarden.cooldown <= 0) {
      dealUnitDamage(nearest, KEEP_WARDEN_DAMAGE, "Arrow", commander, units);
      keepWarden.cooldown = KEEP_WARDEN_ATTACK_EVERY;
      keepWarden.attackFlash = 0.22;
      addEffect(effects, nextId, { type: "hit", x: keepWarden.x, y: keepWarden.y, x2: nearest.x, y2: nearest.y, life: 0.22, team: keepWarden.team });
    }
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
        const dealt = dealUnitDamage(nearestUnit, baseDamage, spec.damageType, commanderForUnit(unit), units);
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: nearestUnit.x, y2: nearestUnit.y, life: 0.22, team: unit.team });

        if (spec.ability === "chain") {
          const chained = eligible.find((candidate) => candidate.id !== nearestUnit.id && distance(candidate, nearestUnit) <= (spec.abilityRadius ?? 90));
          if (chained) dealUnitDamage(chained, baseDamage * (spec.abilityPower ?? 0.38), spec.damageType, commanderForUnit(unit), units);
        }
        if (spec.ability === "splash") {
          for (const target of eligible) if (target.id !== nearestUnit.id && distance(target, nearestUnit) <= (spec.abilityRadius ?? 80)) {
            dealUnitDamage(target, baseDamage * (spec.abilityPower ?? 0.4), spec.damageType, commanderForUnit(unit), units);
          }
        }
        if (spec.ability === "poison") {
          nearestUnit.poisonTimer = 4;
          nearestUnit.poisonDps = (spec.abilityPower ?? 7) * unitScale(unit.level);
          nearestUnit.poisonTeam = commanderForUnit(unit);
        }
        if (spec.ability === "slow") nearestUnit.slowTimer = 3.5;
        if (spec.ability === "stun" && (unit.id + nearestUnit.id + Math.floor(state.elapsed)) % 5 === 0) nearestUnit.stunTimer = 0.75;
        if (spec.ability === "lifedrain") unit.hp = Math.min(unit.maxHp, unit.hp + dealt * (spec.abilityPower ?? 0.22));
      }
      continue;
    }

    const moveFactor = (unit.slowTimer > 0 ? 0.68 : 1) * (state.rallyHorn[commanderForUnit(unit)] ? 1.12 : 1);
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
          nearestBuilding.lastDamagedBy = commanderForUnit(unit);
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
        if (commandersForTeam(state, opposingTeam).some((commander) => state.keepArmorUntil[commander] > state.elapsed)) dealt *= 0.65;
        keeps[opposingTeam] -= dealt;
        const commander = commanderForUnit(unit);
        keepDamage[commander] = (keepDamage[commander] ?? 0) + dealt;
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: keep.x, y2: keep.y, life: 0.24, team: unit.team });
      }
    } else {
      rejoinForwardPath(unit);
      moveAlongPath(unit, spec.speed * moveFactor * dt);
    }
  }

  const intermediate: GameState = {
    ...state,
    units,
    buildings,
    keepWardens,
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

  const resources = commanderRecord((commander) => ({ ...(state.resources[commander] ?? STARTING_RESOURCES) }));
  const bountyEarned = { ...state.stats.bountyEarned };
  const buildingsLost = { ...state.stats.buildingsLost };
  const unitsLost = { ...state.stats.unitsLost };
  const effects = [...state.effects];
  let nextId = state.nextId;

  for (const unit of lostUnits) {
    const owner = commanderForUnit(unit);
    unitsLost[owner] = (unitsLost[owner] ?? 0) + 1;
    if (unit.lastDamagedBy) {
      const bounty = unitBountyFor(unit.kind, unit.level);
      resources[unit.lastDamagedBy].marks += bounty;
      bountyEarned[unit.lastDamagedBy] = (bountyEarned[unit.lastDamagedBy] ?? 0) + bounty;
    }
    effects.push({ id: nextId++, type: "destroy", x: unit.x, y: unit.y, life: 0.85, team: unit.team });
  }
  for (const building of destroyedBuildings) {
    const owner = commanderForBuilding(building);
    buildingsLost[owner] = (buildingsLost[owner] ?? 0) + 1;
    if (building.lastDamagedBy) {
      const bounty = buildingBountyFor(building);
      resources[building.lastDamagedBy].marks += bounty;
      bountyEarned[building.lastDamagedBy] = (bountyEarned[building.lastDamagedBy] ?? 0) + bounty;
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
        dealUnitDamage(unit, 50 * power, "Arc", commanderForBuilding(building), units);
        unit.slowTimer = Math.max(unit.slowTimer, 2.5);
      }
      effects.push({ id: nextId++, type: "pulse", x: center.x, y: center.y, life: 1, team: building.team, label: "STATIC PULSE" });
      building.abilityClock = 6.2 / power;
    } else if (spec.effect === "tower") {
      const targets = units.filter((unit) => unit.team !== building.team && distance(unit, center) <= 390 && (UNIT_SPECS[unit.kind].flying ? spec.faction === "stormglass" || building.level >= 2 : true));
      const target = targets.sort((a, b) => distance(a, center) - distance(b, center))[0];
      if (target) {
        const damageType: DamageType = spec.faction === "briarcrown" ? "Arrow" : spec.faction === "stormglass" ? "Arc" : "Pure";
        dealUnitDamage(target, 54 * power, damageType, commanderForBuilding(building), units);
        if (spec.faction === "briarcrown") {
          target.poisonTimer = 3;
          target.poisonDps = 5 * power;
          target.poisonTeam = commanderForBuilding(building);
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

export function castReprieve(state: GameState, commander: CommanderId): GameState {
  const team = teamForCommander(commander);
  if (!reprieveReady(state, commander)) return state;
  const units = state.units.map((unit) => unit.team === team ? { ...unit } : {
    ...unit,
    hp: onTeamHalf(unit.x, team) ? 0 : unit.hp * 0.68,
    lastDamagedBy: commander,
  });
  const keep = KEEP_POSITIONS[team];
  const next: GameState = {
    ...state,
    units,
    reprieveUsed: { ...state.reprieveUsed, [commander]: true },
    effects: [...state.effects, { id: state.nextId, type: "reprieve", x: keep.x, y: keep.y, life: 1.5, team, label: "REPRIEVE" }],
    nextId: state.nextId + 1,
  };
  const cleaned = collectDefeated(next);
  return withEvent(cleaned, `${FACTIONS[state.factions[commander]].name} invoked Reprieve. Invaders on the ${team === "player" ? "western" : "eastern"} half were erased; the distant host was wounded.`);
}

function shouldBotCastReprieve(state: GameState): boolean {
  if (!reprieveReady(state, "enemy")) return false;
  const attackers = state.units.filter((unit) => unit.team === "player");
  const defenders = state.units.filter((unit) => unit.team === "enemy");
  const invaders = state.units.filter((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy"));
  const closeThreats = invaders.filter((unit) => distance(unit, KEEP_POSITIONS.enemy) < 820);
  const pressure = invaders.reduce((total, unit) => {
    const spec = UNIT_SPECS[unit.kind];
    const roleWeight = spec.role === "siege" ? 2.25 : spec.role === "vanguard" ? 1.25 : 1;
    const proximityWeight = distance(unit, KEEP_POSITIONS.enemy) < 950 ? 1.5 : 1;
    return total + unit.level * roleWeight * proximityWeight * Math.max(0.35, unit.hp / unit.maxHp);
  }, 0);
  const fieldStrength = (units: Unit[]) => units.reduce((total, unit) => {
    const roleWeight = UNIT_SPECS[unit.kind].role === "siege" ? 1.7 : UNIT_SPECS[unit.kind].role === "vanguard" ? 1.2 : 1;
    return total + unit.level * roleWeight * Math.max(0.3, unit.hp / unit.maxHp);
  }, 0);
  const attackerStrength = fieldStrength(attackers);
  const defenderStrength = fieldStrength(defenders);
  const siegeThreat = invaders.some((unit) => UNIT_SPECS[unit.kind].role === "siege" && distance(unit, KEEP_POSITIONS.enemy) < 1_100);
  const criticalThreat = invaders.some((unit) => distance(unit, KEEP_POSITIONS.enemy) < 480);
  const keepRatio = state.keeps.enemy / KEEP_MAX_HP;
  return criticalThreat
    || closeThreats.length >= 2
    || siegeThreat
    || invaders.length >= 3
    || pressure >= 3.25
    || (invaders.length >= 1 && attackerStrength >= Math.max(3.2, defenderStrength * 1.35))
    || (keepRatio < 0.85 && invaders.length >= 1)
    || keepRatio < 0.4;
}

const AI_ARMOR_TYPES: ArmorType[] = ["Plate", "Cloth", "Ward", "Fortified", "Ethereal"];

function aiProductionBuildings(state: GameState, team: Team): Building[] {
  return state.buildings.filter((building) => building.team === team && BUILDING_SPECS[building.kind].category === "troop");
}

function aiArmorWeights(state: GameState): Record<ArmorType, number> {
  const weights = Object.fromEntries(AI_ARMOR_TYPES.map((armor) => [armor, 0])) as Record<ArmorType, number>;
  for (const unit of state.units.filter((candidate) => candidate.team === "player")) {
    const armor = UNIT_SPECS[unit.kind].armorType;
    weights[armor] += unit.level * (1 + Math.max(0.25, unit.hp / unit.maxHp));
  }
  for (const building of aiProductionBuildings(state, "player")) {
    const unitKind = BUILDING_SPECS[building.kind].unitKind;
    if (unitKind) weights[UNIT_SPECS[unitKind].armorType] += building.level * 1.5;
  }
  if (AI_ARMOR_TYPES.every((armor) => weights[armor] === 0)) weights.Plate = 1;
  return weights;
}

function aiRankedTroops(state: GameState): BuildingKind[] {
  const troopKinds = factionBuildings(state.factions.enemy, "troop");
  const owned = aiProductionBuildings(state, "enemy");
  if (owned.length === 0) {
    return [...troopKinds].sort((left, right) => BUILDING_SPECS[left].cost.marks - BUILDING_SPECS[right].cost.marks);
  }

  const armorWeights = aiArmorWeights(state);
  const totalArmorWeight = AI_ARMOR_TYPES.reduce((total, armor) => total + armorWeights[armor], 0);
  const playerAirWeight = state.units
    .filter((unit) => unit.team === "player" && UNIT_SPECS[unit.kind].flying)
    .reduce((total, unit) => total + unit.level, 0)
    + aiProductionBuildings(state, "player")
      .filter((building) => {
        const unitKind = BUILDING_SPECS[building.kind].unitKind;
        return unitKind ? UNIT_SPECS[unitKind].flying : false;
      })
      .reduce((total, building) => total + building.level, 0);
  const playerCombatWeight = state.units.filter((unit) => unit.team === "player")
    .reduce((total, unit) => total + unit.level, 0)
    + aiProductionBuildings(state, "player").reduce((total, building) => total + building.level, 0);
  const playerAntiAirWeight = state.units
    .filter((unit) => unit.team === "player" && (UNIT_SPECS[unit.kind].targetsAir || UNIT_SPECS[unit.kind].flying))
    .reduce((total, unit) => total + unit.level, 0)
    + aiProductionBuildings(state, "player")
      .filter((building) => {
        const unitKind = BUILDING_SPECS[building.kind].unitKind;
        return unitKind ? UNIT_SPECS[unitKind].targetsAir || UNIT_SPECS[unitKind].flying : false;
      })
      .reduce((total, building) => total + building.level, 0);
  const antiAirCoverage = playerCombatWeight ? playerAntiAirWeight / playerCombatWeight : 0;
  const roleCount = (role: "vanguard" | "support" | "siege") => owned.filter((building) => {
    const unitKind = BUILDING_SPECS[building.kind].unitKind;
    return unitKind ? UNIT_SPECS[unitKind].role === role : false;
  }).length;
  const ownAirCount = owned.filter((building) => {
    const unitKind = BUILDING_SPECS[building.kind].unitKind;
    return unitKind ? UNIT_SPECS[unitKind].flying : false;
  }).length;
  const desiredFrontline = Math.max(1, Math.ceil((owned.length + 1) * 0.36));
  const desiredAir = antiAirCoverage < 0.5 ? Math.max(1, Math.ceil((owned.length + 1) * (0.5 - antiAirCoverage))) : 0;
  const desiredSiege = owned.length >= 5 ? Math.max(1, Math.floor((owned.length + 1) / 7)) : 0;
  const desiredSupport = owned.length >= 4 ? Math.max(1, Math.floor((owned.length + 1) / 6)) : 0;

  const score = (kind: BuildingKind): number => {
    const unitKind = BUILDING_SPECS[kind].unitKind!;
    const unit = UNIT_SPECS[unitKind];
    const matchup = AI_ARMOR_TYPES.reduce((total, armor) => total + DAMAGE_MATRIX[unit.damageType][armor] * armorWeights[armor], 0) / totalArmorWeight;
    const duplicatePenalty = owned.filter((building) => building.kind === kind).length * 0.11;
    let composition = 0;
    if (unit.role === "vanguard" && roleCount("vanguard") < desiredFrontline) composition += 0.92;
    if (unit.role === "siege" && roleCount("siege") < desiredSiege) composition += 0.72;
    if (unit.role === "support" && roleCount("support") < desiredSupport) composition += 0.28;
    if (playerAirWeight > 0) composition += unit.targetsAir || unit.flying ? 0.55 : -0.9;
    if (unit.flying && ownAirCount < desiredAir) composition += 0.7 + (0.5 - antiAirCoverage) * 1.6;
    if (unit.flying && antiAirCoverage > 0.7) composition -= 0.2;
    return matchup + composition - duplicatePenalty - BUILDING_SPECS[kind].cost.marks * 0.00035;
  };

  return [...troopKinds].sort((left, right) => score(right) - score(left)
    || BUILDING_SPECS[left].cost.marks - BUILDING_SPECS[right].cost.marks);
}

function aiAreaUsage(state: GameState, area: GridRect): number {
  return state.buildings.filter((building) => building.team === "enemy"
    && building.gridX >= area.minX && building.gridX <= area.maxX
    && building.gridY >= area.minY && building.gridY <= area.maxY).length;
}

function aiPlace(state: GameState, choices: readonly BuildingKind[]): GameState {
  for (const kind of choices.filter((choice, index, list) => list.indexOf(choice) === index)) {
    const spec = BUILDING_SPECS[kind];
    if (!canAfford(state.resources.enemy, spec.cost)) continue;
    const invaders = state.units.filter((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy"));
    const pressureY = invaders.length ? invaders.reduce((total, unit) => total + unit.y, 0) / invaders.length : null;
    const areas = [...buildAreasForCommander(state, "enemy")].sort((left, right) => {
      if ((spec.category === "tower" || spec.category === "special") && pressureY !== null) {
        const leftDistance = Math.abs((left.minY + left.maxY + 1) * CELL_SIZE / 2 - pressureY);
        const rightDistance = Math.abs((right.minY + right.maxY + 1) * CELL_SIZE / 2 - pressureY);
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      }
      return aiAreaUsage(state, left) - aiAreaUsage(state, right);
    });

    for (const area of areas) {
      const minX = area.minX;
      const maxX = area.maxX - spec.width + 1;
      const xPositions = Array.from({ length: maxX - minX + 1 }, (_, index) => spec.category === "economy" ? maxX - index : minX + index);
      const minY = area.minY;
      const maxY = area.maxY - spec.height + 1;
      const middleY = (minY + maxY) / 2;
      const yPositions = Array.from({ length: maxY - minY + 1 }, (_, index) => minY + index)
        .sort((left, right) => Math.abs(left - middleY) - Math.abs(right - middleY));
      for (const x of xPositions) {
        for (const y of yPositions) {
          if (validatePlacement(state, "enemy", kind, x, y).valid) return placeBuilding(state, "enemy", kind, x, y);
        }
      }
    }
  }
  return state;
}

function aiPlaceTroops(state: GameState, limit: number): GameState {
  let next = state;
  for (let placement = 0; placement < limit && commanderBuildingCount(next, "enemy") < BUILDING_CAP; placement += 1) {
    const before = aiProductionBuildings(next, "enemy").length;
    next = aiPlace(next, aiRankedTroops(next));
    if (aiProductionBuildings(next, "enemy").length === before) break;
  }
  return next;
}

function aiUpgradeCandidate(state: GameState, level: 1 | 2): Building | null {
  const kindPriority = new Map(aiRankedTroops(state).map((kind, index) => [kind, index]));
  return [...state.buildings]
    .filter((building) => building.team === "enemy" && BUILDING_SPECS[building.kind].category === "troop" && building.level === level)
    .sort((left, right) => (kindPriority.get(left.kind) ?? 99) - (kindPriority.get(right.kind) ?? 99)
      || right.totalSpawned - left.totalSpawned)[0] ?? null;
}

function aiManageSynchronization(state: GameState): GameState {
  const production = aiProductionBuildings(state, "enemy").filter((building) => !building.productionPaused);
  const periods = production.map((building) => productionPeriod(building, state));
  const periodSpread = periods.length ? Math.max(...periods) / Math.min(...periods) : Number.POSITIVE_INFINITY;
  const underPressure = state.units.some((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy"));
  const shouldSynchronize = production.length >= 4 && state.elapsed > 70 && periodSpread <= 1.04 && !underPressure;
  return shouldSynchronize === state.syncEnabled.enemy ? state : toggleSynchronization(state, "enemy");
}

function aiInvaderStrength(state: GameState): number {
  return state.units.filter((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy")).reduce((total, unit) => {
    const spec = UNIT_SPECS[unit.kind];
    const roleWeight = spec.role === "siege" ? 1.8 : spec.role === "vanguard" ? 1.2 : 1;
    return total + unit.level * roleWeight * Math.max(0.3, unit.hp / unit.maxHp);
  }, 0);
}

function runAi(state: GameState): GameState {
  if (!state.started) return state;
  let next = state;
  const missingKeepHealth = KEEP_MAX_HP - next.keeps.enemy;
  const invaderStrength = aiInvaderStrength(next);
  const reprieveWillAnswer = reprieveReady(next, "enemy") && shouldBotCastReprieve(next);

  if (missingKeepHealth >= 220
    && !reprieveWillAnswer
    && next.keepArmorUntil.enemy <= next.elapsed
    && canAfford(next.resources.enemy, SHOP_ITEMS.iron_writ.cost)) {
    next = buyShopItem(next, "enemy", "iron_writ");
  }
  if (invaderStrength >= 3.2
    && !reprieveWillAnswer
    && canAfford(next.resources.enemy, SHOP_ITEMS.ember_flask.cost)) {
    next = buyShopItem(next, "enemy", "ember_flask");
  }

  const enemyProduction = aiProductionBuildings(next, "enemy").length;
  const playerProduction = aiProductionBuildings(next, "player").length;
  const catchUpTarget = Math.max(3, playerProduction + (next.elapsed >= 45 ? 1 : 0));
  const productionTarget = Math.max(AI_BASELINE_PRODUCTION, catchUpTarget);
  if (enemyProduction < productionTarget) {
    next = aiPlaceTroops(next, Math.min(AI_MAX_PLACEMENTS_PER_TURN, productionTarget - enemyProduction));
    return aiManageSynchronization(next);
  }

  const faction = next.factions.enemy;
  const towerKind = factionBuildings(faction, "tower")[0];
  const invaders = next.units.filter((unit) => unit.team === "player" && onTeamHalf(unit.x, "enemy"));
  const desiredTowers = invaders.length >= 5 || next.keeps.enemy < KEEP_MAX_HP * 0.72 ? 2 : invaders.length >= 2 ? 1 : 0;
  if (commanderBuildingCount(next, "enemy", towerKind) < desiredTowers) {
    if (!canAfford(next.resources.enemy, BUILDING_SPECS[towerKind].cost)) return aiManageSynchronization(next);
    const before = commanderBuildingCount(next, "enemy", towerKind);
    next = aiPlace(next, [towerKind]);
    if (commanderBuildingCount(next, "enemy", towerKind) > before) return aiManageSynchronization(next);
  }

  const specialKind = factionBuildings(faction, "special")[0];
  const desiredSpecials = enemyProduction >= 14 ? 2 : enemyProduction >= AI_SPECIAL_START ? 1 : 0;
  if (commanderBuildingCount(next, "enemy", specialKind) < desiredSpecials) {
    if (!canAfford(next.resources.enemy, BUILDING_SPECS[specialKind].cost)) return aiManageSynchronization(next);
    const before = commanderBuildingCount(next, "enemy", specialKind);
    next = aiPlace(next, [specialKind]);
    if (commanderBuildingCount(next, "enemy", specialKind) > before) return aiManageSynchronization(next);
  }

  const currentUpgradeRanks = aiProductionBuildings(next, "enemy").reduce((total, building) => total + building.level - 1, 0);
  const desiredUpgradeRanks = Math.floor(enemyProduction / 4);
  if (currentUpgradeRanks < desiredUpgradeRanks) {
    const candidate = aiUpgradeCandidate(next, 1);
    const cost = candidate ? costForUpgrade(candidate) : null;
    if (candidate && cost && canAfford(next.resources.enemy, cost)) next = upgradeBuilding(next, "enemy", candidate.id);
    return aiManageSynchronization(next);
  }

  const legendaryCount = aiProductionBuildings(next, "enemy").filter((building) => building.level === 3).length;
  const desiredLegendaries = enemyProduction >= 16 ? 2 : enemyProduction >= AI_LEGENDARY_START ? 1 : 0;
  if (legendaryCount < desiredLegendaries) {
    const candidate = aiUpgradeCandidate(next, 2);
    const cost = candidate ? costForUpgrade(candidate) : null;
    if (candidate && cost && canAfford(next.resources.enemy, cost)) {
      next = upgradeBuilding(next, "enemy", candidate.id);
      return aiManageSynchronization(next);
    }
    if (candidate && next.resources.enemy.sigils === 0 && enemyProduction >= 16) {
      if (canAfford(next.resources.enemy, SHOP_ITEMS.sigil_shard.cost)) next = buyShopItem(next, "enemy", "sigil_shard");
      return aiManageSynchronization(next);
    }
    if (candidate && cost && next.resources.enemy.sigils > 0) return aiManageSynchronization(next);
  }

  if (enemyProduction >= AI_RALLY_HORN_START && !next.rallyHorn.enemy) {
    if (canAfford(next.resources.enemy, SHOP_ITEMS.rally_horn.cost)) next = buyShopItem(next, "enemy", "rally_horn");
    return aiManageSynchronization(next);
  }

  const economyKind = factionBuildings(faction, "economy")[0];
  const desiredEconomy = enemyProduction < AI_TREASURY_START
    ? 0
    : Math.min(ECONOMY_BUILDING_CAP, 1 + Math.floor((enemyProduction - AI_TREASURY_START) / 7));
  if (commanderBuildingCount(next, "enemy", economyKind) < desiredEconomy) {
    if (!canAfford(next.resources.enemy, BUILDING_SPECS[economyKind].cost)) return aiManageSynchronization(next);
    const before = commanderBuildingCount(next, "enemy", economyKind);
    next = aiPlace(next, [economyKind]);
    if (commanderBuildingCount(next, "enemy", economyKind) > before) return aiManageSynchronization(next);
  }

  if (commanderBuildingCount(next, "enemy") < BUILDING_CAP) next = aiPlaceTroops(next, 1);
  return aiManageSynchronization(next);
}

function finishRound(state: GameState, winner: Team, reason: string): GameState {
  const roundWins = { ...state.roundWins, [winner]: state.roundWins[winner] + 1 };
  const matchFinished = roundWins[winner] >= ROUNDS_TO_WIN;
  const status: MatchStatus = matchFinished
    ? (winner === "player" ? "won" : "lost")
    : (winner === "player" ? "round_won" : "round_lost");
  const victor = teamDisplayName(state, winner);
  return withEvent({ ...state, roundWins, status }, matchFinished ? `${reason} ${victor} wins the match ${roundWins.player}–${roundWins.enemy}.` : `${reason} Round ${state.round} goes to ${victor}.`);
}

export function teamDisplayName(state: GameState, team: Team): string {
  if (state.matchMode === "2v2") return team === "player" ? "Western Alliance" : "Eastern Alliance";
  return FACTIONS[state.factions[team]].name;
}

function resolveRound(state: GameState): GameState {
  if (state.keeps.enemy <= 0) return finishRound(state, "player", "The eastern Keep has fallen.");
  if (state.keeps.player <= 0) return finishRound(state, "enemy", "The western Keep has fallen.");
  if (state.elapsed < MATCH_LIMIT) return state;

  const unusedPlayer = commandersForTeam(state, "player").filter((commander) => !state.reprieveUsed[commander]).length;
  const unusedEnemy = commandersForTeam(state, "enemy").filter((commander) => !state.reprieveUsed[commander]).length;
  if (unusedPlayer !== unusedEnemy) return finishRound(state, unusedPlayer > unusedEnemy ? "player" : "enemy", "The ledger closed; the unused Reprieve decided the tie.");
  const playerIncome = incomeFor(state, "player");
  const enemyIncome = incomeFor(state, "enemy");
  if (playerIncome !== enemyIncome) return finishRound(state, playerIncome > enemyIncome ? "player" : "enemy", "The ledger closed; stronger recurring income decided the tie.");
  if (state.keeps.player !== state.keeps.enemy) return finishRound(state, state.keeps.player > state.keeps.enemy ? "player" : "enemy", "The ledger closed; the healthier Keep decided the tie.");
  const playerArmy = state.units.filter((unit) => unit.team === "player").reduce((total, unit) => total + unit.hp + unit.shield, 0);
  const enemyArmy = state.units.filter((unit) => unit.team === "enemy").reduce((total, unit) => total + unit.hp + unit.shield, 0);
  return finishRound(state, playerArmy >= enemyArmy ? "player" : "enemy", "The ledger closed; remaining field strength broke the final tie.");
}

function processProduction(state: GameState): GameState {
  let next = state;
  for (const commander of activeCommandersFor(next)) {
    const active = next.buildings.filter((building) => commanderForBuilding(building) === commander && BUILDING_SPECS[building.kind].unitKind && !building.productionPaused);
    if (next.syncEnabled[commander]) {
      if (next.syncClock[commander] <= 0 && active.length) {
        const ids = new Set(active.map((building) => building.id));
        for (const snapshot of active) {
          const current = next.buildings.find((building) => building.id === snapshot.id);
          if (current) next = spawnUnit(next, current);
        }
        const longest = Math.max(...active.map((building) => productionPeriod(building, next)));
        next = {
          ...next,
          buildings: next.buildings.map((building) => ids.has(building.id) ? { ...building, spawnClock: productionPeriod(building, next) } : building),
          syncClock: { ...next.syncClock, [commander]: longest },
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
    syncClock: commanderRecord((commander) => input.syncEnabled[commander] ? input.syncClock[commander] - safeDt : input.syncClock[commander]),
    buildings: input.buildings.map((building) => ({
      ...building,
      spawnClock: !building.productionPaused && !input.syncEnabled[commanderForBuilding(building)] ? building.spawnClock - safeDt : building.spawnClock,
      abilityClock: building.abilityClock - safeDt,
    })),
  };

  if (state.incomeClock <= 0) {
    const incomes = commanderRecord((commander) => activeCommandersFor(state).includes(commander) ? incomeForCommander(state, commander) : 0);
    const playerIncome = commandersForTeam(state, "player").reduce((total, commander) => total + incomes[commander], 0);
    const enemyIncome = commandersForTeam(state, "enemy").reduce((total, commander) => total + incomes[commander], 0);
    state = {
      ...state,
      resources: commanderRecord((commander) => ({
        ...(state.resources[commander] ?? STARTING_RESOURCES),
        marks: (state.resources[commander]?.marks ?? STARTING_RESOURCES.marks) + incomes[commander],
      })),
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
    state = { ...state, aiClock: AI_ACTION_INTERVAL };
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
  const player = teamDisplayName(state, "player");
  const enemy = teamDisplayName(state, "enemy");
  const result = state.status === "won" ? `${player} victory` : state.status === "lost" ? `${enemy} victory` : state.status.replace("_", " ");
  const factionsFor = (team: Team) => commandersForTeam(state, team).map((commander) => FACTIONS[state.factions[commander]].name).join(" + ");
  const statFor = (stat: CommanderRecord<number>, team: Team) => commandersForTeam(state, team).reduce((total, commander) => total + (stat[commander] ?? 0), 0);
  const reprievesFor = (team: Team) => {
    const commanders = commandersForTeam(state, team);
    return `${commanders.filter((commander) => state.reprieveUsed[commander]).length}/${commanders.length}`;
  };
  const incomeForReport = (team: Team) => {
    const breakdowns = commandersForTeam(state, team).map((commander) => incomeBreakdownForCommander(state, commander));
    const net = breakdowns.reduce((total, breakdown) => total + breakdown.paid, 0);
    const gross = breakdowns.reduce((total, breakdown) => total + breakdown.gross, 0);
    return `${net} / ${Math.round(gross * 10) / 10}`;
  };
  return [
    "KEEPSTORM PLAYTEST ALPHA — MATCH REPORT",
    `Result: ${result}`,
    `Rounds: ${state.roundWins.player} / ${state.roundWins.enemy}`,
    `Total duration: ${Math.floor(state.totalElapsed / 60)}:${String(Math.floor(state.totalElapsed % 60)).padStart(2, "0")}`,
    `Mode: ${state.matchMode}`,
    `Factions: ${factionsFor("player")} / ${factionsFor("enemy")}`,
    `Keeps: ${Math.ceil(state.keeps.player)} / ${Math.ceil(state.keeps.enemy)}`,
    `Structures placed: ${statFor(state.stats.buildingsPlaced, "player")} / ${statFor(state.stats.buildingsPlaced, "enemy")}`,
    `Upgrades purchased: ${statFor(state.stats.upgrades, "player")} / ${statFor(state.stats.upgrades, "enemy")}`,
    `Cohorts raised: ${statFor(state.stats.unitsSpawned, "player")} / ${statFor(state.stats.unitsSpawned, "enemy")}`,
    `Bounty earned: ${statFor(state.stats.bountyEarned, "player")} / ${statFor(state.stats.bountyEarned, "enemy")}`,
    `Recurring income (net / raw): ${incomeForReport("player")} vs ${incomeForReport("enemy")}`,
    `Items commissioned: ${statFor(state.stats.itemsBought, "player")} / ${statFor(state.stats.itemsBought, "enemy")}`,
    `Reprieves used this round: ${reprievesFor("player")} / ${reprievesFor("enemy")}`,
    `What felt decisive: ${playtestAnswer || "not answered"}`,
    `Build: ${GAME_BUILD}`,
  ].join("\n");
}
