# Musterhold

**Place wisely. March relentlessly.**

Musterhold is an original browser strategy game about building an army-producing yard in two dimensions. Place Foundries on an X/Y grid, preserve their routes to the gate, read a three-way combat counter, and break the rival Anchorhold before the five-minute ledger closes.

This repository contains the closed Alpha: one complete solo skirmish against an adaptive Nightveil opponent, with finished original battlefield, faction, building, unit, icon, and title artwork.

## Run the Alpha

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and choose **Begin solo skirmish**.

## Controls

- Click or tap a Foundry card, then place it anywhere valid in the left construction yard.
- `1` — Ramworks
- `2` — Quillnest
- `3` — Beaconarium
- `4` — Tallyhouse
- Arrow keys and `Enter` — move and confirm a keyboard placement on the focused battlefield
- `Space` — cast Reprieve after it unlocks
- `Escape` — cancel placement or pause
- `P` — pause or resume
- Right-click the battlefield — cancel placement

## Alpha rules

- Ramguards deal **Hammer** damage and wear **Ward** armor.
- Quillrunners deal **Arrow** damage and wear **Plate** armor.
- Wispwrights deal **Arc** damage and wear **Cloth** armor.
- Hammer breaks Plate, Arrow cuts Cloth, and Arc pierces Ward.
- A Yield arrives every seven seconds. Production Foundries add a small bonus; Tallyhouses add 24 Marks but spawn no cohort.
- Buildings occupy real cells, are targetable, and cannot overlap or block a production exit.
- Cohorts navigate from their own Foundry to the yard gate, then follow the contested road automatically.
- The Nightveil rival observes the player’s dominant Foundry and constructs its counter.
- Reprieve unlocks after 48 seconds and can be used once. It clears invaders from the player half and wounds the rest.
- Destroy the rival Anchorhold. If both survive five minutes, remaining keep health and Foundries settle the result.

## Verification

```bash
npm test
npm run lint
npm run build
```

The simulation is isolated in `lib/musterhold/engine.ts`; React owns controls and match presentation, while Canvas renders the battlefield and generated sprite atlases. See [docs/architecture.md](docs/architecture.md) for the technical shape and [docs/creative-direction.md](docs/creative-direction.md) for the original setting and asset grammar.
