"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AtlasSprite from "./atlas-sprite";
import GameCanvas from "./game-canvas";
import { useMultiplayer } from "./use-multiplayer";
import { ROOM_CODE_LENGTH, normalizeRoomCode, seatsForMode, type OnlineMatchMode, type RoomSnapshot } from "@/lib/multiplayer/protocol";
import {
  BUILDING_CAP,
  BUILDING_SPECS,
  FACTIONS,
  FACTION_IDS,
  KEEP_MAX_HP,
  MATCH_LIMIT,
  REPRIEVE_READY_AT,
  SHOP_ITEMS,
  SHOP_ITEM_KINDS,
  UNIT_SPECS,
  buildingCount,
  buyShopItem,
  canAfford,
  castReprieve,
  commanderBuildingCount,
  commanderForBuilding,
  commanderLabel,
  commandersForTeam,
  costForUpgrade,
  createInitialState,
  factionBuildings,
  incomeFor,
  incomeForCommander,
  matchReport,
  placeBuilding,
  reprieveReady,
  startNextRound,
  stepGame,
  toggleProduction,
  toggleSynchronization,
  teamDisplayName,
  teamForCommander,
  unitCount,
  upgradeBuilding,
  type Building,
  type BuildingKind,
  type CommanderId,
  type FactionId,
  type GameState,
  type ResourceCost,
  type ShopItemKind,
  type Team,
} from "@/lib/keepstorm/engine";

type Screen = "title" | "game";
type Overlay = "rules" | "pause" | "leave" | null;
type CommandTab = "troops" | "works" | "shop";

const FEEDBACK_CHOICES = ["Army mix", "Placement", "Upgrades", "Economy", "Timing"];
const SHOP_GLYPHS: Record<ShopItemKind, string> = {
  rally_horn: "♬",
  ember_flask: "✹",
  iron_writ: "▣",
  tempo_bell: "◉",
  sigil_shard: "✦",
};

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="brand-mark" src="/brand/keepstorm-crest-v1.png" alt="" aria-hidden="true" />
  );
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function costText(cost: ResourceCost): string {
  return [
    `${cost.marks} M`,
    cost.timber ? `${cost.timber} T` : null,
    cost.sigils ? `${cost.sigils} S` : null,
  ].filter(Boolean).join(" · ");
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-heading">
        <button className="modal-close" onClick={onClose} aria-label="Close field guide">×</button>
        <span className="eyebrow">FIELD GUIDE · THE FULL WAR LEDGER</span>
        <h2 id="rules-heading">Build an army that answers the army coming back.</h2>
        <p className="rules-lead">Your structures raise cohorts automatically. The strategic game is choosing a faction, shaping the yard, reading armor, timing waves, and deciding when to trade growth for immediate power.</p>

        <div className="rule-steps rule-steps--depth">
          <article><i>01</i><div><b>Three asymmetric factions</b><span>Daybreak protects formations, Briarcrown regenerates, and Stormglass accelerates production and attacks. Each has five troop lines, one special, one economy work, and one tower.</span></div></article>
          <article><i>02</i><div><b>Three-resource economy</b><span>Marks pay for everything. Normal structures return Timber for advanced works. Sigils are scarce and unlock legendary troop upgrades.</span></div></article>
          <article><i>03</i><div><b>Five damage and armor classes</b><span>Hammer, Arrow, Arc, Siege, and Pure attacks interact differently with Plate, Cloth, Ward, Fortified, and Ethereal armor. Air also demands an attacker that can reach it.</span></div></article>
          <article><i>04</i><div><b>Veteran and legendary ranks</b><span>Select one of your structures on the map to improve its health, cohort strength, ability power, income, and production speed. Troop legendaries consume a Sigil.</span></div></article>
          <article><i>05</i><div><b>Specials, towers, and items</b><span>Faction works shield, heal, or disrupt. Towers hold your yard but invite Siege. Shop commissions provide permanent tempo or powerful one-use interventions.</span></div></article>
          <article><i>06</i><div><b>Wave synchronization</b><span>Rally Sync releases every active Foundry together at the slowest cadence. Pause individual Foundries for manual timing, or keep them independent for maximum throughput.</span></div></article>
          <article><i>07</i><div><b>One Reprieve per round</b><span>After 1:15, your emergency seal erases invaders on your half and wounds the distant host. An unused seal can also decide a time-limit tie.</span></div></article>
          <article><i>08</i><div><b>First to two rounds</b><span>Destroy the rival Anchorhold. At the time limit, unused Reprieve, then income, keep health, and remaining army strength resolve the ledger in that order.</span></div></article>
          <article><i>09</i><div><b>True 2v2 alliances</b><span>Four commanders bring separate factions, reserves, income, yards, structures, items, Rally Sync, and Reprieves. Allies share one Anchorhold and one battlefield army, so complementary counters and synchronized waves decide the road.</span></div></article>
        </div>

        <div className="counter-ledger" aria-label="Damage relationships">
          <div><b>HAMMER</b><span>crushes Plate</span></div>
          <div><b>ARROW</b><span>cuts Cloth</span></div>
          <div><b>ARC</b><span>breaks Ward</span></div>
          <div><b>SIEGE</b><span>shatters Fortified</span></div>
          <div><b>PURE</b><span>always deals steady damage</span></div>
        </div>

        <button className="primary-button" onClick={onClose}>Open the war ledger <span>→</span></button>
      </section>
    </div>
  );
}

function TitleScreen({ faction, matchMode, joinCode, onlineBusy, onlineNotice, onFaction, onMode, onPlay, onCreateRoom, onJoinCode, onJoinRoom, onRules }: {
  faction: FactionId;
  matchMode: OnlineMatchMode;
  joinCode: string;
  onlineBusy: boolean;
  onlineNotice: string | null;
  onFaction: (faction: FactionId) => void;
  onMode: (mode: OnlineMatchMode) => void;
  onPlay: () => void;
  onCreateRoom: () => void;
  onJoinCode: (code: string) => void;
  onJoinRoom: () => void;
  onRules: () => void;
}) {
  const chosenFaction = FACTIONS[faction];
  return (
    <main className="title-screen">
      <div className="title-art" aria-hidden="true" />
      <div className="title-vignette" aria-hidden="true" />
      <header className="title-header">
        <BrandMark />
        <strong>KEEPSTORM</strong>
        <span className="alpha-label">TEAM ALPHA · 0.4</span>
      </header>

      <section className="hero-copy">
        <span className="eyebrow">AN AUTOMATED SIEGE STRATEGY GAME</span>
        <h1>Build the answer.<br />Time the march.</h1>
        <p>Command an asymmetric host across a living construction yard, then outthink a rival through counters, upgrades, economy, formation timing, and combined arms.</p>
        <div className="faction-picker" aria-label="Choose your faction">
          {FACTION_IDS.map((id) => {
            const option = FACTIONS[id];
            return (
              <button key={id} className={id === faction ? "is-selected" : ""} style={id === faction ? { borderColor: option.color } : undefined} onClick={() => onFaction(id)} aria-pressed={id === faction}>
                <i style={{ background: option.color }}>{option.crest}</i>
                <span><b>{option.name}</b><small>{option.epithet}</small></span>
              </button>
            );
          })}
        </div>
        <div className="match-mode-picker" aria-label="Choose an online room size">
          <button className={matchMode === "1v1" ? "is-selected" : ""} onClick={() => onMode("1v1")} aria-pressed={matchMode === "1v1"}><b>1v1 Duel</b><small>Two commanders · both yards</small></button>
          <button className={matchMode === "2v2" ? "is-selected" : ""} onClick={() => onMode("2v2")} aria-pressed={matchMode === "2v2"}><b>2v2 Teams</b><small>Four commanders · personal yards & reserves</small></button>
        </div>
        <div className="hero-actions">
          <button className="primary-button primary-button--hero" onClick={onPlay}>Solo skirmish <span>→</span></button>
          <button className="secondary-button online-create-button" onClick={onCreateRoom} disabled={onlineBusy}>{onlineBusy ? "Opening room…" : `Create ${matchMode} room`}</button>
          <button className="text-button" onClick={onRules}>Read the field guide <span>↗</span></button>
        </div>
        <form className="join-room-form" onSubmit={(event) => { event.preventDefault(); onJoinRoom(); }}>
          <label htmlFor="room-code">JOIN A COMMANDER</label>
          <input id="room-code" value={joinCode} onChange={(event) => onJoinCode(normalizeRoomCode(event.target.value))} placeholder="8-CHAR CODE" maxLength={ROOM_CODE_LENGTH} autoComplete="off" spellCheck={false} />
          <button type="submit" disabled={onlineBusy || joinCode.length !== ROOM_CODE_LENGTH}>Join room</button>
        </form>
        {onlineNotice && <p className="online-notice" role="alert">{onlineNotice}</p>}
        <div className="hero-facts"><span>Three asymmetric factions</span><span>Twenty-four structures</span><span>Fifteen ability-driven cohorts</span></div>
      </section>

      <aside className="title-dossier">
        <span className="eyebrow">SELECTED FACTION</span>
        <strong>{chosenFaction.name}</strong>
        <p>{chosenFaction.description}</p>
        <div><span>DOCTRINE</span><b>{chosenFaction.passive}</b></div>
        <div><span>ARSENAL</span><b>5 cohorts · special · economy · tower</b></div>
        <div><span>VICTORY</span><b>Win two rounds · solo, online 1v1 or team 2v2</b></div>
      </aside>

      <footer className="title-footer">ORIGINAL ALPHA ART · KEYBOARD, MOUSE & TOUCH</footer>
    </main>
  );
}

function LobbyModal({ snapshot, roomCode, localCommander, connection, copied, onCopy, onReady, onLeave }: {
  snapshot: RoomSnapshot | null;
  roomCode: string;
  localCommander: CommanderId | null;
  connection: string;
  copied: boolean;
  onCopy: () => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
}) {
  const mode = snapshot?.mode ?? "1v1";
  const requiredSeats = seatsForMode(mode);
  const localSeat = localCommander && snapshot ? snapshot.seats[localCommander] : null;
  const assembled = snapshot ? requiredSeats.filter((commander) => snapshot.seats[commander].claimed).length : 0;
  const localTeam = localCommander ? teamForCommander(localCommander) : null;
  const allAssembled = assembled === requiredSeats.length;
  const canReady = connection === "connected" && allAssembled && requiredSeats.every((commander) => snapshot?.seats[commander].connected);

  return (
    <div className="modal-backdrop lobby-backdrop">
      <section className="lobby-modal" role="dialog" aria-modal="true" aria-labelledby="lobby-heading">
        <span className="eyebrow">LIVE {mode.toUpperCase()} · AUTHORITATIVE ROOM</span>
        <h2 id="lobby-heading">{allAssembled ? `${requiredSeats.length} commanders assembled.` : `${assembled} of ${requiredSeats.length} seats claimed.`}</h2>
        <p>{allAssembled ? "Every commander chooses readiness. In team mode, allies keep separate factions, reserves, yards, and wave controls." : `Send the room code or invitation link to ${requiredSeats.length - assembled} more commander${requiredSeats.length - assembled === 1 ? "" : "s"}. Seats fill East, West ally, then East ally.`}</p>

        <div className="room-code-panel">
          <span>ROOM CODE</span>
          <strong>{roomCode || "········"}</strong>
          <button onClick={onCopy} disabled={!roomCode}>{copied ? "Invitation copied ✓" : "Copy invitation link"}</button>
        </div>

        <div className="lobby-seats">
          {requiredSeats.map((commander) => {
            const seat = snapshot?.seats[commander];
            const isYou = commander === localCommander;
            const isAlly = !isYou && localTeam === teamForCommander(commander);
            const factionInfo = seat?.faction ? FACTIONS[seat.faction] : null;
            return (
              <article key={commander} className={`${seat?.claimed ? "is-claimed" : ""}${isYou ? " is-you" : ""}${isAlly ? " is-ally" : ""}`}>
                <i style={factionInfo ? { background: factionInfo.color } : undefined}>{factionInfo?.crest ?? "?"}</i>
                <div><small>{isYou ? "YOUR SEAT" : isAlly ? "ALLY SEAT" : "RIVAL SEAT"} · {commanderLabel(commander).toUpperCase()}</small><b>{factionInfo?.name ?? "Awaiting commander"}</b><span>{seat?.connected ? seat.ready ? "Ready for battle" : "Connected · choosing readiness" : seat?.claimed ? "Reconnecting…" : "Invitation available"}</span></div>
              </article>
            );
          })}
        </div>

        <div className={`connection-state connection-state--${connection}`}><i />{connection === "connected" ? "Live room connected" : connection === "reconnecting" ? "Restoring your seat…" : "Opening live room…"}</div>
        <div className="lobby-actions">
          <button className="primary-button" disabled={!canReady} onClick={() => onReady(!localSeat?.ready)}>{localSeat?.ready ? "Cancel readiness" : allAssembled ? "Ready for battle" : "Waiting for commanders"} <span>→</span></button>
          <button className="text-button" onClick={onLeave}>Leave room</button>
        </div>
        <small className="lobby-footnote">Your seat reconnects automatically after a brief network interruption. A live match allows 30 seconds to return.</small>
      </section>
    </div>
  );
}

function StructureCard({ kind, game, localCommander, selected, hotkey, onSelect }: { kind: BuildingKind; game: GameState; localCommander: CommanderId; selected: boolean; hotkey: number; onSelect: () => void }) {
  const spec = BUILDING_SPECS[kind];
  const unit = spec.unitKind ? UNIT_SPECS[spec.unitKind] : null;
  const unavailable = game.status !== "playing" || !canAfford(game.resources[localCommander], spec.cost) || commanderBuildingCount(game, localCommander) >= BUILDING_CAP;
  const role = unit ? `${unit.damageType} · ${unit.armorType}${unit.flying ? " · AIR" : ""}` : spec.category === "special" ? "FACTION POWER" : spec.category.toUpperCase();
  const effect = unit ? `${unit.role} · ${unit.ability ?? "disciplined"}` : spec.effect;

  return (
    <button className={`foundry-card${selected ? " is-selected" : ""}`} onClick={onSelect} disabled={unavailable} aria-pressed={selected} aria-label={`${spec.name}, ${costText(spec.cost)}. ${spec.description}`}>
      <i className="hotkey">{hotkey}</i>
      <AtlasSprite src={FACTIONS[game.factions[localCommander]].atlas} index={spec.atlasIndex} rows={4} columns={4} className="foundry-art" />
      <span className="foundry-copy">
        <b>{spec.name}</b>
        <small>{role}</small>
        <em>{effect}</em>
      </span>
      <span className="foundry-cost">{costText(spec.cost)}</span>
      {selected && <span className="selected-notch">PLACE</span>}
    </button>
  );
}

function ShopCard({ item, game, localCommander, hotkey, onBuy }: { item: ShopItemKind; game: GameState; localCommander: CommanderId; hotkey: number; onBuy: () => void }) {
  const spec = SHOP_ITEMS[item];
  const unavailable = !canAfford(game.resources[localCommander], spec.cost) || (item === "rally_horn" && game.rallyHorn[localCommander]);
  return (
    <button className="shop-card" onClick={onBuy} disabled={unavailable} aria-label={`${spec.name}, ${costText(spec.cost)}. ${spec.description}`}>
      <i className="hotkey">{hotkey}</i>
      <strong>{SHOP_GLYPHS[item]}</strong>
      <span><b>{spec.name}</b><small>{spec.permanent ? "PERMANENT" : "INSTANT"}</small><em>{spec.description}</em></span>
      <mark>{item === "rally_horn" && game.rallyHorn[localCommander] ? "OWNED" : costText(spec.cost)}</mark>
    </button>
  );
}

function BuildingInspector({ building, game, localCommander, onUpgrade, onToggle, onClose }: { building: Building; game: GameState; localCommander: CommanderId; onUpgrade: () => void; onToggle: () => void; onClose: () => void }) {
  const spec = BUILDING_SPECS[building.kind];
  const unit = spec.unitKind ? UNIT_SPECS[spec.unitKind] : null;
  const cost = costForUpgrade(building);
  const affordable = cost ? canAfford(game.resources[localCommander], cost) : false;
  const levelName = building.level === 1 ? "Established" : building.level === 2 ? "Veteran" : "Legendary";
  return (
    <section className="building-inspector" aria-label={`Inspect ${spec.name}`}>
      <button className="inspector-close" onClick={onClose} aria-label="Close structure inspector">×</button>
      <AtlasSprite src={FACTIONS[game.factions[localCommander]].atlas} index={spec.atlasIndex} rows={4} columns={4} className="inspector-art" />
      <div className="inspector-copy">
        <span className="eyebrow">{spec.category} · {levelName} rank</span>
        <h3>{spec.name}</h3>
        <p>{spec.description}</p>
        <div className="inspector-traits">
          <span><small>HEALTH</small><b>{Math.ceil(building.hp)} / {building.maxHp}</b></span>
          <span><small>INCOME</small><b>+{Math.round(spec.yieldBonus * (1 + (building.level - 1) * .35))}</b></span>
          {unit && <span><small>COHORT</small><b>{unit.damageType} / {unit.armorType}</b></span>}
          {unit && <span><small>ABILITY</small><b>{unit.ability ?? "None"}</b></span>}
        </div>
      </div>
      <div className="inspector-actions">
        {cost ? <button className="upgrade-button" disabled={!affordable} onClick={onUpgrade}><span>Upgrade to {building.level === 1 ? "Veteran" : "Legendary"}</span><b>{costText(cost)}</b></button> : <div className="max-rank">★ MAXIMUM RANK</div>}
        {unit && <button className="production-button" onClick={onToggle}>{building.productionPaused ? "Resume production" : "Hold production"}<small>{building.productionPaused ? "Rejoin deployment timing" : "Use for manual wave sync"}</small></button>}
      </div>
    </section>
  );
}

function GameHeader({ game, onRules, onPause, onLeave }: { game: GameState; onRules: () => void; onPause: () => void; onLeave: () => void }) {
  const playerRatio = Math.max(0, game.keeps.player / KEEP_MAX_HP);
  const enemyRatio = Math.max(0, game.keeps.enemy / KEEP_MAX_HP);
  const playerFaction = FACTIONS[game.factions.player];
  const enemyFaction = FACTIONS[game.factions.enemy];
  return (
    <header className="game-header">
      <button className="game-brand" onClick={onLeave} aria-label="Return to title screen"><BrandMark /><strong>KEEPSTORM</strong></button>
      <div className="keep-score keep-score--player">
        <div><b style={{ color: playerFaction.color }}>{teamDisplayName(game, "player").toUpperCase()}</b><span>{Math.ceil(game.keeps.player)} / {KEEP_MAX_HP}</span></div>
        <i><span style={{ width: `${playerRatio * 100}%`, background: playerFaction.color }} /></i>
      </div>
      <div className="match-clock"><span>ROUND {game.round} · FIRST TO 2</span><b>{formatClock(MATCH_LIMIT - game.elapsed)}</b><small>{game.roundWins.player} — {game.roundWins.enemy} · {game.started ? "LEDGER CLOSES" : "AWAITING FIRST STRUCTURE"}</small></div>
      <div className="keep-score keep-score--enemy">
        <div><b style={{ color: enemyFaction.color }}>{teamDisplayName(game, "enemy").toUpperCase()}</b><span>{Math.ceil(game.keeps.enemy)} / {KEEP_MAX_HP}</span></div>
        <i><span style={{ width: `${enemyRatio * 100}%`, background: enemyFaction.color }} /></i>
      </div>
      <div className="header-actions">
        <button onClick={onRules} aria-label="Open field guide">?</button>
        <button onClick={onPause} aria-label="Pause match">Ⅱ</button>
      </div>
    </header>
  );
}

function TutorialCard({ game, localCommander, selected, onDismiss }: { game: GameState; localCommander: CommanderId; selected: BuildingKind | null; onDismiss: () => void }) {
  const hasBuilding = game.stats.buildingsPlaced[localCommander] > 0;
  return (
    <aside className="tutorial-card">
      <span className="tutorial-step">FIRST COMMAND · {hasBuilding ? "03" : selected ? "02" : "01"} / 03</span>
      <button onClick={onDismiss} aria-label="Dismiss tutorial">×</button>
      {!hasBuilding && !selected && <><b>Choose the opening answer</b><p>Start in Troops or invest in Works. Damage and armor labels reveal what each cohort can counter.</p></>}
      {!hasBuilding && selected && <><b>Choose its X/Y position</b><p>Click a gold square in either half of your yard. The dotted line previews the cohort’s path.</p></>}
      {hasBuilding && <><b>Grow, scout, adapt</b><p>Earn Marks every seven seconds and Timber from construction. Click a placed structure to upgrade or hold its production.</p></>}
    </aside>
  );
}

function CommandDeck({ game, localCommander, tab, selected, inspected, onTab, onSelect, onBuy, onReprieve, onSync, onUpgrade, onToggleProduction, onCloseInspector }: {
  game: GameState;
  localCommander: CommanderId;
  tab: CommandTab;
  selected: BuildingKind | null;
  inspected: Building | null;
  onTab: (tab: CommandTab) => void;
  onSelect: (kind: BuildingKind) => void;
  onBuy: (item: ShopItemKind) => void;
  onReprieve: () => void;
  onSync: () => void;
  onUpgrade: () => void;
  onToggleProduction: () => void;
  onCloseInspector: () => void;
}) {
  const remaining = Math.max(0, REPRIEVE_READY_AT - game.elapsed);
  const ready = reprieveReady(game, localCommander);
  const choices = tab === "troops"
    ? factionBuildings(game.factions[localCommander], "troop")
    : [...factionBuildings(game.factions[localCommander], "special"), ...factionBuildings(game.factions[localCommander], "economy"), ...factionBuildings(game.factions[localCommander], "tower")];

  return (
    <section className="command-deck" aria-label="War ledger">
      <div className="ledger-nav">
        <span className="eyebrow">WAR LEDGER</span>
        <div className="command-tabs">
          <button className={tab === "troops" ? "is-active" : ""} onClick={() => onTab("troops")}><b>Troops</b><small>5 Foundries</small></button>
          <button className={tab === "works" ? "is-active" : ""} onClick={() => onTab("works")}><b>Works</b><small>Power · income · tower</small></button>
          <button className={tab === "shop" ? "is-active" : ""} onClick={() => onTab("shop")}><b>Shop</b><small>Permanent & instant</small></button>
        </div>
      </div>

      <div className="command-content">
        {inspected ? <BuildingInspector building={inspected} game={game} localCommander={localCommander} onUpgrade={onUpgrade} onToggle={onToggleProduction} onClose={onCloseInspector} /> : tab === "shop" ? (
          <div className="shop-list">{SHOP_ITEM_KINDS.map((item, index) => <ShopCard key={item} item={item} game={game} localCommander={localCommander} hotkey={index + 1} onBuy={() => onBuy(item)} />)}</div>
        ) : (
          <div className={`foundry-list foundry-list--${tab}`}>{choices.map((kind, index) => <StructureCard key={kind} kind={kind} game={game} localCommander={localCommander} selected={selected === kind} hotkey={index + 1} onSelect={() => onSelect(kind)} />)}</div>
        )}
      </div>

      <div className="tactics-stack">
        <button className={`sync-button${game.syncEnabled[localCommander] ? " is-active" : ""}`} onClick={onSync} disabled={!game.started}>
          <b>{game.syncEnabled[localCommander] ? "RALLY SYNC ON" : "RALLY SYNC OFF"}</b>
          <small>{game.syncEnabled[localCommander] ? `Wave in ${formatClock(game.syncClock[localCommander])}` : "S · group your deployments"}</small>
        </button>
        <button className={`reprieve-button${ready ? " is-ready" : ""}`} disabled={!ready} onClick={onReprieve} aria-label={ready ? "Cast Reprieve" : `Reprieve ready in ${formatClock(remaining)}`}>
          <AtlasSprite src="/game/icons-atlas.png" index={3} className="reprieve-art" />
          <span><b>REPRIEVE</b><small>{game.reprieveUsed[localCommander] ? "SPENT" : ready ? "READY · SPACE" : `CHARGING · ${formatClock(remaining)}`}</small></span>
        </button>
      </div>
    </section>
  );
}

function ResultModal({ game, localCommander, onlineSnapshot, answer, copied, onAnswer, onCopy, onContinue, onRestart, onTitle }: {
  game: GameState;
  localCommander: CommanderId;
  onlineSnapshot: RoomSnapshot | null;
  answer: string;
  copied: boolean;
  onAnswer: (answer: string) => void;
  onCopy: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onTitle: () => void;
}) {
  const localTeam = teamForCommander(localCommander);
  const playerSideWon = game.status === "won" || game.status === "round_won";
  const localWon = localTeam === "player" ? playerSideWon : !playerSideWon;
  const final = game.status === "won" || game.status === "lost";
  const victorTeam: Team = playerSideWon ? "player" : "enemy";
  const victor = teamDisplayName(game, victorTeam);
  const localReady = onlineSnapshot?.seats[localCommander].ready ?? false;
  const online = Boolean(onlineSnapshot);
  const roomSeats = onlineSnapshot ? seatsForMode(onlineSnapshot.mode) : [];
  const roomAvailable = onlineSnapshot ? roomSeats.every((commander) => onlineSnapshot.seats[commander].claimed && onlineSnapshot.seats[commander].connected) : true;
  return (
    <div className="modal-backdrop result-backdrop">
      <section className={`result-modal ${localWon ? "is-victory" : "is-defeat"}`} role="dialog" aria-modal="true" aria-labelledby="result-heading">
        <span className="eyebrow">{final ? "MATCH LEDGER CLOSED" : `ROUND ${game.round} CLOSED`}</span>
        <div className="result-seal">{localWon ? "✦" : "◇"}</div>
        <h2 id="result-heading">{victor} takes the road.</h2>
        <p>{game.event}</p>
        <div className="result-stats">
          <div><span>YOUR SCORE</span><b>{game.roundWins[localTeam]}–{game.roundWins[localTeam === "player" ? "enemy" : "player"]}</b></div>
          <div><span>YOUR STRUCTURES</span><b>{game.stats.buildingsPlaced[localCommander]}</b></div>
          <div><span>YOUR UPGRADES</span><b>{game.stats.upgrades[localCommander]}</b></div>
          <div><span>YOUR COHORTS</span><b>{game.stats.unitsSpawned[localCommander]}</b></div>
        </div>
        {final && <fieldset className="feedback-field"><legend>What felt most decisive?</legend><div>{FEEDBACK_CHOICES.map((choice) => <button key={choice} className={answer === choice ? "is-selected" : ""} onClick={() => onAnswer(choice)}>{choice}</button>)}</div></fieldset>}
        <div className="result-actions">
          <button className="primary-button" disabled={online && (localReady || !roomAvailable)} onClick={final ? onRestart : onContinue}>{online ? !roomAvailable ? "A commander left the room" : localReady ? "Waiting for commanders…" : final ? "Ready for rematch" : "Ready for next round" : final ? "New match" : "Begin next round"} <span>→</span></button>
          {final && <button className="secondary-button" onClick={onCopy}>{copied ? "Report copied ✓" : "Copy playtest report"}</button>}
          <button className="text-button" onClick={onTitle}>Return to title</button>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const {
    connection,
    snapshot,
    commander: onlineCommander,
    team: onlineTeam,
    mode: onlineMode,
    roomCode,
    notice: onlineNotice,
    busy: onlineBusy,
    createRoom: createOnlineRoom,
    joinRoom: joinOnlineRoom,
    setReady: setOnlineReady,
    sendCommand,
    leaveRoom: leaveOnlineRoom,
  } = useMultiplayer();
  const [screen, setScreen] = useState<Screen>("title");
  const [faction, setFaction] = useState<FactionId>("daybreak");
  const [matchMode, setMatchMode] = useState<OnlineMatchMode>("2v2");
  const [soloGame, setGame] = useState<GameState>(() => createInitialState("daybreak"));
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState<CommandTab>("troops");
  const [selected, setSelected] = useState<BuildingKind | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [tutorial, setTutorial] = useState(true);
  const [hoverMessage, setHoverMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const lastTick = useRef(0);
  const online = Boolean(roomCode && onlineCommander && onlineTeam);
  const game = online && snapshot?.game ? snapshot.game : soloGame;
  const showingGame = screen === "game" || Boolean(online && snapshot?.game);
  const localCommander: CommanderId = onlineCommander ?? "player";
  const localTeam: Team = teamForCommander(localCommander);
  const rivalTeam: Team = localTeam === "player" ? "enemy" : "player";
  const paused = overlay !== null || game.status !== "playing";
  const inspected = game.buildings.find((building) => building.id === selectedBuildingId && commanderForBuilding(building) === localCommander) ?? null;

  const tabChoices = useMemo(() => tab === "troops"
    ? factionBuildings(game.factions[localCommander], "troop")
    : tab === "works"
      ? [...factionBuildings(game.factions[localCommander], "special"), ...factionBuildings(game.factions[localCommander], "economy"), ...factionBuildings(game.factions[localCommander], "tower")]
      : [], [game.factions, localCommander, tab]);

  useEffect(() => {
    const invitation = normalizeRoomCode(new URL(window.location.href).searchParams.get("room") ?? "");
    if (!invitation) return;
    const timeout = window.setTimeout(() => setJoinCode(invitation), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showingGame || paused || online) return;
    lastTick.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setGame((current) => stepGame(current, delta));
    }, 50);
    return () => window.clearInterval(interval);
  }, [online, paused, showingGame]);

  useEffect(() => {
    if (!showingGame) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (overlay === "rules" || overlay === "leave") return;
      if (event.key.toLowerCase() === "p") { setOverlay((current) => current === "pause" ? null : "pause"); return; }
      if (event.key === "Escape") {
        if (overlay === "pause") setOverlay(null);
        else if (selected || selectedBuildingId) { setSelected(null); setSelectedBuildingId(null); }
        else setOverlay("pause");
        return;
      }
      if (overlay) return;
      if (event.key.toLowerCase() === "q") { setTab("troops"); setSelectedBuildingId(null); return; }
      if (event.key.toLowerCase() === "w") { setTab("works"); setSelectedBuildingId(null); return; }
      if (event.key.toLowerCase() === "e") { setTab("shop"); setSelectedBuildingId(null); return; }
      if (event.key.toLowerCase() === "s") {
        if (online) sendCommand({ action: "toggle_sync" });
        else setGame((current) => toggleSynchronization(current, localCommander));
        return;
      }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 5) {
        if (tab === "shop") {
          const item = SHOP_ITEM_KINDS[index];
          if (item) {
            if (online) sendCommand({ action: "buy_item", item });
            else setGame((current) => buyShopItem(current, localCommander, item));
          }
        } else {
          const kind = tabChoices[index];
          if (kind && canAfford(game.resources[localCommander], BUILDING_SPECS[kind].cost) && commanderBuildingCount(game, localCommander) < BUILDING_CAP) {
            setSelected(kind);
            setSelectedBuildingId(null);
          }
        }
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (online) sendCommand({ action: "cast_reprieve" });
        else setGame((current) => castReprieve(current, localCommander));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, localCommander, online, overlay, selected, selectedBuildingId, sendCommand, showingGame, tab, tabChoices]);

  const selectedDescription = selected ? BUILDING_SPECS[selected].description : inspected ? `${BUILDING_SPECS[inspected.kind].name} selected for upgrades and production control.` : null;

  const beginMatch = () => {
    if (online) leaveOnlineRoom();
    setGame(createInitialState(faction));
    setSelected(null);
    setSelectedBuildingId(null);
    setTab("troops");
    setTutorial(true);
    setFeedback("");
    setCopied(false);
    setOverlay(null);
    setScreen("game");
  };

  const continueMatch = () => {
    setSelected(null);
    setSelectedBuildingId(null);
    setTab("troops");
    setTutorial(false);
    if (online) {
      setOnlineReady(true);
      return;
    }
    setGame((current) => startNextRound(current));
  };

  const goToTitle = () => {
    if (online) leaveOnlineRoom();
    setOverlay(null);
    setScreen("title");
  };

  if (!showingGame) {
    return <>
      <TitleScreen
        faction={faction}
        matchMode={matchMode}
        joinCode={joinCode}
        onlineBusy={onlineBusy}
        onlineNotice={onlineNotice}
        onFaction={setFaction}
        onMode={setMatchMode}
        onPlay={beginMatch}
        onCreateRoom={() => { setInviteCopied(false); void createOnlineRoom(faction, matchMode); }}
        onJoinCode={setJoinCode}
        onJoinRoom={() => { setInviteCopied(false); void joinOnlineRoom(joinCode, faction); }}
        onRules={() => setOverlay("rules")}
      />
      {overlay === "rules" && <RulesModal onClose={() => setOverlay(null)} />}
      {roomCode && <LobbyModal
        snapshot={snapshot}
        roomCode={roomCode}
        localCommander={onlineCommander}
        connection={connection}
        copied={inviteCopied}
        onCopy={async () => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set("room", roomCode);
            await navigator.clipboard.writeText(url.toString());
            setInviteCopied(true);
          } catch { setInviteCopied(false); }
        }}
        onReady={setOnlineReady}
        onLeave={leaveOnlineRoom}
      />}
    </>;
  }

  const localResources = game.resources[localCommander];
  const ally = commandersForTeam(game, localTeam).find((commander) => commander !== localCommander);
  return (
    <main className="game-shell">
      <GameHeader game={game} onRules={() => setOverlay("rules")} onPause={() => setOverlay("pause")} onLeave={() => setOverlay("leave")} />
      {online && <div className={`multiplayer-status multiplayer-status--${connection}`} role="status"><i />{connection === "connected" ? `LIVE ${(onlineMode ?? snapshot?.mode ?? "1v1").toUpperCase()} · ${commanderLabel(localCommander).toUpperCase()} · ${roomCode}` : "RECONNECTING · BATTLE HELD"}</div>}
      <section className="battlefield-stage">
        <GameCanvas
          state={game}
          localCommander={localCommander}
          selected={selected}
          selectedBuildingId={selectedBuildingId}
          onPlace={(kind, gridX, gridY) => {
            if (online) sendCommand({ action: "place_building", kind, gridX, gridY });
            else setGame((current) => placeBuilding(current, localCommander, kind, gridX, gridY));
          }}
          onSelectBuilding={(id) => { setSelectedBuildingId(id); setSelected(null); }}
          onCancelSelection={() => { setSelected(null); setSelectedBuildingId(null); }}
          onHoverMessage={setHoverMessage}
        />
        <div className={`resource-panel resource-panel--${localTeam} is-local`}>
          <span>YOUR RESERVES · +{incomeForCommander(game, localCommander)} IN {Math.max(1, Math.ceil(game.incomeClock))}S</span>
          <div><b>◆ {Math.floor(localResources.marks)}</b><b>▰ {Math.floor(localResources.timber)}</b><b>✦ {localResources.sigils}</b></div>
          <small>{commanderLabel(localCommander).toUpperCase()} · {FACTIONS[game.factions[localCommander]].name.toUpperCase()}{ally ? ` · ALLY ${FACTIONS[game.factions[ally]].name.toUpperCase()}` : ""}</small>
        </div>
        <div className={`resource-panel resource-panel--${rivalTeam} is-rival`}><span>{game.matchMode === "2v2" ? "RIVAL TEAM FORCES" : "RIVAL FORCES"}</span><b>{buildingCount(game, rivalTeam)} WORKS · {unitCount(game, rivalTeam)} AFIELD</b><small>{teamDisplayName(game, rivalTeam)} · +{incomeFor(game, rivalTeam)} recurring Marks</small></div>
        <div className={`event-ribbon${hoverMessage && selected ? " is-placement" : ""}`} role="status" aria-live="polite"><i /><span>{hoverMessage && selected ? hoverMessage : game.event}</span>{selectedDescription && <small>{selectedDescription}</small>}</div>
        {tutorial && game.status === "playing" && <TutorialCard game={game} localCommander={localCommander} selected={selected} onDismiss={() => setTutorial(false)} />}
      </section>
      <CommandDeck
        game={game}
        localCommander={localCommander}
        tab={tab}
        selected={selected}
        inspected={inspected}
        onTab={(nextTab) => { setTab(nextTab); setSelected(null); setSelectedBuildingId(null); }}
        onSelect={(kind) => { setSelected((current) => current === kind ? null : kind); setSelectedBuildingId(null); }}
        onBuy={(item) => online ? sendCommand({ action: "buy_item", item }) : setGame((current) => buyShopItem(current, localCommander, item))}
        onReprieve={() => online ? sendCommand({ action: "cast_reprieve" }) : setGame((current) => castReprieve(current, localCommander))}
        onSync={() => online ? sendCommand({ action: "toggle_sync" }) : setGame((current) => toggleSynchronization(current, localCommander))}
        onUpgrade={() => inspected && (online ? sendCommand({ action: "upgrade_building", buildingId: inspected.id }) : setGame((current) => upgradeBuilding(current, localCommander, inspected.id)))}
        onToggleProduction={() => inspected && (online ? sendCommand({ action: "toggle_production", buildingId: inspected.id }) : setGame((current) => toggleProduction(current, localCommander, inspected.id)))}
        onCloseInspector={() => setSelectedBuildingId(null)}
      />

      {overlay === "rules" && <RulesModal onClose={() => setOverlay(null)} />}
      {overlay === "pause" && <div className="modal-backdrop"><section className="pause-modal" role="dialog" aria-modal="true" aria-labelledby="pause-heading"><span className="eyebrow">{online ? "LIVE MATCH MENU" : "LEDGER PAUSED"}</span><h2 id="pause-heading">{online ? "The room remains live." : "The march is holding."}</h2><p>{online ? "Online battles continue while this panel is open. Your rival remains connected and the server keeps the ledger." : "No cohorts move and no income ticks while this panel is open."}</p><button className="primary-button" onClick={() => setOverlay(null)}>Return to battle <span>→</span></button><button className="secondary-button" onClick={() => setOverlay("rules")}>Open field guide</button><button className="text-button" onClick={() => setOverlay("leave")}>Leave this match</button></section></div>}
      {overlay === "leave" && <div className="modal-backdrop"><section className="pause-modal" role="dialog" aria-modal="true" aria-labelledby="leave-heading"><span className="eyebrow">ABANDON MATCH?</span><h2 id="leave-heading">{online ? "Your rival can claim the field." : "This ledger cannot be recovered."}</h2><p>{online ? "Leaving disconnects your seat. You have a short grace period to return before the match is forfeited." : "Return to the title screen and end this skirmish."}</p><div className="confirm-actions"><button className="primary-button" onClick={goToTitle}>Return to title</button><button className="secondary-button" onClick={() => setOverlay(null)}>Keep playing</button></div></section></div>}
      {game.status !== "playing" && <ResultModal game={game} localCommander={localCommander} onlineSnapshot={online ? snapshot : null} answer={feedback} copied={copied} onAnswer={setFeedback} onCopy={async () => { try { await navigator.clipboard.writeText(matchReport(game, feedback)); setCopied(true); } catch { setCopied(false); } }} onContinue={continueMatch} onRestart={online ? () => { setFeedback(""); setCopied(false); setOnlineReady(true); } : beginMatch} onTitle={goToTitle} />}
    </main>
  );
}
