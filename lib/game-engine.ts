export const UNIT_KINDS = ["kilnward", "windlass", "prism"] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];
export type Team = "player" | "enemy";
export type MatchStatus = "playing" | "won" | "lost";
export type DamageType = "Impact" | "Volley" | "Surge";
export type ArmorType = "Plated" | "Layered" | "Woven";

export interface UnitSpec {
  name: string;
  company: string;
  description: string;
  damageType: DamageType;
  armorType: ArmorType;
  cost: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackEvery: number;
  spawnEvery: number;
  hotkey: string;
}

export const UNIT_SPECS: Record<UnitKind, UnitSpec> = {
  kilnward: {
    name: "Kilnward",
    company: "Cinder Wardens",
    description: "Sturdy plated guardians. Surge attacks crack their ceramic shells.",
    damageType: "Impact",
    armorType: "Plated",
    cost: 80,
    maxHp: 250,
    damage: 31,
    range: 24,
    speed: 15,
    attackEvery: 1,
    spawnEvery: 6.2,
    hotkey: "1",
  },
  windlass: {
    name: "Windlass",
    company: "Ribbon Lancers",
    description: "Long-range woven skirmishers. Impact attacks scatter their frame.",
    damageType: "Volley",
    armorType: "Layered",
    cost: 120,
    maxHp: 145,
    damage: 27,
    range: 96,
    speed: 12.5,
    attackEvery: 1.15,
    spawnEvery: 7.5,
    hotkey: "2",
  },
  prism: {
    name: "Prism Well",
    company: "Tidelens Oracles",
    description: "Slow stormglass casters. Volley attacks unravel their woven mantle.",
    damageType: "Surge",
    armorType: "Woven",
    cost: 160,
    maxHp: 115,
    damage: 48,
    range: 82,
    speed: 10.5,
    attackEvery: 1.5,
    spawnEvery: 9,
    hotkey: "3",
  },
};

export interface Unit {
  id: number;
  team: Team;
  kind: UnitKind;
  x: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  attackFlash: number;
}

export type WorkCounts = Record<UnitKind, number>;

export interface GameState {
  status: MatchStatus;
  elapsed: number;
  playerCoin: number;
  enemyCoin: number;
  playerKeep: number;
  enemyKeep: number;
  works: Record<Team, WorkCounts>;
  spawnClocks: Record<Team, Record<UnitKind, number>>;
  units: Unit[];
  economyClock: number;
  aiClock: number;
  keepDefenseClock: number;
  stormUsed: Record<Team, boolean>;
  nextId: number;
  event: string;
  eventSerial: number;
}

export const KEEP_MAX_HP = 1400;
export const STORM_READY_AT = 28;
export const MAX_WORKS = 8;
export const MATCH_LIMIT = 240;

const COUNTERS: Record<DamageType, ArmorType> = {
  Impact: "Layered",
  Volley: "Woven",
  Surge: "Plated",
};

const COUNTER_PICK: Record<UnitKind, UnitKind> = {
  kilnward: "prism",
  windlass: "kilnward",
  prism: "windlass",
};

function emptyWorks(): WorkCounts {
  return { kilnward: 0, windlass: 0, prism: 0 };
}

function emptySpawnClocks(): Record<UnitKind, number> {
  return { kilnward: 0, windlass: 0, prism: 0 };
}

export function createInitialState(): GameState {
  return {
    status: "playing",
    elapsed: 0,
    playerCoin: 300,
    enemyCoin: 320,
    playerKeep: KEEP_MAX_HP,
    enemyKeep: KEEP_MAX_HP,
    works: { player: emptyWorks(), enemy: emptyWorks() },
    spawnClocks: { player: emptySpawnClocks(), enemy: emptySpawnClocks() },
    units: [],
    economyClock: 5,
    aiClock: 0.8,
    keepDefenseClock: 1.4,
    stormUsed: { player: false, enemy: false },
    nextId: 1,
    event: "Raise your first Musterwork.",
    eventSerial: 1,
  };
}

export function totalWorks(works: WorkCounts): number {
  return UNIT_KINDS.reduce((total, kind) => total + works[kind], 0);
}

export function levyFor(works: WorkCounts): number {
  return 36 + totalWorks(works) * 6;
}

export function stormReady(state: GameState, team: Team): boolean {
  return state.status === "playing" && state.elapsed >= STORM_READY_AT && !state.stormUsed[team];
}

export function damageMultiplier(attackerKind: UnitKind, defenderKind: UnitKind): number {
  const attacker = UNIT_SPECS[attackerKind];
  const defender = UNIT_SPECS[defenderKind];
  if (COUNTERS[attacker.damageType] === defender.armorType) return 1.75;
  if (COUNTERS[defender.damageType] === attacker.armorType) return 0.72;
  return 1;
}

function withEvent(state: GameState, event: string): GameState {
  return { ...state, event, eventSerial: state.eventSerial + 1 };
}

export function purchaseWork(state: GameState, team: Team, kind: UnitKind): GameState {
  if (state.status !== "playing" || totalWorks(state.works[team]) >= MAX_WORKS) return state;

  const coinKey = team === "player" ? "playerCoin" : "enemyCoin";
  const cost = UNIT_SPECS[kind].cost;
  if (state[coinKey] < cost) return state;

  const wasEmpty = state.works[team][kind] === 0;
  const works = {
    ...state.works,
    [team]: { ...state.works[team], [kind]: state.works[team][kind] + 1 },
  };
  const spawnClocks = wasEmpty
    ? {
        ...state.spawnClocks,
        [team]: { ...state.spawnClocks[team], [kind]: 1.25 },
      }
    : state.spawnClocks;

  const next = {
    ...state,
    [coinKey]: state[coinKey] - cost,
    works,
    spawnClocks,
  } as GameState;

  if (team === "enemy") return next;
  return withEvent(next, `${UNIT_SPECS[kind].name} raised — ${UNIT_SPECS[kind].company} will muster automatically.`);
}

function addUnit(state: GameState, team: Team, kind: UnitKind): GameState {
  const spec = UNIT_SPECS[kind];
  const unit: Unit = {
    id: state.nextId,
    team,
    kind,
    x: team === "player" ? 145 : 855,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    cooldown: 0.25 + (state.nextId % 3) * 0.12,
    attackFlash: 0,
  };
  return { ...state, units: [...state.units, unit], nextId: state.nextId + 1 };
}

function dominantWork(works: WorkCounts): UnitKind | null {
  let dominant: UnitKind | null = null;
  let value = 0;
  for (const kind of UNIT_KINDS) {
    if (works[kind] > value) {
      dominant = kind;
      value = works[kind];
    }
  }
  return dominant;
}

function runAiPurchase(state: GameState): GameState {
  if (totalWorks(state.works.enemy) >= MAX_WORKS) return state;
  const playerFocus = dominantWork(state.works.player);
  const desired = playerFocus ? COUNTER_PICK[playerFocus] : UNIT_KINDS[totalWorks(state.works.enemy) % UNIT_KINDS.length];
  const affordable = [desired, ...UNIT_KINDS]
    .filter((kind, index, all) => all.indexOf(kind) === index)
    .find((kind) => UNIT_SPECS[kind].cost <= state.enemyCoin);
  return affordable ? purchaseWork(state, "enemy", affordable) : state;
}

function applyKeepDefense(state: GameState): GameState {
  const units = state.units.map((unit) => ({ ...unit }));
  const playerThreats = units.filter((unit) => unit.team === "enemy" && unit.x < 240 && unit.hp > 0).sort((a, b) => a.x - b.x);
  const enemyThreats = units.filter((unit) => unit.team === "player" && unit.x > 760 && unit.hp > 0).sort((a, b) => b.x - a.x);
  if (playerThreats[0]) playerThreats[0].hp -= 34;
  if (enemyThreats[0]) enemyThreats[0].hp -= 34;
  return { ...state, units: units.filter((unit) => unit.hp > 0) };
}

function simulateCombat(state: GameState, dt: number): GameState {
  let playerKeep = state.playerKeep;
  let enemyKeep = state.enemyKeep;
  const units = state.units.map((unit) => ({
    ...unit,
    cooldown: Math.max(0, unit.cooldown - dt),
    attackFlash: Math.max(0, unit.attackFlash - dt),
  }));

  for (const unit of units) {
    if (unit.hp <= 0) continue;
    const spec = UNIT_SPECS[unit.kind];
    const enemies = units.filter((candidate) => candidate.team !== unit.team && candidate.hp > 0);
    const target = enemies.reduce<Unit | null>((closest, candidate) => {
      if (!closest) return candidate;
      return Math.abs(candidate.x - unit.x) < Math.abs(closest.x - unit.x) ? candidate : closest;
    }, null);
    const targetDistance = target ? Math.abs(target.x - unit.x) : Number.POSITIVE_INFINITY;

    if (target && targetDistance <= spec.range) {
      if (unit.cooldown <= 0) {
        target.hp -= spec.damage * damageMultiplier(unit.kind, target.kind);
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.18;
      }
      continue;
    }

    const atEnemyKeep = unit.team === "player" ? unit.x >= 855 : unit.x <= 145;
    if (atEnemyKeep) {
      if (unit.cooldown <= 0) {
        if (unit.team === "player") enemyKeep -= spec.damage * 0.9;
        else playerKeep -= spec.damage * 0.9;
        unit.cooldown = spec.attackEvery;
        unit.attackFlash = 0.18;
      }
      continue;
    }

    const direction = unit.team === "player" ? 1 : -1;
    unit.x = Math.max(130, Math.min(870, unit.x + direction * spec.speed * dt));
  }

  const playerFront = units
    .filter((unit) => unit.team === "player" && unit.hp > 0)
    .reduce((front, unit) => Math.max(front, unit.x), 145);
  const enemyFront = units
    .filter((unit) => unit.team === "enemy" && unit.hp > 0)
    .reduce((front, unit) => Math.min(front, unit.x), 855);
  if (playerFront > 145 && enemyFront < 855) {
    const battleLine = (playerFront + enemyFront) / 2;
    const pressure = state.elapsed >= 90 ? 0.25 : 0.11;
    if (battleLine > 515) enemyKeep -= (battleLine - 515) * pressure * dt;
    if (battleLine < 485) playerKeep -= (485 - battleLine) * pressure * dt;
  }

  return {
    ...state,
    playerKeep: Math.max(0, playerKeep),
    enemyKeep: Math.max(0, enemyKeep),
    units: units.filter((unit) => unit.hp > 0),
  };
}

export function castStormbreak(state: GameState, team: Team): GameState {
  if (!stormReady(state, team)) return state;
  const isPlayer = team === "player";
  const units = state.units
    .map((unit) => {
      if (unit.team === team) return unit;
      const onCasterHalf = isPlayer ? unit.x < 500 : unit.x > 500;
      return { ...unit, hp: onCasterHalf ? 0 : unit.hp * 0.62 };
    })
    .filter((unit) => unit.hp > 0);
  const next = {
    ...state,
    units,
    stormUsed: { ...state.stormUsed, [team]: true },
  };
  return withEvent(next, team === "player" ? "Stormbreak! The rival line is torn from your half." : "The rival Steward unleashed Stormbreak.");
}

function resolveStatus(state: GameState): GameState {
  if (state.enemyKeep <= 0) return withEvent({ ...state, status: "won" }, "The Gloamkeep is broken. Victory!");
  if (state.playerKeep <= 0) return withEvent({ ...state, status: "lost" }, "Your Heartkeep has fallen.");
  if (state.elapsed < MATCH_LIMIT) return state;
  const won = state.playerKeep >= state.enemyKeep;
  return withEvent({ ...state, status: won ? "won" : "lost" }, won ? "The storm clears with your keep standing strongest." : "The storm clears in the rival's favor.");
}

export function stepGame(input: GameState, dt: number): GameState {
  if (input.status !== "playing") return input;
  const safeDt = Math.max(0, Math.min(dt, 0.25));
  let state: GameState = {
    ...input,
    elapsed: input.elapsed + safeDt,
    economyClock: input.economyClock - safeDt,
    aiClock: input.aiClock - safeDt,
    keepDefenseClock: input.keepDefenseClock - safeDt,
    spawnClocks: {
      player: { ...input.spawnClocks.player },
      enemy: { ...input.spawnClocks.enemy },
    },
  };

  if (state.economyClock <= 0) {
    state = {
      ...state,
      playerCoin: state.playerCoin + levyFor(state.works.player),
      enemyCoin: state.enemyCoin + levyFor(state.works.enemy),
      economyClock: state.economyClock + 5,
    };
  }

  if (state.aiClock <= 0) {
    state = runAiPurchase(state);
    state = { ...state, aiClock: 3.6 };
  }

  for (const team of ["player", "enemy"] as const) {
    for (const kind of UNIT_KINDS) {
      const count = state.works[team][kind];
      if (count === 0) continue;
      state.spawnClocks[team][kind] -= safeDt;
      if (state.spawnClocks[team][kind] <= 0) {
        const currentTeamUnits = state.units.filter((unit) => unit.team === team).length;
        const spawnCount = Math.min(count, Math.max(0, 40 - currentTeamUnits));
        for (let i = 0; i < spawnCount; i += 1) state = addUnit(state, team, kind);
        state.spawnClocks[team][kind] += UNIT_SPECS[kind].spawnEvery;
      }
    }
  }

  state = simulateCombat(state, safeDt);

  if (input.elapsed < 90 && state.elapsed >= 90) {
    state = withEvent(state, "The Stormveil tightens — lane pressure now bites deeper into each Heartkeep.");
  }

  if (state.keepDefenseClock <= 0) {
    state = applyKeepDefense(state);
    state = { ...state, keepDefenseClock: 1.35 };
  }

  const playerRaiders = state.units.filter((unit) => unit.team === "player" && unit.x > 620).length;
  if (stormReady(state, "enemy") && playerRaiders >= 4) state = castStormbreak(state, "enemy");

  return resolveStatus(state);
}
