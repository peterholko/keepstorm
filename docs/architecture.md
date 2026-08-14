# Keepstorm architecture

## Product boundary

Keepstorm is an original browser strategy game inspired by the broad pattern of automatic lane armies and counter-building. It uses its own setting, factions, terminology, interface, code, balance, rules implementation, and artwork.

The first vertical slice is intentionally local and deterministic: one human Steward faces one adaptive rival in a single browser tab. This proves the battle loop before networking increases the cost of every gameplay change.

## Do we need WebSockets?

Yes for real-time multiplayer, but not for the solo prototype.

- HTTPS is best for sign-in, matchmaking, player profiles, progression, patch data, and loading assets.
- A WebSocket is best once a match begins because the server must continuously receive player commands and broadcast authoritative state without repeated request setup.
- WebRTC is unnecessary for the main game state. It complicates authority and cheating controls without helping this low-bandwidth strategy loop.

Keepstorm has relatively infrequent player commands, but its armies move and fight continuously. A WebSocket therefore improves responsiveness, reconnection, spectators, and match observation even though the bandwidth requirement is modest.

## Recommended production shape

```text
Browser client
  ├─ React interface and account screens
  ├─ battlefield renderer
  ├─ local interpolation and effects
  └─ WebSocket match connection
          │
          ▼
Edge gateway
  ├─ authentication
  ├─ matchmaking and party APIs
  └─ routes each socket to one match room
          │
          ▼
Authoritative match room
  ├─ fixed-step simulation
  ├─ validates build and ability commands
  ├─ owns random seed, Coin, units, damage, and victory
  ├─ broadcasts snapshots and events
  └─ stores reconnect state and replay log
          │
          ├─ profile/progression database
          ├─ replay and telemetry storage
          └─ balance/config service
```

One stateful room should own one match. On Cloudflare, a Durable Object is a natural room host; on a conventional stack, the same boundary can be implemented by a stateful Node service backed by Redis for routing and recovery.

## Simulation model

- The server is authoritative. Browsers send intentions such as `build_musterwork`, `cast_stormbreak`, or `set_rally_mark`; they never send damage or Coin totals.
- The server advances a fixed simulation tick, initially 10–20 times per second.
- State snapshots can be broadcast 5–10 times per second because player decisions are slower than action-game inputs.
- Clients interpolate unit positions between snapshots and play visual effects immediately from confirmed events.
- Every match records its ruleset version and random seed. That makes replays, desync debugging, and balance comparisons reproducible.
- Balance data lives outside rendering code and is versioned with the server ruleset.

## Match and player model

The room model should support two opposing teams with one to six seats per team, allowing 1v1 through 6v6 without changing the protocol. Each seat owns its Coin, Levy, Musterworks, tech choices, and one-use powers. A team shares the lane objective and Heartkeep health. Team sizes and whether resources are fully individual or partially shared are ruleset options.

## Connection lifecycle

1. The browser signs in over HTTPS and joins a party or queue.
2. Matchmaking creates a room and returns a short-lived match token.
3. The browser opens one authenticated WebSocket to that room.
4. The room sends a complete initial snapshot and server clock.
5. The browser sends sequenced commands; the room acknowledges or rejects each command.
6. The room broadcasts compact deltas, combat events, and occasional full snapshots.
7. A reconnecting player presents the match token and last acknowledged sequence to resume.
8. At match end, the room commits the signed result and replay log before it closes.

## Network messages

Start with versioned JSON messages while the game is changing quickly. Move hot snapshots to a binary codec only after measurements show that JSON is a real bottleneck.

```text
client → server
  hello { protocol, token, lastSequence }
  command { sequence, type, payload, clientTime }
  ping { clientTime }

server → client
  welcome { matchId, seat, ruleset, snapshot, serverTime }
  commandResult { sequence, accepted, reason? }
  delta { tick, changes }
  event { tick, type, payload }
  snapshot { tick, state }
  matchEnded { result, replayId }
```

## Trust and anti-cheat

- Validate costs, cooldowns, placement, ownership, and match phase on the room server.
- Rate-limit commands per seat and reject duplicates by sequence number.
- Never expose hidden opponent choices before the rules say they are visible.
- Sign final results server-side; progression services only accept signed outcomes.
- Keep cosmetic ownership and loadout validation outside the simulation hot path.

## Delivery phases

1. **Playable solo slice:** deterministic browser simulation, three-way counter cycle, adaptive rival, economy, one-use Stormbreak, win/loss loop.
2. **Rules extraction:** move the engine into a shared package, add seeded randomness, serialization, property tests, and replay fixtures.
3. **Private multiplayer:** authoritative 1v1 rooms, WebSocket reconnect, command validation, and match logs.
4. **Team play:** parties, 2v2–6v6 seat model, team pings, surrender, spectators, and reconnection ownership.
5. **Live game:** accounts, progression, cosmetics, moderation, telemetry, balance rollout, ranked queues, and replay viewing.

The key sequencing decision is to stabilize the rules before putting them behind WebSockets. Networking should transport the simulation, not define it.
