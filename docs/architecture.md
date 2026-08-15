# Keepstorm Alpha architecture

## Current product boundary

The Alpha is a deterministic, one-player browser skirmish. The browser owns a pure TypeScript simulation, a React command interface, and a Canvas battlefield. This makes the full placement-to-victory loop cheap to tune before network authority is introduced.

```text
React interface
  ├─ title, guide, tutorial, pause, and result states
  ├─ construction cards and keyboard/touch controls
  └─ playtest report
          │ commands
          ▼
Pure simulation engine
  ├─ X/Y footprint validation and route finding
  ├─ Marks, Yield, production, and adaptive rival
  ├─ movement, targeting, counter damage, and keep defense
  └─ Reprieve, overtime pressure, and match resolution
          │ immutable snapshots
          ▼
Canvas renderer
  ├─ generated battlefield backdrop
  ├─ generated Daybreak and Nightveil atlases
  └─ grids, route previews, health, attacks, and effects
```

The engine clamps each update to 200 milliseconds. The interface requests updates every 50 milliseconds, pauses by stopping those requests, and renders the resulting snapshot. The simulation contains no browser APIs and can be run directly in automated tests.

## Placement and navigation

The battlefield is 3200 × 896 world units divided into 100 × 28 cells. Daybreak owns columns 5–16 and Nightveil owns columns 83–94. Every building declares a width and height in cells. The Canvas keeps this full native world width while a containing camera viewport scrolls horizontally; pointer coordinates are translated against the complete Canvas, so placement remains accurate at every camera position.

Before accepting a placement, the engine checks:

1. Match phase, building cap, and available Marks.
2. Entire footprint remains inside the team construction yard.
3. No occupied cell overlaps the candidate.
4. No production exit becomes occupied.
5. Every production building can still reach its team gate through a breadth-first grid search.

Each spawned cohort receives the current route from its individual Foundry to the gate, followed by the extended shared winding road and opposing Anchorhold. Existing cohorts retain their route so a later construction never invalidates an in-flight command.

## Combat and economy

- Production timers belong to individual Foundries, so positions and build times create staggered cohorts.
- Units find nearby enemy units first. Once inside the opposing yard they can attack targetable Foundries, then the Anchorhold.
- Hammer, Arrow, and Arc receive a 1.7× bonus into their countered armor and a 0.74× penalty in the reverse matchup.
- Each Anchorhold fires a periodic defensive shot at the nearest raider.
- Yield is calculated from living buildings and paid every seven seconds.
- The rival chooses a counter to the player’s dominant production type and periodically adds a Tallyhouse when its production base is developed.
- At 3:30, road position begins applying light pressure to the weaker Anchorhold so stalled matches resolve.

## When multiplayer is added

Real-time multiplayer should use WebSockets, but the solo Alpha does not need them. HTTPS remains appropriate for accounts, matchmaking, configuration, and assets. During a match, one authenticated WebSocket should carry player commands, acknowledgements, state deltas, reconnect snapshots, and match-end events.

The authoritative simulation should move unchanged into one stateful match room:

```text
browser clients
      │ sequenced commands / snapshots
      ▼
edge gateway and matchmaking
      │
      ▼
one authoritative match room
  ├─ fixed simulation tick
  ├─ placement, cost, cooldown, and ownership validation
  ├─ reconnect snapshot and event log
  └─ signed result
```

On Cloudflare, a Durable Object is a natural owner for one room. A conventional stateful service can use the same boundary. Clients should send intentions such as `place_building` and `cast_reprieve`, never health, damage, or currency totals. Start with versioned JSON messages; only adopt a binary snapshot format if measurements justify it.

## Next engineering gates

1. Collect solo playtest reports and tune costs, timers, counter strength, and rival cadence.
2. Add seeded randomness, state serialization, replay fixtures, and longer property simulations.
3. Move the engine to authoritative 1v1 rooms with reconnect support.
4. Add parties and team ownership only after 1v1 rules are stable.
