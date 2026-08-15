"use client";

import StartSteps from "./start-steps";
import { FACTIONS, commanderLabel, teamForCommander, type CommanderId } from "@/lib/keepstorm/engine";
import { seatsForMode, type RoomSnapshot } from "@/lib/multiplayer/protocol";

export default function LobbyModal({
  snapshot,
  roomCode,
  localCommander,
  connection,
  copied,
  onCopy,
  onReady,
  onLeave,
  onRules,
}: {
  snapshot: RoomSnapshot | null;
  roomCode: string;
  localCommander: CommanderId | null;
  connection: string;
  copied: boolean;
  onCopy: () => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
  onRules: () => void;
}) {
  const mode = snapshot?.mode ?? "1v1";
  const requiredSeats = seatsForMode(mode);
  const localSeat = localCommander && snapshot ? snapshot.seats[localCommander] : null;
  const joinedPlayers = snapshot ? requiredSeats.filter((commander) => snapshot.seats[commander].claimed).length : 0;
  const localTeam = localCommander ? teamForCommander(localCommander) : null;
  const missingPlayers = requiredSeats.length - joinedPlayers;
  const allPlayersJoined = missingPlayers === 0;
  const canReady = connection === "connected"
    && allPlayersJoined
    && requiredSeats.every((commander) => snapshot?.seats[commander].connected);

  return (
    <div className="modal-backdrop lobby-backdrop">
      <section className="lobby-modal" role="dialog" aria-modal="true" aria-labelledby="lobby-heading">
        <StartSteps current={3} online />
        <h2 id="lobby-heading">Room {roomCode}</h2>
        <p>
          {allPlayersJoined
            ? `All ${requiredSeats.length} players are here. Set Ready when you're done.`
            : `Waiting for ${missingPlayers} more player${missingPlayers === 1 ? "" : "s"}. Share the invite link.`}
        </p>

        <div className="room-code-panel">
          <span>Room code</span>
          <strong>{roomCode || "--------"}</strong>
          <button onClick={onCopy} disabled={!roomCode}>{copied ? "Copied" : "Copy invite link"}</button>
        </div>

        <div className="lobby-seats">
          {requiredSeats.map((commander) => {
            const seat = snapshot?.seats[commander];
            const isYou = commander === localCommander;
            const isAlly = !isYou && localTeam === teamForCommander(commander);
            const factionInfo = seat?.faction ? FACTIONS[seat.faction] : null;
            const relationship = isYou ? "You" : isAlly ? "Ally" : "Opponent";
            const status = seat?.connected
              ? seat.ready ? "Ready" : "Connected"
              : seat?.claimed ? "Reconnecting…" : "Open seat";

            return (
              <article key={commander} className={`${seat?.claimed ? "is-claimed" : ""}${isYou ? " is-you" : ""}${isAlly ? " is-ally" : ""}`}>
                <i style={factionInfo ? { background: factionInfo.color } : undefined}>{factionInfo?.crest ?? "?"}</i>
                <div>
                  <small><span>{relationship}</span><span>{commanderLabel(commander)}</span></small>
                  <b>{factionInfo?.name ?? "Waiting for player"}</b>
                  <span>{status}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className={`connection-state connection-state--${connection}`} role="status">
          <i />
          {connection === "connected" ? "Connected" : connection === "reconnecting" ? "Reconnecting…" : "Opening room…"}
        </div>
        <div className="lobby-actions">
          <button className="primary-button" disabled={!canReady} onClick={() => onReady(!localSeat?.ready)}>
            {localSeat?.ready ? "Not ready" : allPlayersJoined ? "Ready" : "Waiting for players"}
          </button>
          <div>
            <button className="text-button" onClick={onRules}>How to play</button>
            <button className="text-button" onClick={onLeave}>Leave room</button>
          </div>
        </div>
        <small className="lobby-footnote">If you disconnect during a match, you have 30 seconds to return.</small>
      </section>
    </div>
  );
}
