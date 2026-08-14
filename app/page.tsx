"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  KEEP_MAX_HP,
  MATCH_LIMIT,
  MAX_WORKS,
  STORM_READY_AT,
  UNIT_KINDS,
  UNIT_SPECS,
  castStormbreak,
  createInitialState,
  levyFor,
  purchaseWork,
  stepGame,
  stormReady,
  totalWorks,
  type GameState,
  type Team,
  type UnitKind,
  type WorkCounts,
} from "@/lib/game-engine";

type Screen = "title" | "game";

const COUNTER_COPY: Record<UnitKind, string> = {
  kilnward: "Crushes Layered",
  windlass: "Unravels Woven",
  prism: "Cracks Plated",
};

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function percent(value: number, maximum: number): number {
  return Math.max(0, Math.min(100, (value / maximum) * 100));
}

function Keep({ team, health }: { team: Team; health: number }) {
  const isPlayer = team === "player";
  return (
    <div className={`heartkeep heartkeep--${team}`}>
      <span className="heartkeep__banner">{isPlayer ? "YOU" : "RIVAL"}</span>
      <div className="heartkeep__crown" aria-hidden="true"><i /><i /><i /></div>
      <span className="heartkeep__core" aria-hidden="true" />
      <strong>{isPlayer ? "HEARTHKEEP" : "GLOAMKEEP"}</strong>
      <small>{Math.ceil(health).toLocaleString()}</small>
      <span className="keep-health" aria-label={`${Math.ceil(health)} keep health`}>
        <i style={{ width: `${percent(health, KEEP_MAX_HP)}%` }} />
      </span>
    </div>
  );
}

function WorkRack({ team, works }: { team: Team; works: WorkCounts }) {
  const isPlayer = team === "player";
  return (
    <div className={`work-rack work-rack--${team}`} aria-label={`${isPlayer ? "Your" : "Rival"} Musterworks`}>
      {totalWorks(works) === 0 ? (
        isPlayer ? <p>Choose a Musterwork below to begin your line.</p> : <p>The rival is choosing a craft.</p>
      ) : (
        UNIT_KINDS.flatMap((kind) =>
          Array.from({ length: works[kind] }, (_, index) => (
            <span
              className={`built-work built-work--${kind}`}
              title={UNIT_SPECS[kind].name}
              key={`${kind}-${index}`}
            >
              <i aria-hidden="true" />
            </span>
          )),
        )
      )}
    </div>
  );
}

function BattleUnit({ unit }: { unit: GameState["units"][number] }) {
  const laneOffset = ((unit.id * 7) % 4) * 4;
  const style: CSSProperties = {
    left: `${unit.x / 10}%`,
    bottom: `${25 + laneOffset}%`,
    zIndex: 30 + laneOffset,
  };
  return (
    <div
      className={`battle-unit battle-unit--${unit.kind} battle-unit--${unit.team} ${unit.attackFlash > 0 ? "battle-unit--attacking" : ""}`}
      style={style}
      title={`${unit.team === "player" ? "Your" : "Rival"} ${UNIT_SPECS[unit.kind].company}`}
    >
      <span className="unit-health" aria-hidden="true"><i style={{ width: `${percent(unit.hp, unit.maxHp)}%` }} /></span>
      <span className="battle-unit__body" aria-hidden="true">
        <i className="battle-unit__head" />
        <i className="battle-unit__tool" />
      </span>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("title");
  const [game, setGame] = useState<GameState>(createInitialState);
  const [paused, setPaused] = useState(false);

  const playerUnits = useMemo(() => game.units.filter((unit) => unit.team === "player").length, [game.units]);
  const enemyUnits = game.units.length - playerUnits;
  const playerStormReady = stormReady(game, "player");
  const stormCountdown = Math.max(0, Math.ceil(STORM_READY_AT - game.elapsed));
  const playerAtCap = totalWorks(game.works.player) >= MAX_WORKS;

  useEffect(() => {
    if (screen !== "game" || paused || game.status !== "playing") return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - previous) / 1000;
      previous = now;
      setGame((current) => stepGame(current, delta));
    }, 100);
    return () => window.clearInterval(timer);
  }, [screen, paused, game.status]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (screen !== "game") return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < UNIT_KINDS.length) {
        setGame((current) => purchaseWork(current, "player", UNIT_KINDS[index]));
      }
      if (event.code === "Space") {
        event.preventDefault();
        setGame((current) => castStormbreak(current, "player"));
      }
      if (event.key.toLowerCase() === "p" || event.key === "Escape") setPaused((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen]);

  function startMatch() {
    setGame(createInitialState());
    setPaused(false);
    setScreen("game");
  }

  function build(kind: UnitKind) {
    setGame((current) => purchaseWork(current, "player", kind));
  }

  if (screen === "title") {
    return (
      <main className="title-screen">
        <div className="title-screen__art" aria-hidden="true" />
        <div className="title-screen__veil" />
        <nav className="masthead" aria-label="Primary navigation">
          <a className="wordmark" href="#top" aria-label="Keepstorm home">
            <span className="wordmark__crest">K</span>
            <span>KEEPSTORM</span>
          </a>
          <span className="edition-pill">PLAYABLE FIRST MUSTER</span>
        </nav>

        <section className="hero-copy" id="top">
          <p className="eyebrow">A LIVING BATTLEFIELD OF BRASS, CLOTH &amp; STORMGLASS</p>
          <h1>Build the line.<br />Break the keep.</h1>
          <p className="hero-copy__body">
            Raise enchanted workshops. Muster their creations automatically.
            Read the rival line and turn one glorious counter into a crushing march.
          </p>
          <button className="primary-action" onClick={startMatch}>
            <span>Begin solo skirmish</span>
            <span aria-hidden="true">→</span>
          </button>
          <div className="feature-row" aria-label="Game features">
            <span>1 winding lane</span>
            <span>3 rival materials</span>
            <span>1 decisive Stormbreak</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <button className="wordmark wordmark--button" onClick={() => setScreen("title")} aria-label="Return to title">
          <span className="wordmark__crest">K</span>
          <span>KEEPSTORM</span>
        </button>
        <div className="round-label">
          <span>SOLO SKIRMISH · {formatTime(MATCH_LIMIT - game.elapsed)}</span>
          <strong>THE FIRST MUSTER</strong>
        </div>
        <div className="topbar-actions">
          <div className="resource-bar" aria-label={`${Math.floor(game.playerCoin)} coin, ${levyFor(game.works.player)} levy`}>
            <span className="resource-bar__mark" aria-hidden="true">◆</span>
            <span><strong>{Math.floor(game.playerCoin)}</strong> COIN</span>
            <span className="resource-bar__levy">+{levyFor(game.works.player)} LEVY</span>
          </div>
          <button className="pause-button" onClick={() => setPaused((current) => !current)}>
            {paused ? "RESUME" : "PAUSE"}
          </button>
        </div>
      </header>

      <section className="battlefield" aria-label="Keepstorm battlefield">
        <div className="storm-sky" aria-hidden="true" />
        <div className="far-ridge" aria-hidden="true" />
        <div className="lane" aria-hidden="true" />
        <div className="counter-ribbon" aria-label="Counter guide">
          <span><b>IMPACT</b> breaks Layered</span>
          <i>◆</i>
          <span><b>VOLLEY</b> unravels Woven</span>
          <i>◆</i>
          <span><b>SURGE</b> cracks Plated</span>
        </div>
        <div className="battle-event" key={game.eventSerial} role="status" aria-live="polite">
          {game.event}
        </div>

        <Keep team="player" health={game.playerKeep} />
        <Keep team="enemy" health={game.enemyKeep} />

        <div className="rally-mark" aria-hidden="true">
          <span />
          <small>RALLY MARK</small>
        </div>

        {game.units.map((unit) => <BattleUnit unit={unit} key={unit.id} />)}

        <div className="battle-count battle-count--player"><b>{playerUnits}</b><span>YOUR LINE</span></div>
        <div className="battle-count battle-count--enemy"><b>{enemyUnits}</b><span>RIVAL LINE</span></div>
        <WorkRack team="player" works={game.works.player} />
        <WorkRack team="enemy" works={game.works.enemy} />

        {paused && game.status === "playing" && (
          <div className="pause-veil">
            <span className="eyebrow">THE STORM HOLDS</span>
            <strong>Skirmish paused</strong>
            <button onClick={() => setPaused(false)}>Resume the march</button>
          </div>
        )}

        {game.status !== "playing" && (
          <div className={`result-panel result-panel--${game.status}`} role="dialog" aria-modal="true" aria-label="Match result">
            <span className="eyebrow">{game.status === "won" ? "THE LINE HOLDS" : "THE KEEP IS QUIET"}</span>
            <h2>{game.status === "won" ? "Victory" : "Defeat"}</h2>
            <p>{game.event}</p>
            <div className="result-stats">
              <span><b>{formatTime(game.elapsed)}</b> duration</span>
              <span><b>{totalWorks(game.works.player)}</b> works raised</span>
              <span><b>{playerUnits}</b> company standing</span>
            </div>
            <div className="result-actions">
              <button className="primary-action" onClick={startMatch}>Muster again <span>→</span></button>
              <button className="quiet-action" onClick={() => setScreen("title")}>Return to title</button>
            </div>
          </div>
        )}
      </section>

      <section className="command-deck" aria-label="Build controls">
        <div className="command-intro">
          <span className="eyebrow">YOUR MUSTERWORKS · {totalWorks(game.works.player)}/{MAX_WORKS}</span>
          <strong>Every workshop raises its own company.</strong>
          <small>Next Levy in {Math.max(1, Math.ceil(game.economyClock))}s</small>
        </div>
        <div className="build-cards">
          {UNIT_KINDS.map((kind, index) => {
            const work = UNIT_SPECS[kind];
            const disabled = game.status !== "playing" || playerAtCap || game.playerCoin < work.cost;
            return (
              <button
                className={`build-card build-card--${kind}`}
                disabled={disabled}
                key={kind}
                onClick={() => build(kind)}
                aria-label={`Build ${work.name} for ${work.cost} coin. ${work.description}`}
              >
                <span className="build-card__index">{index + 1}</span>
                <span className="build-card__icon" aria-hidden="true"><i /></span>
                <span className="build-card__copy">
                  <strong>{work.name}</strong>
                  <small>{work.damageType} · {work.armorType}</small>
                  <em>{COUNTER_COPY[kind]}</em>
                </span>
                <span className="build-card__count">×{game.works.player[kind]}</span>
                <span className="build-card__cost">◆ {work.cost}</span>
              </button>
            );
          })}
        </div>
        <button
          className={`stormbreak-button ${playerStormReady ? "stormbreak-button--ready" : ""}`}
          disabled={!playerStormReady}
          onClick={() => setGame((current) => castStormbreak(current, "player"))}
          aria-label={playerStormReady ? "Cast Stormbreak" : game.stormUsed.player ? "Stormbreak spent" : `Stormbreak ready in ${stormCountdown} seconds`}
        >
          <span className="stormbreak-button__icon" aria-hidden="true">✦</span>
          <span>
            <strong>STORMBREAK</strong>
            <small>{game.stormUsed.player ? "SPENT" : playerStormReady ? "PRESS SPACE" : `CHARGING · ${stormCountdown}s`}</small>
          </span>
        </button>
      </section>
    </main>
  );
}
