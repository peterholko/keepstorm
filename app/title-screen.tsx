"use client";

import BrandMark from "./brand-mark";
import StartSteps from "./start-steps";
import { ROOM_CODE_LENGTH, normalizeRoomCode } from "@/lib/multiplayer/protocol";
import { FACTIONS, FACTION_IDS, type FactionId } from "@/lib/keepstorm/engine";

export type StartMode = "solo" | "1v1" | "2v2" | "join";
export type StartStep = "mode" | "faction";

const MODE_OPTIONS: { id: StartMode; name: string; detail: string }[] = [
  { id: "solo", name: "Solo", detail: "Play against the AI" },
  { id: "1v1", name: "1v1", detail: "Online with 2 players" },
  { id: "2v2", name: "2v2", detail: "Online with 2 teams of 2" },
  { id: "join", name: "Join a game", detail: "Enter a code from a friend" },
];

const FACTION_COPY: Record<FactionId, { summary: string; passive: string }> = {
  daybreak: {
    summary: "Balanced defense, ranged fire, and air.",
    passive: "Nearby allies take 10% less damage.",
  },
  briarcrown: {
    summary: "Regeneration, poison, slows, and siege.",
    passive: "All living units regain health every second.",
  },
  stormglass: {
    summary: "Fast production, stuns, and artillery.",
    passive: "Units are produced and attack 8% faster.",
  },
};

function modeContext(mode: StartMode): string {
  if (mode === "solo") return "Solo against the AI";
  if (mode === "1v1") return "1v1 online game";
  if (mode === "2v2") return "2v2 online game";
  return "Join an online game";
}

function startLabel(mode: StartMode, busy: boolean): string {
  if (mode === "solo") return "Play";
  if (mode === "join") return busy ? "Joining…" : "Join room";
  return busy ? "Creating room…" : "Create room";
}

export default function TitleScreen({
  step,
  mode,
  faction,
  joinCode,
  onlineBusy,
  onlineNotice,
  onStep,
  onMode,
  onFaction,
  onJoinCode,
  onStart,
  onRules,
}: {
  step: StartStep;
  mode: StartMode | null;
  faction: FactionId | null;
  joinCode: string;
  onlineBusy: boolean;
  onlineNotice: string | null;
  onStep: (step: StartStep) => void;
  onMode: (mode: StartMode) => void;
  onFaction: (faction: FactionId) => void;
  onJoinCode: (code: string) => void;
  onStart: () => void;
  onRules: () => void;
}) {
  const online = mode !== null && mode !== "solo";
  const canContinue = Boolean(mode) && (mode !== "join" || joinCode.length === ROOM_CODE_LENGTH);

  return (
    <main className="title-screen">
      <div className="title-art" aria-hidden="true" />
      <div className="title-vignette" aria-hidden="true" />
      <header className="title-header">
        <BrandMark />
        <strong>KEEPSTORM</strong>
        <span className="alpha-label">Alpha 0.4</span>
      </header>

      <section className="start-shell" aria-labelledby="start-heading">
        <div className="title-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/keepstorm-banner-v1.png" alt="Keepstorm" width="1200" height="437" />
        </div>
        <div className="start-panel">
          <StartSteps current={step === "mode" ? 1 : 2} online={online} />

          {step === "mode" ? (
            <>
              <div className="start-panel-heading">
                <h1 id="start-heading">Start a game</h1>
                <p>Choose how you want to play.</p>
              </div>
              <div className="mode-grid" aria-label="Choose a game mode">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`mode-card${mode === option.id ? " is-selected" : ""}`}
                    onClick={() => onMode(option.id)}
                    aria-pressed={mode === option.id}
                  >
                    <b>{option.name}</b>
                    <small>{option.detail}</small>
                  </button>
                ))}
              </div>
              {mode === "join" && (
                <label className="join-code-field" htmlFor="room-code">
                  <span>Room code</span>
                  <input
                    id="room-code"
                    value={joinCode}
                    onChange={(event) => onJoinCode(normalizeRoomCode(event.target.value))}
                    placeholder="8-character code"
                    maxLength={ROOM_CODE_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}
              <div className="step-actions">
                <button className="text-button" onClick={onRules}>How to play</button>
                <button className="primary-button" disabled={!canContinue} onClick={() => onStep("faction")}>Next</button>
              </div>
            </>
          ) : (
            <>
              <div className="start-panel-heading">
                <h1 id="start-heading">Choose your faction</h1>
                <p>{mode ? modeContext(mode) : "Choose a game mode first"}</p>
              </div>
              <div className="start-faction-grid" aria-label="Choose your faction">
                {FACTION_IDS.map((id) => {
                  const option = FACTIONS[id];
                  const copy = FACTION_COPY[id];
                  return (
                    <button
                      key={id}
                      className={`start-faction-card${faction === id ? " is-selected" : ""}`}
                      style={faction === id ? { borderColor: option.color } : undefined}
                      onClick={() => onFaction(id)}
                      aria-pressed={faction === id}
                    >
                      <i style={{ background: option.color }}>{option.crest}</i>
                      <b>{option.name}</b>
                      <small>{copy.summary}</small>
                      <p>{copy.passive}</p>
                    </button>
                  );
                })}
              </div>
              <div className="step-actions step-actions--faction">
                <div>
                  <button className="text-button" onClick={() => onStep("mode")}>Back</button>
                  <button className="text-button" onClick={onRules}>How to play</button>
                </div>
                <div className="start-submit">
                  {onlineNotice && <p className="start-notice" role="alert">{onlineNotice}</p>}
                  <button className="primary-button" disabled={!faction || !mode || onlineBusy} onClick={onStart}>
                    {mode ? startLabel(mode, onlineBusy) : "Continue"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
