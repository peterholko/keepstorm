"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AtlasSprite from "./atlas-sprite";
import GameCanvas from "./game-canvas";
import {
  BUILDING_CAP,
  BUILDING_KINDS,
  BUILDING_SPECS,
  KEEP_MAX_HP,
  MATCH_LIMIT,
  REPRIEVE_READY_AT,
  buildingCount,
  castReprieve,
  createInitialState,
  matchReport,
  placeBuilding,
  reprieveReady,
  stepGame,
  unitCount,
  yieldFor,
  type BuildingKind,
  type GameState,
} from "@/lib/musterhold/engine";

type Screen = "title" | "game";
type Overlay = "rules" | "pause" | "leave" | null;

const HOTKEYS: Record<string, BuildingKind> = {
  "1": "ramworks",
  "2": "quillnest",
  "3": "beaconarium",
  "4": "tallyhouse",
};

const BUILD_DETAILS: Record<BuildingKind, { role: string; beats: string }> = {
  ramworks: { role: "Hammer · Ward", beats: "Breaks Plate" },
  quillnest: { role: "Arrow · Plate", beats: "Cuts Cloth" },
  beaconarium: { role: "Arc · Cloth", beats: "Pierces Ward" },
  tallyhouse: { role: "Economy", beats: "+24 every Yield" },
};

const FEEDBACK_CHOICES = ["Placement", "Counters", "Economy", "Reprieve", "Unsure"];

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-heading">
        <button className="modal-close" onClick={onClose} aria-label="Close field guide">×</button>
        <span className="eyebrow">FIELD GUIDE · TWO-MINUTE READ</span>
        <h2 id="rules-heading">Win before your rival’s ledger closes.</h2>
        <p className="rules-lead">Raise Foundries on the left construction yard. Their cohorts march and fight on their own; your placement, production mix, and timing decide the siege.</p>

        <div className="rule-steps">
          <article><i>01</i><div><b>Place in true 2D</b><span>Choose a Foundry, then click any valid X/Y square. You cannot overlap buildings or seal every route to the gate.</span></div></article>
          <article><i>02</i><div><b>Read the counter ring</b><span>Hammer breaks Plate. Arrow cuts Cloth. Arc pierces Ward. Nightveil watches your mix and adapts.</span></div></article>
          <article><i>03</i><div><b>Invest between clashes</b><span>Both sides receive a Yield every seven seconds. Production adds a little income; a Tallyhouse adds a lot but raises no troops.</span></div></article>
          <article><i>04</i><div><b>Use one Reprieve</b><span>At 0:48, your emergency seal unlocks. It erases invaders on your half and wounds the rest—once per match.</span></div></article>
        </div>

        <div className="counter-ring" aria-label="Combat counter relationships">
          <div><AtlasSprite src="/game/icons-atlas.png" index={0} label="Hammer" /><b>HAMMER</b><span>breaks Plate</span></div>
          <strong>→</strong>
          <div><AtlasSprite src="/game/icons-atlas.png" index={1} label="Arrow" /><b>ARROW</b><span>cuts Cloth</span></div>
          <strong>→</strong>
          <div><AtlasSprite src="/game/icons-atlas.png" index={2} label="Arc" /><b>ARC</b><span>pierces Ward</span></div>
        </div>

        <button className="primary-button" onClick={onClose}>I understand the ledger <span>→</span></button>
      </section>
    </div>
  );
}

function TitleScreen({ onPlay, onRules }: { onPlay: () => void; onRules: () => void }) {
  return (
    <main className="title-screen">
      <div className="title-art" aria-hidden="true" />
      <div className="title-vignette" aria-hidden="true" />
      <header className="title-header">
        <span className="brand-rune">M</span>
        <strong>MUSTERHOLD</strong>
        <span className="alpha-label">PLAYTEST ALPHA · 0.1</span>
      </header>

      <section className="hero-copy">
        <span className="eyebrow">AN AUTOMATED SIEGE STRATEGY GAME</span>
        <h1>Place wisely.<br />March relentlessly.</h1>
        <p>Shape a living construction yard, raise specialized cohorts, and outbuild a rival that learns what you rely on.</p>
        <div className="hero-actions">
          <button className="primary-button primary-button--hero" onClick={onPlay}>Begin solo skirmish <span>→</span></button>
          <button className="text-button" onClick={onRules}>How to play <span>↗</span></button>
        </div>
        <div className="hero-facts"><span>One player vs adaptive rival</span><span>Two to five minutes</span><span>No account needed</span></div>
      </section>

      <aside className="title-dossier">
        <span className="eyebrow">THE TWIN YARDS</span>
        <strong>Daybreak Company</strong>
        <p>Your gold-and-vermilion makers face the Nightveil Syndicate across a divided road.</p>
        <div><span>VICTORY</span><b>Break the rival Anchorhold</b></div>
        <div><span>COMMAND</span><b>Build, counter, and time Reprieve</b></div>
      </aside>

      <footer className="title-footer">ORIGINAL ALPHA ART · KEYBOARD, MOUSE & TOUCH</footer>
    </main>
  );
}

function FoundryCard({ kind, game, selected, onSelect }: { kind: BuildingKind; game: GameState; selected: boolean; onSelect: () => void }) {
  const spec = BUILDING_SPECS[kind];
  const detail = BUILD_DETAILS[kind];
  const index = BUILDING_KINDS.indexOf(kind) + 1;
  const unavailable = game.status !== "playing" || game.coins.player < spec.cost || buildingCount(game, "player") >= BUILDING_CAP;

  return (
    <button
      className={`foundry-card${selected ? " is-selected" : ""}`}
      onClick={onSelect}
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={`${spec.name}, ${spec.cost} Marks. ${spec.description}`}
    >
      <i className="hotkey">{index}</i>
      <AtlasSprite src="/game/daybreak-atlas.png" index={spec.atlasIndex} className="foundry-art" />
      <span className="foundry-copy">
        <b>{spec.name}</b>
        <small>{detail.role}</small>
        <em>{detail.beats}</em>
      </span>
      <span className="foundry-cost"><i>◆</i>{spec.cost}</span>
      {selected && <span className="selected-notch">PLACE</span>}
    </button>
  );
}

function GameHeader({ game, onRules, onPause, onLeave }: { game: GameState; onRules: () => void; onPause: () => void; onLeave: () => void }) {
  const playerRatio = Math.max(0, game.keeps.player / KEEP_MAX_HP);
  const enemyRatio = Math.max(0, game.keeps.enemy / KEEP_MAX_HP);
  return (
    <header className="game-header">
      <button className="game-brand" onClick={onLeave} aria-label="Return to title screen"><span className="brand-rune">M</span><strong>MUSTERHOLD</strong></button>
      <div className="keep-score keep-score--player">
        <div><b>DAYBREAK</b><span>{Math.ceil(game.keeps.player)} / {KEEP_MAX_HP}</span></div>
        <i><span style={{ width: `${playerRatio * 100}%` }} /></i>
      </div>
      <div className="match-clock"><span>THE TWIN YARDS</span><b>{formatClock(MATCH_LIMIT - game.elapsed)}</b><small>{game.started ? "LEDGER CLOSES" : "AWAITING FIRST FOUNDRY"}</small></div>
      <div className="keep-score keep-score--enemy">
        <div><b>NIGHTVEIL</b><span>{Math.ceil(game.keeps.enemy)} / {KEEP_MAX_HP}</span></div>
        <i><span style={{ width: `${enemyRatio * 100}%` }} /></i>
      </div>
      <div className="header-actions">
        <button onClick={onRules} aria-label="Open field guide">?</button>
        <button onClick={onPause} aria-label="Pause match">Ⅱ</button>
      </div>
    </header>
  );
}

function TutorialCard({ game, selected, onDismiss }: { game: GameState; selected: BuildingKind | null; onDismiss: () => void }) {
  const hasBuilding = game.stats.buildingsPlaced.player > 0;
  return (
    <aside className="tutorial-card">
      <span className="tutorial-step">FIRST COMMAND · {hasBuilding ? "03" : selected ? "02" : "01"} / 03</span>
      <button onClick={onDismiss} aria-label="Dismiss tutorial">×</button>
      {!hasBuilding && !selected && <><b>Choose what to raise</b><p>Select one of the four cards below. The counter note tells you what its cohort defeats.</p></>}
      {!hasBuilding && selected && <><b>Choose its X/Y position</b><p>Click a gold square in your yard. The dotted line previews the cohort’s route to the gate.</p></>}
      {hasBuilding && <><b>The march is automatic</b><p>Your first cohort deploys shortly. Spend each seven-second Yield, watch the rival’s army, and counter it.</p></>}
    </aside>
  );
}

function CommandDeck({ game, selected, onSelect, onReprieve }: {
  game: GameState;
  selected: BuildingKind | null;
  onSelect: (kind: BuildingKind) => void;
  onReprieve: () => void;
}) {
  const remaining = Math.max(0, REPRIEVE_READY_AT - game.elapsed);
  const ready = reprieveReady(game, "player");
  return (
    <section className="command-deck" aria-label="Construction ledger">
      <div className="ledger-summary">
        <span className="eyebrow">CONSTRUCTION LEDGER</span>
        <strong>{selected ? `Placing ${BUILDING_SPECS[selected].name}` : "Choose a Foundry"}</strong>
        <small>{selected ? `${BUILDING_SPECS[selected].width}×${BUILDING_SPECS[selected].height} cells · Esc cancels` : "Keys 1–4 select · click the left yard to place"}</small>
      </div>
      <div className="foundry-list">
        {BUILDING_KINDS.map((kind) => <FoundryCard key={kind} kind={kind} game={game} selected={selected === kind} onSelect={() => onSelect(kind)} />)}
      </div>
      <button className={`reprieve-button${ready ? " is-ready" : ""}`} disabled={!ready} onClick={onReprieve} aria-label={ready ? "Cast Reprieve" : `Reprieve ready in ${formatClock(remaining)}`}>
        <AtlasSprite src="/game/icons-atlas.png" index={3} className="reprieve-art" />
        <span><b>REPRIEVE</b><small>{game.reprieveUsed.player ? "SPENT" : ready ? "READY · SPACE" : `CHARGING · ${formatClock(remaining)}`}</small></span>
      </button>
    </section>
  );
}

function ResultModal({ game, answer, copied, onAnswer, onCopy, onRestart, onTitle }: {
  game: GameState;
  answer: string;
  copied: boolean;
  onAnswer: (answer: string) => void;
  onCopy: () => void;
  onRestart: () => void;
  onTitle: () => void;
}) {
  const won = game.status === "won";
  return (
    <div className="modal-backdrop result-backdrop">
      <section className={`result-modal ${won ? "is-victory" : "is-defeat"}`} role="dialog" aria-modal="true" aria-labelledby="result-heading">
        <span className="eyebrow">MATCH LEDGER CLOSED</span>
        <div className="result-seal">{won ? "✦" : "◇"}</div>
        <h2 id="result-heading">{won ? "Daybreak holds the road." : "Nightveil claims the road."}</h2>
        <p>{game.event}</p>
        <div className="result-stats">
          <div><span>DURATION</span><b>{formatClock(game.elapsed)}</b></div>
          <div><span>FOUNDRIES</span><b>{game.stats.buildingsPlaced.player}</b></div>
          <div><span>COHORTS</span><b>{game.stats.unitsSpawned.player}</b></div>
          <div><span>KEEP LEFT</span><b>{Math.ceil(game.keeps.player)}</b></div>
        </div>
        <fieldset className="feedback-field">
          <legend>What felt most decisive?</legend>
          <div>{FEEDBACK_CHOICES.map((choice) => <button key={choice} className={answer === choice ? "is-selected" : ""} onClick={() => onAnswer(choice)}>{choice}</button>)}</div>
        </fieldset>
        <div className="result-actions">
          <button className="primary-button" onClick={onRestart}>Play again <span>↻</span></button>
          <button className="secondary-button" onClick={onCopy}>{copied ? "Report copied ✓" : "Copy playtest report"}</button>
          <button className="text-button" onClick={onTitle}>Return to title</button>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("title");
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<BuildingKind | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [tutorial, setTutorial] = useState(true);
  const [hoverMessage, setHoverMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const lastTick = useRef(0);
  const paused = overlay !== null || game.status !== "playing";
  const playerBuildingTotal = buildingCount(game, "player");

  useEffect(() => {
    if (screen !== "game" || paused) return;
    lastTick.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setGame((current) => stepGame(current, delta));
    }, 50);
    return () => window.clearInterval(interval);
  }, [paused, screen]);

  useEffect(() => {
    if (screen !== "game") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (overlay === "rules" || overlay === "leave") return;
      if (event.key.toLowerCase() === "p") { setOverlay((current) => current === "pause" ? null : "pause"); return; }
      if (event.key === "Escape") {
        if (overlay === "pause") setOverlay(null);
        else if (selected) setSelected(null);
        else setOverlay("pause");
        return;
      }
      if (overlay) return;
      const kind = HOTKEYS[event.key];
      if (kind && game.coins.player >= BUILDING_SPECS[kind].cost && playerBuildingTotal < BUILDING_CAP) setSelected(kind);
      if (event.code === "Space") {
        event.preventDefault();
        setGame((current) => castReprieve(current, "player"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.coins.player, overlay, playerBuildingTotal, screen, selected]);

  const selectedDescription = useMemo(() => selected ? BUILDING_SPECS[selected].description : null, [selected]);

  const beginMatch = () => {
    setGame(createInitialState());
    setSelected(null);
    setTutorial(true);
    setFeedback("");
    setCopied(false);
    setOverlay(null);
    setScreen("game");
  };

  const goToTitle = () => {
    setOverlay(null);
    setScreen("title");
  };

  if (screen === "title") {
    return <><TitleScreen onPlay={beginMatch} onRules={() => setOverlay("rules")} />{overlay === "rules" && <RulesModal onClose={() => setOverlay(null)} />}</>;
  }

  return (
    <main className="game-shell">
      <GameHeader game={game} onRules={() => setOverlay("rules")} onPause={() => setOverlay("pause")} onLeave={() => setOverlay("leave")} />
      <section className="battlefield-stage">
        <GameCanvas
          state={game}
          selected={selected}
          onPlace={(kind, gridX, gridY) => setGame((current) => placeBuilding(current, "player", kind, gridX, gridY))}
          onCancelSelection={() => setSelected(null)}
          onHoverMessage={setHoverMessage}
        />
        <div className="resource-panel resource-panel--player"><span>YOUR RESERVES</span><b>◆ {Math.floor(game.coins.player)} MARKS</b><small>+{yieldFor(game, "player")} in {Math.max(1, Math.ceil(game.incomeClock))}s</small></div>
        <div className="resource-panel resource-panel--enemy"><span>RIVAL FORCE</span><b>{buildingCount(game, "enemy")} FOUNDRIES</b><small>{unitCount(game, "enemy")} cohorts afield</small></div>
        <div className={`event-ribbon${hoverMessage && selected ? " is-placement" : ""}`} role="status" aria-live="polite"><i /><span>{hoverMessage && selected ? hoverMessage : game.event}</span>{selectedDescription && <small>{selectedDescription}</small>}</div>
        {tutorial && game.status === "playing" && <TutorialCard game={game} selected={selected} onDismiss={() => setTutorial(false)} />}
      </section>
      <CommandDeck game={game} selected={selected} onSelect={(kind) => setSelected((current) => current === kind ? null : kind)} onReprieve={() => setGame((current) => castReprieve(current, "player"))} />

      {overlay === "rules" && <RulesModal onClose={() => setOverlay(null)} />}
      {overlay === "pause" && (
        <div className="modal-backdrop"><section className="pause-modal" role="dialog" aria-modal="true" aria-labelledby="pause-heading"><span className="eyebrow">LEDGER PAUSED</span><h2 id="pause-heading">The march is holding.</h2><p>No cohorts move and no Yield ticks while this panel is open.</p><button className="primary-button" onClick={() => setOverlay(null)}>Resume match <span>→</span></button><button className="secondary-button" onClick={() => setOverlay("rules")}>Open field guide</button><button className="text-button" onClick={() => setOverlay("leave")}>Leave this match</button></section></div>
      )}
      {overlay === "leave" && (
        <div className="modal-backdrop"><section className="pause-modal" role="dialog" aria-modal="true" aria-labelledby="leave-heading"><span className="eyebrow">ABANDON MATCH?</span><h2 id="leave-heading">This ledger cannot be recovered.</h2><div className="confirm-actions"><button className="primary-button" onClick={goToTitle}>Return to title</button><button className="secondary-button" onClick={() => setOverlay(null)}>Keep playing</button></div></section></div>
      )}
      {game.status !== "playing" && <ResultModal game={game} answer={feedback} copied={copied} onAnswer={setFeedback} onCopy={async () => { try { await navigator.clipboard.writeText(matchReport(game, feedback)); setCopied(true); } catch { setCopied(false); } }} onRestart={beginMatch} onTitle={goToTitle} />}
    </main>
  );
}
