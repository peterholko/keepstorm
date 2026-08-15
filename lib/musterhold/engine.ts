export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 896;
export const CELL_SIZE = 32;
export const GRID_COLUMNS = 100;
export const GRID_ROWS = 28;
export const KEEP_MAX_HP = 1800;
export const MATCH_LIMIT = 300;
export const REPRIEVE_READY_AT = 48;
export const BUILDING_CAP = 12;

export type Team = "player" | "enemy";
export type MatchStatus = "playing" | "won" | "lost";
export type BuildingKind = "ramworks" | "quillnest" | "beaconarium" | "tallyhouse";
export type UnitKind = "ramguard" | "quillrunner" | "wispwright";
export type DamageType = "Hammer" | "Arrow" | "Arc";
export type ArmorType = "Plate" | "Cloth" | "Ward";

export interface Point { x: number; y: number }
export interface GridPoint { x: number; y: number }
export interface GridRect { minX: number; maxX: number; minY: number; maxY: number }

export interface BuildingSpec {
  name: string;
  cohort: string | null;
  cost: number;
  width: number;
  height: number;
  maxHp: number;
  spawnEvery: number | null;
  unitKind: UnitKind | null;
  yieldBonus: number;
  atlasIndex: number;
  description: string;
}

export interface UnitSpec {
  name: string;
  damageType: DamageType;
  armorType: ArmorType;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackEvery: number;
  atlasIndex: number;
  description: string;
}

export const BUILDING_KINDS: BuildingKind[] = ["ramworks", "quillnest", "beaconarium", "tallyhouse"];
export const PRODUCTION_KINDS: BuildingKind[] = ["ramworks", "quillnest", "beaconarium"];

export const BUILDING_SPECS: Record<BuildingKind, BuildingSpec> = {
  ramworks: {
    name: "Ramworks",
    cohort: "Ramguards",
    cost: 90,
    width: 3,
    height: 3,
    maxHp: 620,
    spawnEvery: 8,
    unitKind: "ramguard",
    yieldBonus: 3,
    atlasIndex: 1,
    description: "Raises durable Hammer cohorts. Strong into Plate, vulnerable to Arc.",
  },
  quillnest: {
    name: "Quillnest",
    cohort: "Quillrunners",
    cost: 120,
    width: 3,
    height: 3,
    maxHp: 500,
    spawnEvery: 9.2,
    unitKind: "quillrunner",
    yieldBonus: 4,
    atlasIndex: 2,
    description: "Raises long-ranged Arrow cohorts. Strong into Cloth, vulnerable to Hammer.",
  },
  beaconarium: {
    name: "Beaconarium",
    cohort: "Wispwrights",
    cost: 150,
    width: 3,
    height: 3,
    maxHp: 450,
    spawnEvery: 10.8,
    unitKind: "wispwright",
    yieldBonus: 5,
    atlasIndex: 3,
    description: "Raises volatile Arc cohorts. Strong into Ward, vulnerable to Arrow.",
  },
  tallyhouse: {
    name: "Tallyhouse",
    cohort: null,
    cost: 110,
    width: 2,
    height: 2,
    maxHp: 380,
    spawnEvery: null,
    unitKind: null,
    yieldBonus: 24,
    atlasIndex: 4,
    description: "Produces no cohort, but permanently increases every seven-second Yield.",
  },
};

export const UNIT_SPECS: Record<UnitKind, UnitSpec> = {
  ramguard: {
    name: "Ramguard",
    damageType: "Hammer",
    armorType: "Ward",
    maxHp: 310,
    damage: 39,
    range: 45,
    speed: 66,
    attackEvery: 1.12,
    atlasIndex: 5,
    description: "A slow front-line breaker protected by a resin ward.",
  },
  quillrunner: {
    name: "Quillrunner",
    damageType: "Arrow",
    armorType: "Plate",
    maxHp: 165,
    damage: 29,
    range: 132,
    speed: 78,
    attackEvery: 1.05,
    atlasIndex: 6,
    description: "A fast ranged cohort clad in light mechanical plate.",
  },
  wispwright: {
    name: "Wispwright",
    damageType: "Arc",
    armorType: "Cloth",
    maxHp: 125,
    damage: 56,
    range: 112,
    speed: 61,
    attackEvery: 1.48,
    atlasIndex: 7,
    description: "A fragile hovering caster wrapped in stabilizing ribbons.",
  },
};

export interface Building {
  id: number;
  team: Team;
  kind: BuildingKind;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  spawnClock: number;
  totalSpawned: number;
}

export interface Unit {
  id: number;
  team: Team;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  attackFlash: number;
  path: Point[];
  pathIndex: number;
}

export interface Effect {
  id: number;
  type: "hit" | "spawn" | "destroy" | "reprieve" | "yield";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  life: number;
  team?: Team;
}

export interface MatchStats {
  buildingsPlaced: Record<Team, number>;
  buildingsLost: Record<Team, number>;
  unitsSpawned: Record<Team, number>;
  unitsLost: Record<Team, number>;
  keepDamage: Record<Team, number>;
}

export interface GameState {
  status: MatchStatus;
  started: boolean;
  elapsed: number;
  coins: Record<Team, number>;
  keeps: Record<Team, number>;
  buildings: Building[];
  units: Unit[];
  effects: Effect[];
  incomeClock: number;
  aiClock: number;
  keepDefenseClock: number;
  reprieveUsed: Record<Team, boolean>;
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

const ARMOR_COUNTER: Record<DamageType, ArmorType> = {
  Hammer: "Plate",
  Arrow: "Cloth",
  Arc: "Ward",
};

const COUNTER_BUILDING: Record<BuildingKind, BuildingKind> = {
  ramworks: "beaconarium",
  quillnest: "ramworks",
  beaconarium: "quillnest",
  tallyhouse: "ramworks",
};

function emptyStats(): MatchStats {
  return {
    buildingsPlaced: { player: 0, enemy: 0 },
    buildingsLost: { player: 0, enemy: 0 },
    unitsSpawned: { player: 0, enemy: 0 },
    unitsLost: { player: 0, enemy: 0 },
    keepDamage: { player: 0, enemy: 0 },
  };
}

export function createInitialState(): GameState {
  return {
    status: "playing",
    started: false,
    elapsed: 0,
    coins: { player: 390, enemy: 390 },
    keeps: { player: KEEP_MAX_HP, enemy: KEEP_MAX_HP },
    buildings: [],
    units: [],
    effects: [],
    incomeClock: 7,
    aiClock: 3.5,
    keepDefenseClock: 1.25,
    reprieveUsed: { player: false, enemy: false },
    nextId: 1,
    event: "Choose a Foundry, then place it inside your construction yard.",
    eventSerial: 1,
    stats: emptyStats(),
  };
}

export function buildingCount(state: GameState, team: Team, kind?: BuildingKind): number {
  return state.buildings.filter((building) => building.team === team && (!kind || building.kind === kind)).length;
}

export function unitCount(state: GameState, team: Team): number {
  return state.units.filter((unit) => unit.team === team).length;
}

export function yieldFor(state: GameState, team: Team): number {
  return 44 + state.buildings
    .filter((building) => building.team === team)
    .reduce((total, building) => total + BUILDING_SPECS[building.kind].yieldBonus, 0);
}

export function damageMultiplier(attacker: UnitKind, defender: UnitKind): number {
  const source = UNIT_SPECS[attacker];
  const target = UNIT_SPECS[defender];
  if (ARMOR_COUNTER[source.damageType] === target.armorType) return 1.7;
  if (ARMOR_COUNTER[target.damageType] === source.armorType) return 0.74;
  return 1;
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

function spawnCell(building: Pick<Building, "team" | "gridX" | "gridY" | "kind">): GridPoint {
  const spec = BUILDING_SPECS[building.kind];
  return {
    x: building.team === "player" ? building.gridX + spec.width : building.gridX - 1,
    y: building.gridY + Math.floor(spec.height / 2),
  };
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

export function validatePlacement(state: GameState, team: Team, kind: BuildingKind, gridX: number, gridY: number): PlacementValidation {
  if (state.status !== "playing") return { valid: false, reason: "The match is over." };
  if (state.coins[team] < BUILDING_SPECS[kind].cost) return { valid: false, reason: "Not enough Marks." };
  if (buildingCount(state, team) >= BUILDING_CAP) return { valid: false, reason: "Your construction yard is full." };

  const spec = BUILDING_SPECS[kind];
  const insideBuildArea = BUILD_AREAS[team].some((area) => (
    gridX >= area.minX
    && gridY >= area.minY
    && gridX + spec.width - 1 <= area.maxX
    && gridY + spec.height - 1 <= area.maxY
  ));
  if (!insideBuildArea) {
    return { valid: false, reason: "That footprint leaves your construction yard." };
  }

  const candidate: Building = {
    id: -1,
    team,
    kind,
    gridX,
    gridY,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    spawnClock: 0,
    totalSpawned: 0,
  };
  const teamBuildings = [...state.buildings.filter((building) => building.team === team), candidate];
  const blocked = blockedCells(teamBuildings);
  const candidateCells = new Set(cellsForBuilding(candidate).map(gridKey));
  for (const existing of state.buildings.filter((building) => building.team === team)) {
    if (cellsForBuilding(existing).some((cell) => candidateCells.has(gridKey(cell)))) return { valid: false, reason: "Another Foundry occupies those cells." };
  }

  let candidatePath: GridPoint[] | undefined;
  for (const building of teamBuildings) {
    if (!BUILDING_SPECS[building.kind].unitKind) continue;
    const start = spawnCell(building);
    if (blocked.has(gridKey(start))) return { valid: false, reason: "A cohort exit would be blocked." };
    const path = findGridPath(start, GATE_CELLS[team], team, blocked);
    if (!path) return { valid: false, reason: "That placement would trap a cohort inside the yard." };
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
    spawnClock: spec.spawnEvery ? 1.8 + (state.nextId % 3) * 0.35 : 0,
    totalSpawned: 0,
  };
  const next: GameState = {
    ...state,
    started: state.started || team === "player",
    coins: { ...state.coins, [team]: state.coins[team] - spec.cost },
    buildings: [...state.buildings, building],
    nextId: state.nextId + 1,
    stats: {
      ...state.stats,
      buildingsPlaced: { ...state.stats.buildingsPlaced, [team]: state.stats.buildingsPlaced[team] + 1 },
    },
  };
  if (team === "enemy") return next;
  return withEvent(next, `${spec.name} placed at ${gridX}, ${gridY}. ${spec.cohort ? `${spec.cohort} will deploy automatically.` : "Your next Yield is larger."}`);
}

function buildingPath(state: GameState, building: Building, unitId: number): Point[] {
  const blocked = blockedCells(state.buildings.filter((candidate) => candidate.team === building.team));
  const baseGridPath = findGridPath(spawnCell(building), GATE_CELLS[building.team], building.team, blocked) ?? [spawnCell(building), GATE_CELLS[building.team]];
  const offset = ((unitId % 5) - 2) * 9;
  const lane = building.team === "player"
    ? LANE_PATH.map((point, index) => ({ x: point.x, y: point.y + (index > 0 && index < LANE_PATH.length - 1 ? offset : 0) }))
    : [...LANE_PATH].reverse().map((point, index, list) => ({ x: point.x, y: point.y + (index > 0 && index < list.length - 1 ? offset : 0) }));
  const keep = KEEP_POSITIONS[building.team === "player" ? "enemy" : "player"];
  return [...baseGridPath.map(cellCenter), ...lane.slice(1), keep];
}

function spawnUnit(state: GameState, building: Building): GameState {
  const kind = BUILDING_SPECS[building.kind].unitKind;
  if (!kind) return state;
  const spec = UNIT_SPECS[kind];
  const path = buildingPath(state, building, state.nextId);
  const start = path[0] ?? cellCenter(spawnCell(building));
  const unit: Unit = {
    id: state.nextId,
    team: building.team,
    kind,
    x: start.x,
    y: start.y,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    cooldown: 0.3,
    attackFlash: 0,
    path,
    pathIndex: 1,
  };
  const buildings = state.buildings.map((candidate) => candidate.id === building.id ? { ...candidate, totalSpawned: candidate.totalSpawned + 1 } : candidate);
  return {
    ...state,
    buildings,
    units: [...state.units, unit],
    effects: [...state.effects, { id: state.nextId + 1, type: "spawn", x: start.x, y: start.y, life: 0.75, team: building.team }],
    nextId: state.nextId + 2,
    stats: {
      ...state.stats,
      unitsSpawned: { ...state.stats.unitsSpawned, [building.team]: state.stats.unitsSpawned[building.team] + 1 },
    },
  };
}

function dominantPlayerBuilding(state: GameState): BuildingKind | null {
  let best: BuildingKind | null = null;
  let bestCount = 0;
  for (const kind of PRODUCTION_KINDS) {
    const count = buildingCount(state, "player", kind);
    if (count > bestCount) { best = kind; bestCount = count; }
  }
  return best;
}

function aiDesiredBuilding(state: GameState): BuildingKind {
  const production = PRODUCTION_KINDS.reduce((total, kind) => total + buildingCount(state, "enemy", kind), 0);
  const tallyhouses = buildingCount(state, "enemy", "tallyhouse");
  if (production >= 3 && tallyhouses < Math.floor(production / 3)) return "tallyhouse";
  const playerFocus = dominantPlayerBuilding(state);
  return playerFocus ? COUNTER_BUILDING[playerFocus] : PRODUCTION_KINDS[production % PRODUCTION_KINDS.length];
}

const AI_Y = [4, 8, 16, 20, 5, 17, 9, 21];
const AI_X = [88, 84, 81, 87, 83, 80, 86, 82, 88];

function runAi(state: GameState): GameState {
  if (!state.started || buildingCount(state, "enemy") >= BUILDING_CAP) return state;
  const desired = aiDesiredBuilding(state);
  const choices = [desired, ...PRODUCTION_KINDS, "tallyhouse" as BuildingKind].filter((kind, index, list) => list.indexOf(kind) === index);
  for (const kind of choices) {
    if (state.coins.enemy < BUILDING_SPECS[kind].cost) continue;
    for (let offset = 0; offset < AI_X.length; offset += 1) {
      const index = (state.stats.buildingsPlaced.enemy * 3 + offset) % AI_X.length;
      const x = Math.min(AI_X[index], BUILD_ZONES.enemy.maxX - BUILDING_SPECS[kind].width + 1);
      const y = Math.min(AI_Y[index], BUILD_ZONES.enemy.maxY - BUILDING_SPECS[kind].height + 1);
      if (validatePlacement(state, "enemy", kind, x, y).valid) return placeBuilding(state, "enemy", kind, x, y);
    }
  }
  return state;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildingCenter(building: Building): Point {
  const spec = BUILDING_SPECS[building.kind];
  return {
    x: (building.gridX + spec.width / 2) * CELL_SIZE,
    y: (building.gridY + spec.height / 2) * CELL_SIZE,
  };
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

function addEffect(effects: Effect[], nextId: { value: number }, effect: Omit<Effect, "id">): void {
  effects.push({ ...effect, id: nextId.value });
  nextId.value += 1;
}

function simulateCombat(state: GameState, dt: number): GameState {
  const units = state.units.map((unit) => ({ ...unit, cooldown: Math.max(0, unit.cooldown - dt), attackFlash: Math.max(0, unit.attackFlash - dt) }));
  const buildings = state.buildings.map((building) => ({ ...building }));
  const keeps = { ...state.keeps };
  const effects = state.effects.map((effect) => ({ ...effect, life: effect.life - dt })).filter((effect) => effect.life > 0);
  const nextId = { value: state.nextId };
  const keepDamage = { ...state.stats.keepDamage };

  for (const unit of units) {
    if (unit.hp <= 0) continue;
    const spec = UNIT_SPECS[unit.kind];
    const enemies = units.filter((candidate) => candidate.team !== unit.team && candidate.hp > 0);
    const nearestUnit = enemies.reduce<Unit | null>((nearest, candidate) => !nearest || distance(unit, candidate) < distance(unit, nearest) ? candidate : nearest, null);
    const nearestDistance = nearestUnit ? distance(unit, nearestUnit) : Number.POSITIVE_INFINITY;

    if (nearestUnit && nearestDistance <= spec.range) {
      if (unit.cooldown <= 0) {
        nearestUnit.hp -= spec.damage * damageMultiplier(unit.kind, nearestUnit.kind);
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: nearestUnit.x, y2: nearestUnit.y, life: 0.22, team: unit.team });
      }
      continue;
    }

    if (nearestUnit && nearestDistance <= spec.range + 95) {
      moveToward(unit, nearestUnit, spec.speed * dt);
      continue;
    }

    const inEnemyYard = unit.team === "player"
      ? unit.x > cellCenter(GATE_CELLS.enemy).x - 70
      : unit.x < cellCenter(GATE_CELLS.player).x + 70;
    const enemyBuildings = buildings.filter((building) => building.team !== unit.team && building.hp > 0);
    const nearestBuilding = inEnemyYard
      ? enemyBuildings.reduce<Building | null>((nearest, candidate) => !nearest || distance(unit, buildingCenter(candidate)) < distance(unit, buildingCenter(nearest)) ? candidate : nearest, null)
      : null;

    if (nearestBuilding) {
      const center = buildingCenter(nearestBuilding);
      const structureDistance = distance(unit, center);
      if (structureDistance <= spec.range + 34) {
        if (unit.cooldown <= 0) {
          nearestBuilding.hp -= spec.damage * 0.82;
          unit.cooldown = spec.attackEvery;
          unit.attackFlash = 0.2;
          addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: center.x, y2: center.y, life: 0.22, team: unit.team });
        }
      } else moveToward(unit, center, spec.speed * dt);
      continue;
    }

    const opposingTeam: Team = unit.team === "player" ? "enemy" : "player";
    const keep = KEEP_POSITIONS[opposingTeam];
    if (distance(unit, keep) <= spec.range + 72) {
      if (unit.cooldown <= 0) {
        const dealt = spec.damage * 0.8;
        keeps[opposingTeam] -= dealt;
        keepDamage[unit.team] += dealt;
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.2;
        addEffect(effects, nextId, { type: "hit", x: unit.x, y: unit.y, x2: keep.x, y2: keep.y, life: 0.24, team: unit.team });
      }
    } else moveAlongPath(unit, spec.speed * dt);
  }

  const survivingBuildings = buildings.filter((building) => building.hp > 0);
  const destroyedBuildings = buildings.filter((building) => building.hp <= 0);
  for (const building of destroyedBuildings) {
    const center = buildingCenter(building);
    addEffect(effects, nextId, { type: "destroy", x: center.x, y: center.y, life: 1.2, team: building.team });
  }

  const survivingUnits = units.filter((unit) => unit.hp > 0);
  const lostUnits = units.filter((unit) => unit.hp <= 0);
  const buildingsLost = { ...state.stats.buildingsLost };
  const unitsLost = { ...state.stats.unitsLost };
  for (const building of destroyedBuildings) buildingsLost[building.team] += 1;
  for (const unit of lostUnits) unitsLost[unit.team] += 1;

  return {
    ...state,
    units: survivingUnits,
    buildings: survivingBuildings,
    keeps: { player: Math.max(0, keeps.player), enemy: Math.max(0, keeps.enemy) },
    effects,
    nextId: nextId.value,
    stats: { ...state.stats, buildingsLost, unitsLost, keepDamage },
  };
}

function applyKeepDefense(state: GameState): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const effects = [...state.effects];
  let nextId = state.nextId;
  for (const team of ["player", "enemy"] as const) {
    const keep = KEEP_POSITIONS[team];
    const threat = units
      .filter((unit) => unit.team !== team && unit.hp > 0 && distance(unit, keep) < 210)
      .sort((a, b) => distance(a, keep) - distance(b, keep))[0];
    if (threat) {
      threat.hp -= 42;
      effects.push({ id: nextId, type: "hit", x: keep.x, y: keep.y, x2: threat.x, y2: threat.y, life: 0.3, team });
      nextId += 1;
    }
  }
  const defeated = units.filter((unit) => unit.hp <= 0);
  const unitsLost = { ...state.stats.unitsLost };
  for (const unit of defeated) unitsLost[unit.team] += 1;
  return {
    ...state,
    units: units.filter((unit) => unit.hp > 0),
    effects,
    nextId,
    stats: { ...state.stats, unitsLost },
  };
}

export function castReprieve(state: GameState, team: Team): GameState {
  if (!reprieveReady(state, team)) return state;
  const ownHalf = (unit: Unit) => team === "player" ? unit.x < WORLD_WIDTH / 2 : unit.x > WORLD_WIDTH / 2;
  const affectedUnits = state.units.map((unit) => unit.team === team ? unit : { ...unit, hp: ownHalf(unit) ? 0 : unit.hp * 0.68 });
  const defeated = affectedUnits.filter((unit) => unit.hp <= 0);
  const unitsLost = { ...state.stats.unitsLost };
  for (const unit of defeated) unitsLost[unit.team] += 1;
  const units = affectedUnits.filter((unit) => unit.hp > 0);
  const keep = KEEP_POSITIONS[team];
  const next = {
    ...state,
    units,
    reprieveUsed: { ...state.reprieveUsed, [team]: true },
    effects: [...state.effects, { id: state.nextId, type: "reprieve" as const, x: keep.x, y: keep.y, life: 1.5, team }],
    nextId: state.nextId + 1,
    stats: { ...state.stats, unitsLost },
  };
  return withEvent(next, team === "player" ? "Reprieve! Every invader on your half is swept back into the ledger." : "Nightveil invoked Reprieve.");
}

function resolveMatch(state: GameState): GameState {
  if (state.keeps.enemy <= 0) return withEvent({ ...state, status: "won" }, "Nightveil's Anchorhold has fallen.");
  if (state.keeps.player <= 0) return withEvent({ ...state, status: "lost" }, "Your Anchorhold has fallen.");
  if (state.elapsed < MATCH_LIMIT) return state;
  const playerScore = state.keeps.player + buildingCount(state, "player") * 55;
  const enemyScore = state.keeps.enemy + buildingCount(state, "enemy") * 55;
  return withEvent({ ...state, status: playerScore > enemyScore ? "won" : "lost" }, playerScore > enemyScore ? "The ledger closes in Daybreak's favor." : "The ledger closes in Nightveil's favor.");
}

export function stepGame(input: GameState, dt: number): GameState {
  if (input.status !== "playing" || !input.started) return input;
  const safeDt = Math.max(0, Math.min(0.2, dt));
  let state: GameState = {
    ...input,
    elapsed: input.elapsed + safeDt,
    incomeClock: input.incomeClock - safeDt,
    aiClock: input.aiClock - safeDt,
    keepDefenseClock: input.keepDefenseClock - safeDt,
    buildings: input.buildings.map((building) => ({ ...building, spawnClock: building.spawnClock - safeDt })),
  };

  if (state.incomeClock <= 0) {
    const playerYield = yieldFor(state, "player");
    const enemyYield = yieldFor(state, "enemy");
    state = {
      ...state,
      coins: { player: state.coins.player + playerYield, enemy: state.coins.enemy + enemyYield },
      incomeClock: state.incomeClock + 7,
      effects: [
        ...state.effects,
        { id: state.nextId, type: "yield", x: KEEP_POSITIONS.player.x, y: KEEP_POSITIONS.player.y, life: 0.8, team: "player" },
        { id: state.nextId + 1, type: "yield", x: KEEP_POSITIONS.enemy.x, y: KEEP_POSITIONS.enemy.y, life: 0.8, team: "enemy" },
      ],
      nextId: state.nextId + 2,
    };
  }

  if (state.aiClock <= 0) {
    state = runAi(state);
    state = { ...state, aiClock: 5.8 };
  }

  const readyBuildings = state.buildings.filter((building) => BUILDING_SPECS[building.kind].unitKind && building.spawnClock <= 0);
  for (const snapshot of readyBuildings) {
    const current = state.buildings.find((building) => building.id === snapshot.id);
    if (!current) continue;
    state = spawnUnit(state, current);
    state = {
      ...state,
      buildings: state.buildings.map((building) => building.id === current.id ? { ...building, spawnClock: (BUILDING_SPECS[building.kind].spawnEvery ?? 8) } : building),
    };
  }

  state = simulateCombat(state, safeDt);

  if (state.keepDefenseClock <= 0) {
    state = applyKeepDefense(state);
    state = { ...state, keepDefenseClock: 1.25 };
  }

  const playerRaiders = state.units.filter((unit) => unit.team === "player" && unit.x > 1080).length;
  if (reprieveReady(state, "enemy") && playerRaiders >= 5) state = castReprieve(state, "enemy");

  if (state.elapsed >= 210) {
    const playerFront = state.units.filter((unit) => unit.team === "player").reduce((front, unit) => Math.max(front, unit.x), cellCenter(GATE_CELLS.player).x);
    const enemyFront = state.units.filter((unit) => unit.team === "enemy").reduce((front, unit) => Math.min(front, unit.x), cellCenter(GATE_CELLS.enemy).x);
    const line = (playerFront + enemyFront) / 2;
    if (line > WORLD_WIDTH / 2 + 20) state.keeps.enemy = Math.max(0, state.keeps.enemy - (line - (WORLD_WIDTH / 2 + 20)) * 0.009 * safeDt);
    if (line < WORLD_WIDTH / 2 - 20) state.keeps.player = Math.max(0, state.keeps.player - ((WORLD_WIDTH / 2 - 20) - line) * 0.009 * safeDt);
    if (input.elapsed < 210) state = withEvent(state, "Final Yield: the road now presses directly against the weaker Anchorhold.");
  }

  return resolveMatch(state);
}

export function matchReport(state: GameState, playtestAnswer?: string): string {
  return [
    "MUSTERHOLD CLOSED ALPHA — MATCH REPORT",
    `Result: ${state.status === "won" ? "Daybreak victory" : state.status === "lost" ? "Nightveil victory" : "in progress"}`,
    `Duration: ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, "0")}`,
    `Anchorholds: Daybreak ${Math.ceil(state.keeps.player)} / Nightveil ${Math.ceil(state.keeps.enemy)}`,
    `Foundries placed: ${state.stats.buildingsPlaced.player} / ${state.stats.buildingsPlaced.enemy}`,
    `Foundries lost: ${state.stats.buildingsLost.player} / ${state.stats.buildingsLost.enemy}`,
    `Cohorts raised: ${state.stats.unitsSpawned.player} / ${state.stats.unitsSpawned.enemy}`,
    `Cohorts lost: ${state.stats.unitsLost.player} / ${state.stats.unitsLost.enemy}`,
    `Reprieve used: ${state.reprieveUsed.player ? "yes" : "no"}`,
    `What felt decisive: ${playtestAnswer || "not answered"}`,
    "Build: alpha-0.1.0",
  ].join("\n");
}
