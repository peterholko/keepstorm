# Keepstorm Alpha architecture

## Current product boundary

The Alpha uses one deterministic TypeScript simulation for Solo and authoritative 1v1/2v2 rooms. React owns the command interface, Canvas renders the battlefield, and a Cloudflare Durable Object owns each online match.

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

The battlefield is 3200 × 896 world units divided into 100 × 28 cells. Each side has two 13 × 9 construction yards aligned to the dirt clearings: western columns 8–20 and eastern columns 79–91. Every building declares a width and height in cells. The Canvas keeps this full native world width while a containing camera viewport scrolls horizontally; pointer coordinates are translated against the complete Canvas, so placement remains accurate at every camera position.

Before accepting a placement, the engine checks:

1. Match phase, the 30-structure commander cap, treasury cap, and available resources.
2. Entire footprint remains inside the team construction yard.
3. No occupied cell overlaps the candidate.
4. No production exit becomes occupied.
5. Every production building can still reach its team gate through a breadth-first grid search.

Each spawned cohort receives the current route from its individual Foundry to the gate, followed by the extended shared winding road and opposing Keep. Existing cohorts retain their route so a later construction never invalidates an in-flight command.

## Combat and economy

- Production timers belong to individual Foundries. Their cadence scales with total Marks invested, so stronger ranks deploy less often and positions still create staggered cohorts.
- Units find nearby enemy units first. Once inside the opposing yard they can attack targetable Foundries, then the Keep.
- Each commander owns one manually repositioned, untargetable Keep Warden with a ranged attack. Server validation confines it to that commander&apos;s base yard; it can defend but never enters enemy cohort targeting or pathfinding.
- Hammer, Arrow, and Arc receive a 1.7× bonus into their countered armor and a 0.74× penalty in the reverse matchup.
- Each Keep fires a periodic defensive shot at the nearest raider.
- Each commander begins with 400 Marks, 125 Timber, and one Sigil—enough for every faction's three least-expensive troop structures. Five base Marks plus cost-derived income from surviving buildings are paid every 10 seconds.
- Passive income uses eight progressive 25-Mark tax brackets, rising by 10% per bracket to an 80% ceiling.
- Normal unit works contribute 2% of invested Marks and return 100% of their Mark cost as Timber. Siege contributes 1.8% and returns 75%; support contributes 1.2%, enemy-targeting support 0.9%, and towers 0.8%. Legendary unit ranks return 25%, with any one return capped at 300 Timber.
- Faction treasuries cost 350 Marks and 500 Timber, add their support-building income, and multiply total income by 25%. Each later treasury contributes 85% of the previous multiplier bonus, up to five per commander.
- The solo rival scores the player’s weighted armor mix, air and anti-air coverage, production count, and live field pressure. It maintains a production floor before reserving Marks, balances frontline, support, air, anti-air, and Siege roles, and alternates gate-side placement between both yards.
- Strategic spending is conditional rather than a fixed build order: reactive towers and emergency items answer pressure; support works, upgrades, legendary ranks, Rally Horn, and late treasuries are purchased only after production has caught up. Rally Sync is enabled only for near-matching production cadences and disabled under pressure.
- At 3:30, road position begins applying light pressure to the weaker Keep so stalled matches resolve.

## Multiplayer authority

Real-time multiplayer uses one authenticated WebSocket per player for sequenced commands, acknowledgements, authoritative snapshots, reconnects, and match-end events. HTTPS handles room creation, joining, configuration, and assets.

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

On Cloudflare, one Durable Object owns each room. Clients send intentions such as `place_building`, `move_keep_warden`, and `cast_reprieve`, never health, damage, or currency totals. The server validates commander ownership, yard boundaries, costs, and cooldowns before mutating the authoritative snapshot.

## Next engineering gates

1. Collect solo playtest reports and tune costs, timers, counter strength, and rival cadence.
2. Add seeded randomness, state serialization, replay fixtures, and longer property simulations.
3. Move the engine to authoritative 1v1 rooms with reconnect support.
4. Add parties and team ownership only after 1v1 rules are stable.
