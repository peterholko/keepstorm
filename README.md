# Keepstorm

**Place wisely. March relentlessly.**

Keepstorm is an original browser strategy game about building an army-producing yard in two dimensions. Place Foundries on an X/Y grid, preserve their routes to the gate, follow cohorts across a double-width scrolling battlefield, and break the rival Keep before the 30-minute ledger closes.

This repository contains the closed Alpha: a complete solo skirmish against an adaptive Nightveil opponent plus authoritative human 1v1 and 2v2 rooms, with finished original battlefield, faction, building, unit, icon, and title artwork.

## Run the Alpha

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and choose **Begin solo skirmish**.

## Controls

- Mouse: click a Foundry card, then click a valid square in your gold construction yard.
- Touch: tap a Foundry card, tap or drag inside the gold yard, release to leave the ghost in place, then tap **✓ Place**. Tap **✕** to cancel.
- With no structure selected, click or tap empty ground inside your base to move your ranged Keep Warden. Swiping still pans without issuing a move command.
- Phones play matches in landscape. Selecting a structure automatically opens the close Yard view; placing or cancelling returns to the full battlefield. Swipe the map to pan.
- iPhone and iPad Safari offer a dismissible Home Screen reminder; launching that icon opens Keepstorm in standalone landscape mode.
- Mouse wheel, horizontal trackpad, swipe, camera bar, or `A` / `D` — scroll the battlefield left and right
- `Home` / `End` — jump to the Daybreak or Nightveil end of the map
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
- Each commander opens with 400 Marks, 125 Timber, and one Sigil—enough for every faction's three least-expensive troop structures. Five base Marks plus cost-derived building income arrive every 10 seconds.
- Income uses progressive 25-Mark tax brackets up to 80%. Normal unit works add 2% of invested Marks, Siege 1.8%, support 1.2%, enemy-targeting support 0.9%, and towers 0.8%.
- Normal unit construction returns 100% of its Mark cost as Timber, Siege returns 75%, and legendary ranks return 25%, capped at 300 per purchase.
- A faction treasury costs 350 Marks and 500 Timber, multiplies income by 25%, and has diminishing returns for later copies.
- The battlefield spans 3200 × 896 world units and 100 × 28 cells, with a horizontally scrolling camera.
- Buildings occupy real cells, are targetable, and cannot overlap or block a production exit.
- Cohorts navigate from their own Foundry to the yard gate, then follow the contested road automatically.
- Every commander has an untargetable ranged Keep Warden confined to their assigned base yard. It automatically fires on nearby invaders without distracting enemy cohorts from their march toward the Keep.
- The solo rival reads the player’s armor mix, air and anti-air coverage, production count, and field pressure. It builds a combined-arms counter, maintains its production before saving, places works near the gate, and uses support, upgrades, towers, items, synchronization, and Reprieve when their tactical conditions are met.
- Reprieve unlocks after 75 seconds and can be used once. It clears invaders from the player half and wounds the rest.
- Destroy the rival Keep. If both survive 30 minutes, the documented ledger tie-breakers settle the result.

## Verification

```bash
npm test
npm run lint
npm run build
```

## Cloudflare deployment

The full game, static assets, API, WebSockets, and per-room Durable Objects deploy together to `keepstorm.com`:

```bash
npm run deploy:cloudflare
```

The simulation is isolated in `lib/keepstorm/engine.ts`; React owns controls and match presentation, while Canvas renders the battlefield and generated sprite atlases. See [docs/architecture.md](docs/architecture.md) for the technical shape and [docs/creative-direction.md](docs/creative-direction.md) for the original setting and asset grammar.
