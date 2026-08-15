import {
  BUILDING_SPECS,
  FACTIONS,
  ROUNDS_TO_WIN,
  SHOP_ITEMS,
  buyShopItem,
  canAfford,
  castReprieve,
  costForUpgrade,
  placeBuilding,
  reprieveReady,
  stepGame,
  toggleProduction,
  toggleSynchronization,
  upgradeBuilding,
  validatePlacement,
  type GameState,
  type Team,
} from "../musterhold/engine.ts";
import type { GameCommand, RoomPhase } from "./protocol.ts";

export interface CommandResult {
  accepted: boolean;
  state: GameState;
  message: string;
}

function reject(state: GameState, message: string): CommandResult {
  return { accepted: false, state, message };
}

function accept(state: GameState, team: Team, message: string): CommandResult {
  return {
    accepted: true,
    state: {
      ...state,
      event: `${FACTIONS[state.factions[team]].name}: ${message}`,
      eventSerial: state.eventSerial + 1,
    },
    message,
  };
}

export function applyGameCommand(state: GameState, team: Team, command: GameCommand): CommandResult {
  if (state.status !== "playing") return reject(state, "The round has already closed.");

  if (command.action === "place_building") {
    const validation = validatePlacement(state, team, command.kind, command.gridX, command.gridY);
    if (!validation.valid) return reject(state, validation.reason);
    return accept(placeBuilding(state, team, command.kind, command.gridX, command.gridY), team, `${BUILDING_SPECS[command.kind].name} commissioned.`);
  }

  if (command.action === "upgrade_building") {
    const building = state.buildings.find((candidate) => candidate.id === command.buildingId && candidate.team === team);
    if (!building) return reject(state, "That structure is not under your command.");
    const cost = costForUpgrade(building);
    if (!cost) return reject(state, "That structure is already Legendary.");
    if (!canAfford(state.resources[team], cost)) return reject(state, "The upgrade needs more Marks, Timber, or a Sigil.");
    return accept(upgradeBuilding(state, team, building.id), team, `${BUILDING_SPECS[building.kind].name} upgraded.`);
  }

  if (command.action === "toggle_production") {
    const building = state.buildings.find((candidate) => candidate.id === command.buildingId && candidate.team === team);
    if (!building || !BUILDING_SPECS[building.kind].unitKind) return reject(state, "Select one of your production structures.");
    return accept(toggleProduction(state, team, building.id), team, "Production timing updated.");
  }

  if (command.action === "toggle_sync") {
    if (!state.started) return reject(state, "Commission a structure before synchronizing cohorts.");
    return accept(toggleSynchronization(state, team), team, "Rally synchronization updated.");
  }

  if (command.action === "buy_item") {
    const item = SHOP_ITEMS[command.item];
    if (!canAfford(state.resources[team], item.cost)) return reject(state, "That commission needs more Marks or Timber.");
    if (command.item === "rally_horn" && state.rallyHorn[team]) return reject(state, "Your Rally Horn is already sounding.");
    return accept(buyShopItem(state, team, command.item), team, `${item.name} commissioned.`);
  }

  if (!reprieveReady(state, team)) return reject(state, "Reprieve is not ready.");
  return accept(castReprieve(state, team), team, "Reprieve invoked.");
}

export function advanceMultiplayerGame(state: GameState, elapsedSeconds: number): GameState {
  let next = state;
  let remaining = Math.max(0, Math.min(1, elapsedSeconds));
  while (remaining > 0.0001 && next.status === "playing") {
    const step = Math.min(0.05, remaining);
    next = stepGame(next, step, { runAi: false });
    remaining -= step;
  }
  return next;
}

export function phaseForGame(state: GameState): RoomPhase {
  if (state.status === "playing") return "playing";
  if (state.status === "round_won" || state.status === "round_lost") return "round_complete";
  return "match_complete";
}

export function forfeitGame(state: GameState, losingTeam: Team): GameState {
  const winner: Team = losingTeam === "player" ? "enemy" : "player";
  const roundWins = { ...state.roundWins, [winner]: ROUNDS_TO_WIN };
  return {
    ...state,
    roundWins,
    status: winner === "player" ? "won" : "lost",
    event: `${losingTeam === "player" ? "The western commander" : "The eastern commander"} did not reconnect. The match is forfeited.`,
    eventSerial: state.eventSerial + 1,
  };
}
