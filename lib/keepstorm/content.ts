/** Canonical Keepstorm faction, cohort, structure, and item definitions. */
export type FactionId = "daybreak" | "briarcrown" | "stormglass";
export type DamageType = "Hammer" | "Arrow" | "Arc" | "Siege" | "Pure";
export type ArmorType = "Plate" | "Cloth" | "Ward" | "Fortified" | "Ethereal";
export type UnitRole = "vanguard" | "ranged" | "support" | "air" | "siege";
export type UnitAbility = "bulwark" | "volley" | "chain" | "evasion" | "splash" | "regrowth" | "poison" | "slow" | "lifedrain" | "stun" | "haste";
export type BuildingCategory = "troop" | "special" | "tower" | "economy";
export type BuildingEffect = "none" | "aegis" | "renewal" | "tempest" | "tower" | "income";

export interface ResourceCost {
  marks: number;
  timber?: number;
  sigils?: number;
}

export interface UnitSpec {
  name: string;
  faction: FactionId;
  role: UnitRole;
  damageType: DamageType;
  armorType: ArmorType;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackEvery: number;
  atlasIndex: number;
  flying?: boolean;
  targetsAir?: boolean;
  ability?: UnitAbility;
  abilityPower?: number;
  abilityRadius?: number;
  bounty: number;
  description: string;
}

const UNIT_DEFINITIONS = {
  ramguard: { name: "Ramguard", faction: "daybreak", role: "vanguard", damageType: "Hammer", armorType: "Ward", maxHp: 360, damage: 42, range: 45, speed: 60, attackEvery: 1.15, atlasIndex: 8, ability: "bulwark", abilityPower: 0.22, bounty: 12, description: "A warded front-liner that hardens below half health." },
  quillrunner: { name: "Quillrunner", faction: "daybreak", role: "ranged", damageType: "Arrow", armorType: "Plate", maxHp: 185, damage: 31, range: 150, speed: 76, attackEvery: 1.02, atlasIndex: 9, targetsAir: true, ability: "volley", abilityPower: 0.35, bounty: 11, description: "A disciplined marksman with bonus pressure against flying cohorts." },
  wispwright: { name: "Wispwright", faction: "daybreak", role: "support", damageType: "Arc", armorType: "Cloth", maxHp: 150, damage: 49, range: 128, speed: 64, attackEvery: 1.42, atlasIndex: 10, targetsAir: true, ability: "chain", abilityPower: 0.42, abilityRadius: 92, bounty: 13, description: "An arc caster whose attacks jump into a second target." },
  galeskiff: { name: "Galeskiff", faction: "daybreak", role: "air", damageType: "Arrow", armorType: "Ethereal", maxHp: 148, damage: 35, range: 166, speed: 84, attackEvery: 1.08, atlasIndex: 11, flying: true, targetsAir: true, ability: "evasion", abilityPower: 0.18, bounty: 14, description: "A swift flying skirmisher that sometimes evades incoming attacks." },
  cinder_mortar: { name: "Cinder Mortar", faction: "daybreak", role: "siege", damageType: "Siege", armorType: "Plate", maxHp: 238, damage: 72, range: 226, speed: 46, attackEvery: 2.25, atlasIndex: 12, ability: "splash", abilityPower: 0.48, abilityRadius: 84, bounty: 18, description: "A slow bombard that splashes formations and crushes structures." },

  barkmaul: { name: "Barkmaul", faction: "briarcrown", role: "vanguard", damageType: "Hammer", armorType: "Plate", maxHp: 430, damage: 37, range: 43, speed: 54, attackEvery: 1.2, atlasIndex: 8, ability: "regrowth", abilityPower: 5.5, bounty: 13, description: "A living bulwark that steadily regrows lost health." },
  thorncaster: { name: "Thorncaster", faction: "briarcrown", role: "ranged", damageType: "Arrow", armorType: "Cloth", maxHp: 174, damage: 27, range: 158, speed: 70, attackEvery: 0.96, atlasIndex: 9, targetsAir: true, ability: "poison", abilityPower: 7, bounty: 11, description: "A rapid ranged cohort whose thorns leave a damaging toxin." },
  bogseer: { name: "Bogseer", faction: "briarcrown", role: "support", damageType: "Arc", armorType: "Ward", maxHp: 194, damage: 42, range: 136, speed: 59, attackEvery: 1.36, atlasIndex: 10, targetsAir: true, ability: "slow", abilityPower: 0.28, bounty: 13, description: "A marsh oracle that slows whatever it strikes." },
  gloomwing: { name: "Gloomwing", faction: "briarcrown", role: "air", damageType: "Arc", armorType: "Ethereal", maxHp: 142, damage: 39, range: 152, speed: 81, attackEvery: 1.14, atlasIndex: 11, flying: true, targetsAir: true, ability: "lifedrain", abilityPower: 0.24, bounty: 14, description: "A flying predator that restores health through damage dealt." },
  rootbreaker: { name: "Rootbreaker", faction: "briarcrown", role: "siege", damageType: "Siege", armorType: "Fortified", maxHp: 292, damage: 65, range: 214, speed: 42, attackEvery: 2.05, atlasIndex: 12, ability: "splash", abilityPower: 0.4, abilityRadius: 76, bounty: 18, description: "A rooted artillery beast with fortified armor and heavy splash." },

  voltstrider: { name: "Voltstrider", faction: "stormglass", role: "vanguard", damageType: "Hammer", armorType: "Plate", maxHp: 292, damage: 45, range: 48, speed: 72, attackEvery: 1.04, atlasIndex: 8, ability: "stun", abilityPower: 0.16, bounty: 12, description: "A fast shock trooper that can briefly stun its target." },
  glassbolt: { name: "Glassbolt", faction: "stormglass", role: "ranged", damageType: "Arrow", armorType: "Cloth", maxHp: 152, damage: 26, range: 172, speed: 74, attackEvery: 0.82, atlasIndex: 9, targetsAir: true, ability: "volley", abilityPower: 0.28, bounty: 11, description: "A fragile, extremely fast marksman with anti-air precision." },
  timebinder: { name: "Timebinder", faction: "stormglass", role: "support", damageType: "Arc", armorType: "Ward", maxHp: 168, damage: 38, range: 145, speed: 62, attackEvery: 1.22, atlasIndex: 10, targetsAir: true, ability: "haste", abilityPower: 0.16, abilityRadius: 118, bounty: 13, description: "A support caster that accelerates nearby allied attacks." },
  stormray: { name: "Stormray", faction: "stormglass", role: "air", damageType: "Arc", armorType: "Ethereal", maxHp: 136, damage: 43, range: 160, speed: 88, attackEvery: 1.18, atlasIndex: 11, flying: true, targetsAir: true, ability: "chain", abilityPower: 0.36, abilityRadius: 105, bounty: 15, description: "A flying arc hunter whose lightning leaps through formations." },
  railthunder: { name: "Railthunder", faction: "stormglass", role: "siege", damageType: "Siege", armorType: "Fortified", maxHp: 248, damage: 82, range: 238, speed: 44, attackEvery: 2.4, atlasIndex: 12, ability: "splash", abilityPower: 0.56, abilityRadius: 90, bounty: 19, description: "Long-range siege machinery with the strongest formation blast." },
} as const satisfies Record<string, UnitSpec>;

export type UnitKind = keyof typeof UNIT_DEFINITIONS;
export const UNIT_SPECS: Record<UnitKind, UnitSpec> = UNIT_DEFINITIONS;

export interface BuildingSpec {
  name: string;
  faction: FactionId;
  category: BuildingCategory;
  cohort: string | null;
  cost: ResourceCost;
  upgradeCost: ResourceCost;
  legendaryCost: ResourceCost;
  width: number;
  height: number;
  maxHp: number;
  spawnEvery: number | null;
  unitKind: UnitKind | null;
  yieldBonus: number;
  timberGain: number;
  atlasIndex: number;
  effect: BuildingEffect;
  description: string;
}

const troop = (spec: Omit<BuildingSpec, "category" | "effect">): BuildingSpec => ({ ...spec, category: "troop", effect: "none" });

export const BUILDING_SPECS = {
  dawn_bastion: troop({ name: "Ram Bastion", faction: "daybreak", cohort: "Ramguards", cost: { marks: 110 }, upgradeCost: { marks: 150, timber: 45 }, legendaryCost: { marks: 280, timber: 110, sigils: 1 }, width: 3, height: 3, maxHp: 680, spawnEvery: 14, unitKind: "ramguard", yieldBonus: 4, timberGain: 20, atlasIndex: 0, description: "Durable Hammer vanguards with a low-health bulwark." }),
  dawn_quillery: troop({ name: "Quill Gallery", faction: "daybreak", cohort: "Quillrunners", cost: { marks: 125 }, upgradeCost: { marks: 165, timber: 50 }, legendaryCost: { marks: 300, timber: 120, sigils: 1 }, width: 3, height: 3, maxHp: 540, spawnEvery: 13, unitKind: "quillrunner", yieldBonus: 5, timberGain: 22, atlasIndex: 1, description: "Fast Arrow marksmen that punish Cloth and flying cohorts." }),
  dawn_beacon: troop({ name: "Beaconarium", faction: "daybreak", cohort: "Wispwrights", cost: { marks: 145 }, upgradeCost: { marks: 180, timber: 55 }, legendaryCost: { marks: 325, timber: 130, sigils: 1 }, width: 3, height: 3, maxHp: 500, spawnEvery: 15, unitKind: "wispwright", yieldBonus: 6, timberGain: 24, atlasIndex: 2, description: "Arc support whose attacks chain between nearby enemies." }),
  dawn_aerie: troop({ name: "Gale Aerie", faction: "daybreak", cohort: "Galeskiffs", cost: { marks: 170 }, upgradeCost: { marks: 205, timber: 65 }, legendaryCost: { marks: 350, timber: 145, sigils: 1 }, width: 3, height: 3, maxHp: 470, spawnEvery: 17, unitKind: "galeskiff", yieldBonus: 7, timberGain: 26, atlasIndex: 3, description: "Evasive flying skirmishers that bypass ground-only attackers." }),
  dawn_bombard: troop({ name: "Cinder Bombard", faction: "daybreak", cohort: "Cinder Mortars", cost: { marks: 205, timber: 30 }, upgradeCost: { marks: 235, timber: 75 }, legendaryCost: { marks: 390, timber: 165, sigils: 1 }, width: 3, height: 3, maxHp: 620, spawnEvery: 21, unitKind: "cinder_mortar", yieldBonus: 8, timberGain: 12, atlasIndex: 4, description: "Long-range Siege volleys that splash units and break structures." }),
  dawn_aegis: { name: "Aegis Loom", faction: "daybreak", category: "special", cohort: null, cost: { marks: 190, timber: 95 }, upgradeCost: { marks: 210, timber: 80 }, legendaryCost: { marks: 290, timber: 120 }, width: 2, height: 2, maxHp: 500, spawnEvery: null, unitKind: null, yieldBonus: 4, timberGain: 0, atlasIndex: 5, effect: "aegis", description: "Periodically shields the weakest allied cohorts on your half." },
  dawn_tally: { name: "Tallyhouse", faction: "daybreak", category: "economy", cohort: null, cost: { marks: 145 }, upgradeCost: { marks: 190, timber: 30 }, legendaryCost: { marks: 310, timber: 80 }, width: 2, height: 2, maxHp: 430, spawnEvery: null, unitKind: null, yieldBonus: 24, timberGain: 16, atlasIndex: 6, effect: "income", description: "Raises every income payment but produces no fighting cohort." },
  dawn_sunlance: { name: "Sunlance Tower", faction: "daybreak", category: "tower", cohort: null, cost: { marks: 175, timber: 80 }, upgradeCost: { marks: 205, timber: 70 }, legendaryCost: { marks: 300, timber: 110 }, width: 2, height: 2, maxHp: 760, spawnEvery: null, unitKind: null, yieldBonus: 3, timberGain: 0, atlasIndex: 7, effect: "tower", description: "A defensive bolt tower, powerful nearby but vulnerable to Siege." },

  briar_hollow: troop({ name: "Bark Hollow", faction: "briarcrown", cohort: "Barkmauls", cost: { marks: 112 }, upgradeCost: { marks: 150, timber: 45 }, legendaryCost: { marks: 280, timber: 110, sigils: 1 }, width: 3, height: 3, maxHp: 720, spawnEvery: 15, unitKind: "barkmaul", yieldBonus: 4, timberGain: 20, atlasIndex: 0, description: "Regenerating Hammer tanks with exceptional staying power." }),
  briar_sporecourt: troop({ name: "Sporecourt", faction: "briarcrown", cohort: "Thorncasters", cost: { marks: 122 }, upgradeCost: { marks: 160, timber: 50 }, legendaryCost: { marks: 295, timber: 118, sigils: 1 }, width: 3, height: 3, maxHp: 550, spawnEvery: 13, unitKind: "thorncaster", yieldBonus: 5, timberGain: 22, atlasIndex: 1, description: "Poisoning Arrow cohorts that excel in prolonged fights." }),
  briar_mirepool: troop({ name: "Mire Oracle", faction: "briarcrown", cohort: "Bogseers", cost: { marks: 148 }, upgradeCost: { marks: 182, timber: 56 }, legendaryCost: { marks: 330, timber: 132, sigils: 1 }, width: 3, height: 3, maxHp: 520, spawnEvery: 16, unitKind: "bogseer", yieldBonus: 6, timberGain: 24, atlasIndex: 2, description: "Arc casters that slow enemy movement and attack cadence." }),
  briar_mothery: troop({ name: "Gloom Mothery", faction: "briarcrown", cohort: "Gloomwings", cost: { marks: 168 }, upgradeCost: { marks: 205, timber: 65 }, legendaryCost: { marks: 355, timber: 145, sigils: 1 }, width: 3, height: 3, maxHp: 480, spawnEvery: 17, unitKind: "gloomwing", yieldBonus: 7, timberGain: 26, atlasIndex: 3, description: "Flying Arc predators that drain life from their targets." }),
  briar_rootcannon: troop({ name: "Rootcannon", faction: "briarcrown", cohort: "Rootbreakers", cost: { marks: 210, timber: 28 }, upgradeCost: { marks: 238, timber: 76 }, legendaryCost: { marks: 395, timber: 165, sigils: 1 }, width: 3, height: 3, maxHp: 680, spawnEvery: 22, unitKind: "rootbreaker", yieldBonus: 8, timberGain: 12, atlasIndex: 4, description: "Fortified living artillery that sends roots through formations." }),
  briar_heartgrove: { name: "Heartgrove", faction: "briarcrown", category: "special", cohort: null, cost: { marks: 188, timber: 96 }, upgradeCost: { marks: 208, timber: 82 }, legendaryCost: { marks: 288, timber: 120 }, width: 2, height: 2, maxHp: 560, spawnEvery: null, unitKind: null, yieldBonus: 4, timberGain: 0, atlasIndex: 5, effect: "renewal", description: "Restores wounded allied cohorts with recurring waves of renewal." },
  briar_sapvault: { name: "Sapvault", faction: "briarcrown", category: "economy", cohort: null, cost: { marks: 142 }, upgradeCost: { marks: 188, timber: 30 }, legendaryCost: { marks: 305, timber: 78 }, width: 2, height: 2, maxHp: 470, spawnEvery: null, unitKind: null, yieldBonus: 23, timberGain: 18, atlasIndex: 6, effect: "income", description: "Stores living resin, increasing both income and timber flow." },
  briar_thornspire: { name: "Thornspire", faction: "briarcrown", category: "tower", cohort: null, cost: { marks: 170, timber: 82 }, upgradeCost: { marks: 202, timber: 72 }, legendaryCost: { marks: 296, timber: 110 }, width: 2, height: 2, maxHp: 800, spawnEvery: null, unitKind: null, yieldBonus: 3, timberGain: 0, atlasIndex: 7, effect: "tower", description: "A defensive thorn tower whose attacks poison nearby invaders." },

  storm_coilforge: troop({ name: "Coilforge", faction: "stormglass", cohort: "Voltstriders", cost: { marks: 108 }, upgradeCost: { marks: 148, timber: 45 }, legendaryCost: { marks: 278, timber: 108, sigils: 1 }, width: 3, height: 3, maxHp: 640, spawnEvery: 13, unitKind: "voltstrider", yieldBonus: 4, timberGain: 20, atlasIndex: 0, description: "Fast Hammer troops whose charged blows can stun." }),
  storm_prismary: troop({ name: "Prismary", faction: "stormglass", cohort: "Glassbolts", cost: { marks: 128 }, upgradeCost: { marks: 168, timber: 50 }, legendaryCost: { marks: 305, timber: 120, sigils: 1 }, width: 3, height: 3, maxHp: 510, spawnEvery: 12, unitKind: "glassbolt", yieldBonus: 5, timberGain: 22, atlasIndex: 1, description: "Very fast Arrow fire from fragile long-range cohorts." }),
  storm_chronowell: troop({ name: "Chronowell", faction: "stormglass", cohort: "Timebinders", cost: { marks: 152 }, upgradeCost: { marks: 188, timber: 58 }, legendaryCost: { marks: 336, timber: 134, sigils: 1 }, width: 3, height: 3, maxHp: 500, spawnEvery: 16, unitKind: "timebinder", yieldBonus: 6, timberGain: 24, atlasIndex: 2, description: "Arc support that accelerates nearby allied attack cycles." }),
  storm_nimbus: troop({ name: "Nimbus Dock", faction: "stormglass", cohort: "Stormrays", cost: { marks: 174 }, upgradeCost: { marks: 210, timber: 66 }, legendaryCost: { marks: 360, timber: 148, sigils: 1 }, width: 3, height: 3, maxHp: 455, spawnEvery: 18, unitKind: "stormray", yieldBonus: 7, timberGain: 26, atlasIndex: 3, description: "Flying Arc hunters with chain lightning attacks." }),
  storm_railworks: troop({ name: "Railworks", faction: "stormglass", cohort: "Railthunders", cost: { marks: 215, timber: 32 }, upgradeCost: { marks: 245, timber: 78 }, legendaryCost: { marks: 405, timber: 170, sigils: 1 }, width: 3, height: 3, maxHp: 600, spawnEvery: 23, unitKind: "railthunder", yieldBonus: 8, timberGain: 12, atlasIndex: 4, description: "The longest-ranged Siege cohort, built to erase dense waves." }),
  storm_static_spire: { name: "Static Spire", faction: "stormglass", category: "special", cohort: null, cost: { marks: 194, timber: 98 }, upgradeCost: { marks: 214, timber: 84 }, legendaryCost: { marks: 298, timber: 124 }, width: 2, height: 2, maxHp: 480, spawnEvery: null, unitKind: null, yieldBonus: 4, timberGain: 0, atlasIndex: 5, effect: "tempest", description: "Discharges recurring pulses that damage and slow enemy cohorts." },
  storm_measurehouse: { name: "Measurehouse", faction: "stormglass", category: "economy", cohort: null, cost: { marks: 148 }, upgradeCost: { marks: 194, timber: 32 }, legendaryCost: { marks: 315, timber: 82 }, width: 2, height: 2, maxHp: 420, spawnEvery: null, unitKind: null, yieldBonus: 25, timberGain: 15, atlasIndex: 6, effect: "income", description: "Turns precise forecasting into the strongest pure income growth." },
  storm_arctower: { name: "Arc Tower", faction: "stormglass", category: "tower", cohort: null, cost: { marks: 178, timber: 84 }, upgradeCost: { marks: 210, timber: 74 }, legendaryCost: { marks: 305, timber: 114 }, width: 2, height: 2, maxHp: 720, spawnEvery: null, unitKind: null, yieldBonus: 3, timberGain: 0, atlasIndex: 7, effect: "tower", description: "A long-range defensive tower that strikes both ground and air." },
} as const satisfies Record<string, BuildingSpec>;

export type BuildingKind = keyof typeof BUILDING_SPECS;

export interface FactionSpec {
  id: FactionId;
  name: string;
  epithet: string;
  crest: string;
  emblem: string;
  color: string;
  accent: string;
  passive: string;
  description: string;
  atlas: string;
  buildings: readonly BuildingKind[];
}

export const FACTIONS: Record<FactionId, FactionSpec> = {
  daybreak: { id: "daybreak", name: "Daybreak Company", epithet: "Formation & protection", crest: "D", emblem: "/game/factions/daybreak-emblem-v1.png", color: "#f0bd48", accent: "#d34a2d", passive: "Ordered Ranks: nearby allies share 10% damage resistance.", description: "A balanced host of durable fronts, accurate ranged fire, air support, and protective engineering.", atlas: "/game/daybreak-depth-atlas.png", buildings: ["dawn_bastion", "dawn_quillery", "dawn_beacon", "dawn_aerie", "dawn_bombard", "dawn_aegis", "dawn_tally", "dawn_sunlance"] },
  briarcrown: { id: "briarcrown", name: "Briarcrown Covenant", epithet: "Regrowth & attrition", crest: "B", emblem: "/game/factions/briarcrown-emblem-v1.png", color: "#9bc95a", accent: "#d99145", passive: "Deep Roots: every living cohort regenerates health each second.", description: "A patient living army built around regeneration, poison, slowing magic, and fortified siege beasts.", atlas: "/game/briarcrown-depth-atlas.png", buildings: ["briar_hollow", "briar_sporecourt", "briar_mirepool", "briar_mothery", "briar_rootcannon", "briar_heartgrove", "briar_sapvault", "briar_thornspire"] },
  stormglass: { id: "stormglass", name: "Stormglass Collegium", epithet: "Tempo & disruption", crest: "S", emblem: "/game/factions/stormglass-emblem-v1.png", color: "#71e9c3", accent: "#6b78db", passive: "Quick Current: production and attack cycles run 8% faster.", description: "A volatile technical force of rapid fire, stuns, chain lightning, flight, and long-range artillery.", atlas: "/game/stormglass-depth-atlas.png", buildings: ["storm_coilforge", "storm_prismary", "storm_chronowell", "storm_nimbus", "storm_railworks", "storm_static_spire", "storm_measurehouse", "storm_arctower"] },
};

export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

export type ShopItemKind = "rally_horn" | "ember_flask" | "iron_writ" | "tempo_bell" | "sigil_shard";

export interface ShopItemSpec {
  name: string;
  cost: ResourceCost;
  description: string;
  permanent?: boolean;
}

export const SHOP_ITEMS: Record<ShopItemKind, ShopItemSpec> = {
  rally_horn: { name: "Rally Horn", cost: { marks: 260, timber: 90 }, description: "Permanent: allied cohorts gain 12% movement and attack speed.", permanent: true },
  ember_flask: { name: "Ember Flask", cost: { marks: 165, timber: 45 }, description: "Instant: burns every enemy cohort on your half for heavy damage." },
  iron_writ: { name: "Iron Writ", cost: { marks: 220, timber: 65 }, description: "Instant: restores 260 Keep health and grants temporary armor." },
  tempo_bell: { name: "Tempo Bell", cost: { marks: 190, timber: 75 }, description: "Instant: aligns active Foundries for one coordinated deployment." },
  sigil_shard: { name: "Sigil Shard", cost: { marks: 440, timber: 150 }, description: "Adds one Sigil, allowing another legendary Foundry upgrade." },
};

export const SHOP_ITEM_KINDS = Object.keys(SHOP_ITEMS) as ShopItemKind[];

export const DAMAGE_MATRIX: Record<DamageType, Record<ArmorType, number>> = {
  Hammer: { Plate: 1.6, Cloth: 1, Ward: 0.78, Fortified: 0.58, Ethereal: 0.66 },
  Arrow: { Plate: 0.76, Cloth: 1.6, Ward: 1, Fortified: 0.58, Ethereal: 1.2 },
  Arc: { Plate: 0.86, Cloth: 1, Ward: 1.6, Fortified: 0.62, Ethereal: 1.45 },
  Siege: { Plate: 0.88, Cloth: 0.8, Ward: 0.82, Fortified: 1.9, Ethereal: 0.5 },
  Pure: { Plate: 1, Cloth: 1, Ward: 1, Fortified: 1, Ethereal: 1 },
};
