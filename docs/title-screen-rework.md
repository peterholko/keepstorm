# Title screen rework

## Copy changes

Unchanged proper names and labels are omitted. Dynamic values are shown in braces.

| Area | Before | After |
| --- | --- | --- |
| Header | `TEAM ALPHA · 0.4` | `Alpha 0.4` |
| Title intro | `AN AUTOMATED SIEGE STRATEGY GAME` | Removed |
| Title heading | `Build the answer. Time the march.` | `Start a game` on Step 1; `Choose your faction` on Step 2 |
| Title description | `Command an asymmetric host across a living construction yard, then outthink a rival through counters, upgrades, economy, formation timing, and combined arms.` | `Your buildings spawn units on their own. Destroy the enemy Anchorhold first.` |
| Step guidance | Not present | `Choose how you want to play.` |
| Progress | Not present | `1 Mode`, `2 Faction`, and online-only `3 Lobby` |
| Solo option | `Solo skirmish →` | `Solo` / `Play against the AI` |
| 1v1 option | `1v1 Duel` / `Two commanders · both yards` | `1v1` / `Online with 2 players` |
| 2v2 option | `2v2 Teams` / `Four commanders · personal yards & reserves` | `2v2` / `Online with 2 teams of 2` |
| Join option | `JOIN A COMMANDER` | `Join a game` / `Enter a code from a friend` |
| Code field | `8-CHAR CODE` | `Room code` / `8-character code` |
| Step navigation | Not present | `Next` / `Back` |
| Rules link | `Read the field guide ↗` | `How to play` |
| Solo CTA | `Solo skirmish →` | `Play` |
| Online CTA | `Create {mode} room` | `Create room` |
| Join CTA | `Join room` | `Join room` (moved to Step 2) |
| Create busy state | `Opening room…` | `Creating room…` |
| Join busy state | No busy label | `Joining…` |
| Solo context | Not present | `Solo against the AI` |
| 1v1 context | Not present | `1v1 online game` |
| 2v2 context | Not present | `2v2 online game` |
| Join context | Not present | `Join an online game` |
| Daybreak summary | `Formation & protection` | `Balanced defense, ranged fire, and air.` |
| Daybreak passive | `Ordered Ranks: nearby allies share 10% damage resistance.` | `Nearby allies take 10% less damage.` |
| Briarcrown summary | `Regrowth & attrition` | `Regeneration, poison, slows, and siege.` |
| Briarcrown passive | `Deep Roots: every living cohort regenerates health each second.` | `All living units regain health every second.` |
| Stormglass summary | `Tempo & disruption` | `Fast production, stuns, and artillery.` |
| Stormglass passive | `Quick Current: production and attack cycles run 8% faster.` | `Units are produced and attack 8% faster.` |
| Faction panel label | `SELECTED FACTION` | Removed |
| Faction descriptions | Three long faction descriptions | Removed |
| Faction detail labels | `DOCTRINE`, `ARSENAL`, `VICTORY` | Removed |
| Arsenal detail | `5 cohorts · special · economy · tower` | Removed |
| Victory detail | `Win two rounds · solo, online 1v1 or team 2v2` | Removed |
| Fact strip | `Three asymmetric factions`, `Twenty-four structures`, `Fifteen ability-driven cohorts` | Removed |
| Footer | `ORIGINAL ALPHA ART · KEYBOARD, MOUSE & TOUCH` | Removed |
| Lobby label | `LIVE {MODE} · AUTHORITATIVE ROOM` | Step indicator ending in `3 Lobby` |
| Lobby heading | `{N} commanders assembled.` / `{N} of {TOTAL} seats claimed.` | `Room {CODE}` |
| Lobby waiting text | `Send the room code or invitation link to {N} more commanders. Seats fill East, West ally, then East ally.` | `Waiting for {N} more players. Share the invite link.` |
| Lobby full text | `Every commander chooses readiness. In team mode, allies keep separate factions, reserves, yards, and wave controls.` | `All {N} players are here. Set Ready when you're done.` |
| Copy button | `Copy invitation link` / `Invitation copied ✓` | `Copy invite link` / `Copied` |
| Seat relationship | `YOUR SEAT` / `ALLY SEAT` / `RIVAL SEAT` | `You` / `Ally` / `Opponent` |
| Empty seat name | `Awaiting commander` | `Waiting for player` |
| Seat status | `Ready for battle` | `Ready` |
| Seat status | `Connected · choosing readiness` | `Connected` |
| Seat status | `Invitation available` | `Open seat` |
| Seat status | `Reconnecting…` | `Reconnecting…` (unchanged) |
| Room connection | `Live room connected` | `Connected` |
| Room connection | `Restoring your seat…` | `Reconnecting…` |
| Room connection | `Opening live room…` | `Opening room…` |
| Ready action | `Ready for battle` | `Ready` |
| Ready action | `Cancel readiness` | `Not ready` |
| Ready action | `Waiting for commanders` | `Waiting for players` |
| Lobby footnote | `Your seat reconnects automatically after a brief network interruption. A live match allows 30 seconds to return.` | `If you disconnect during a match, you have 30 seconds to return.` |
| Rules close label | `Close field guide` | `Close how to play` |
| Rules label | `FIELD GUIDE · THE FULL WAR LEDGER` | `HOW TO PLAY` |
| Rules heading | `Build an army that answers the army coming back.` | `Build units. Break the enemy Anchorhold.` |
| Rules intro | `Your structures raise cohorts automatically. The strategic game is choosing a faction, shaping the yard, reading armor, timing waves, and deciding when to trade growth for immediate power.` | `Buildings create units automatically. Choose what to build, where to place it, and when to improve it.` |
| Rule 1 | `Three asymmetric factions` plus faction marketing copy | `Factions` / `Each faction has five unit buildings, one support building, one income building, and one tower.` |
| Rule 2 | `Three-resource economy` plus resource copy | `Resources` / `Marks buy buildings, upgrades, and items. Construction earns Timber for advanced buildings. Sigils unlock legendary unit upgrades.` |
| Rule 3 | `Five damage and armor classes` plus counter copy | `Damage and armor` / `Hammer, Arrow, Arc, Siege, and Pure attacks work differently against Plate, Cloth, Ward, Fortified, and Ethereal armor. Only some units can attack air.` |
| Rule 4 | `Veteran and legendary ranks` plus structure/cohort copy | `Upgrades` / `Select one of your buildings to improve its health, unit strength, ability power, income, and production speed. Legendary unit upgrades cost a Sigil.` |
| Rule 5 | `Specials, towers, and items` plus faction works/shop copy | `Support, towers, and items` / `Support buildings shield, heal, or disrupt. Towers defend your build area but are weak to Siege damage. Items give permanent bonuses or one-use effects.` |
| Rule 6 | `Wave synchronization` plus Foundry/cadence copy | `Rally Sync` / `Rally Sync releases units from every active unit building together at the slowest production rate. Pause individual buildings to control their timing.` |
| Rule 7 | `One Reprieve per round` plus emergency seal copy | `Reprieve` / `After 1:15, you can use Reprieve once per round. It removes enemies on your half and damages enemies farther away.` |
| Rule 8 | `First to two rounds` plus ledger tie-break copy | `Winning` / `Destroy the enemy Anchorhold to win the round. At the time limit, unused Reprieve, income, base health, and remaining unit strength break ties in that order.` |
| Rule 9 | `True 2v2 alliances` plus commander/yard copy | `2v2` / `Four players each choose a faction and manage separate resources, build areas, buildings, items, Rally Sync, and Reprieve. Allies share one Anchorhold and one army.` |
| Damage guide label | `Damage relationships` | `Damage types` |
| Hammer note | `crushes Plate` | `strong against Plate` |
| Arrow note | `cuts Cloth` | `strong against Cloth` |
| Arc note | `breaks Ward` | `strong against Ward` |
| Siege note | `shatters Fortified` | `strong against Fortified` |
| Pure note | `always deals steady damage` | `deals steady damage` |
| Rules CTA | `Open the war ledger →` | `Back` |
| Browser title | `Keepstorm — Build the answer. Time the march.` | `Keepstorm` |
| Meta description | `Choose an asymmetric faction, place and upgrade structures across a scrolling battlefield, synchronize automatic cohorts, and outbuild an adaptive rival in Keepstorm.` | `A browser strategy game where buildings create units automatically and players race to destroy the enemy Anchorhold.` |
| Social title | `Keepstorm — Build the answer. Time the march.` | `Keepstorm` |
| Social description | Wordy faction/yard copy | `Build structures that create units automatically, then destroy the enemy Anchorhold.` |
| Social image alt | `Original automated siege forces clash in Keepstorm` | `Keepstorm browser strategy game` |

## State machine

1. `step = mode` starts with `mode = null` and shows four unselected mode buttons.
2. A complete mode choice moves to `step = faction`; Join also requires an eight-character `joinCode`.
3. A faction enables the mode-specific action: Play, Create room, or Join room.
4. An invite query sets `mode = join`, fills `joinCode`, and routes directly to `step = faction`.
5. Any truthy `roomCode`, including one restored after reconnect, displays the lobby until the server supplies the match.
