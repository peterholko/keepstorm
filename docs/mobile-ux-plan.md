# Mobile UX plan

Scope: phones and touch tablets only. The desktop layout and interaction model (mouse, keyboard, fixed three-row shell) stay exactly as they are; every change below is gated by a coarse-pointer media query, a short-viewport query, or `pointerType === "touch"`.

Written 2026-08-15 against commit `213df6d`, from a review of `app/page.tsx`, `app/game-canvas.tsx`, `app/globals.css`, and a device-emulation walkthrough at 375×812 (portrait phone), 812×375 (landscape phone), 768×1024 (tablet), and 1440×900 (desktop baseline). Revised the same day after the orientation decision: **phones are landscape-only; portrait phones get a rotate screen** (see §6).

## TL;DR

The desktop match screen is a fixed shell where the battlefield and the war ledger are always both on screen. On a phone that shell degrades into a scrolling page: **portrait is a 1075px-tall page on an 812px viewport** and **landscape is a 720px page on a 375px viewport** (the `min-height: 720px` desktop rule), so the map and the cards are never visible at the same time; the yards are drawn at ~15px (portrait) or ~13px (landscape) cells; and the tutorial card plus event ribbon physically cover a build yard during placement. On top of that there is one real touch bug — **holding a finger still while aiming fires `contextmenu`, which cancels the placement** on Android Chrome — plus the usual web-game touch hygiene gaps (sticky hover, text selection on long-press, tiny 6–8px labels, keyboard hints shown to touch users, pull-to-refresh).

The plan is landscape-only on phones: a **single non-scrolling screen** with the map taking the full height, a slim HUD band over the top of the map, a **right-hand rail** for tabs / cards / Sync / Reprieve, and a **zoomable, two-axis-pannable map** with two levels — *Field* (whole height, as today) and *Yard* (~24px cells, auto-framed on your yard when you pick a card). Touch placement becomes **two-step (position a ghost, tap ✓)** so tiny cells stop costing Marks. Portrait phones see a "rotate your phone" screen (solo pauses underneath). Tablets keep the desktop layout plus the touch fixes. Four phases; the first two carry almost all of the value.

Zoom is not optional in this design: without it landscape cells are 8–13px, which no confirm step can rescue.

## 1. What is actually wrong today

Evidence gathered in Chrome device emulation. Numbers are CSS px.

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | **Match screen scrolls as a page.** `.game-shell { height:auto; min-height:100svh }` at ≤760px makes the document 1075px tall on an 812px viewport (54 header + 430 stage + 591 deck). Selecting a card in the deck leaves the build zones off-screen (upper zone at y=−148, lower zone half under the sticky header). Every placement is: scroll down → tap card → scroll up → drag → (scroll down again to inspect). | `globals.css:343` | Blocker |
| 2 | **Landscape phone is a squeezed desktop.** At 812×375 the `(max-height:760px) and (min-width:761px)` query wins, `min-height:720px` forces a 720px page, deck sits at y=530 (off-screen), and everything renders at desktop sizes on a 375px-tall screen. | `globals.css:117,393` | Blocker |
| 3 | **Long-press cancels placement (Android).** Event log during a touch drag inside a build zone: `pointerdown(touch) → touchstart → contextmenu(touch)`. `.build-zone-input`'s `onContextMenu` calls `onCancelSelection()`. Chrome fires `contextmenu` after ~500ms of a stationary touch, so a careful player who pauses to aim loses the placement silently. | `game-canvas.tsx:704-707` | High |
| 4 | **Overlays cover the lower yard.** On portrait the second build area (rows 16–23) spans stage-relative y≈243–365. In placement mode the tutorial card (244×136) occupies y≈234–370 — the entire lower yard — and the event ribbon (52px) sits at y≈257–309, across its middle rows. The lower yard is unusable until the tutorial is dismissed, and the ribbon always covers part of it. | `globals.css:359-361` | High |
| 5 | **Cells are tiny at native fit**: ~15px on portrait phones (426px stage / 28 rows), ~13px on a 375px-tall landscape phone and ~11px once the browser bar eats 60px of that. A 3×3 Foundry footprint is 33–45px; a 2×2 is 22–30px. Drop-on-release with no undo/sell means a one-cell slip is a permanent Marks loss. | `game-canvas.tsx` touch path | High |
| 6 | **Type is illegible.** Card role/cost 7px, tab captions 6px, camera hint 6px, tutorial step 7px, keep names 6px, ribbon description 8px. Names truncate ("Cinder Bomb…"). | `globals.css` many | High |
| 7 | **Desktop-only copy and affordances shown to touch users**: hotkey badges 1–5, "S · group your deployments", "READY · SPACE", "A / D · WHEEL · SWIPE", "Click a gold square…", "Click on desktop", canvas `aria-label` mixes both. | `page.tsx:91,109,178,227,231,513`, `game-canvas.tsx:617,719` | Medium |
| 8 | **Touch hygiene gaps**: 9 unguarded `:hover` rules (sticky raised cards after tap); `user-select:auto` on all UI (observed the "Next" button's text getting selected on long-press); no `-webkit-touch-callout:none` on card art (iOS "Save image" sheet); `touch-action:auto` on buttons (double-tap zoom on fast repeated taps); `overscroll-behavior:auto` (pull-to-refresh / rubber-band when swiping the map vertically); no `viewport-fit=cover` / `env(safe-area-inset-*)` (notch and home indicator collide with header buttons and the deck). | global | Medium |
| 9 | **Small tap targets**: header ?/pause 28×28, camera chevrons 28×37, tutorial ✕ 21×22, brand 34×34, camera range input 4px tall. Apple/Material floor is 44/48. | `globals.css:351,355,176` | Medium |
| 10 | **Selecting a card scrolls the map to `left:0`** (the Keep), not to the yard. Fine at today's 426px stage (yard at x 137–304) but wrong as soon as the stage gets taller (yard moves right of the 375px viewport). | `game-canvas.tsx:353-357` | Medium (becomes High after Phase 1) |
| 11 | **Tablet portrait clips the Reprieve column**: deck min width 798 (`130px minmax(500px,1fr) 118px` + gaps/padding) on a 768px viewport, `overflow:hidden` eats 16px of `.tactics-stack`. | `globals.css:301` | Low |
| 12 | **Perf risk on phones (unmeasured)**: full 3200×896 world redrawn every animation frame regardless of the ~25% that is visible; `shadowBlur` on every building/keep/effect; per-frame `renderState` allocation; five `backdrop-filter: blur()` panels composited over a live canvas; whole React tree re-renders every 50ms tick. | `game-canvas.tsx:407-494`, `globals.css` | Medium (measure first) |
| 13 | Home Screen and standalone metadata are now implemented. Remaining nice-to-haves: no screen wake lock (screen dims during a 6-minute match while you watch a wave), no visibility pause (backgrounding relies on the 200ms tick clamp), and no haptic tick on placement. | `layout.tsx`, `page.tsx` | Low |

Things that are already fine on mobile and should be left alone: the title/mode/faction flow, the rules/pause/result modals (they scroll internally), the touch-drag placement input path with the 56px lift, `-webkit-tap-highlight-color`, `100svh` usage, the default `width=device-width, initial-scale=1` viewport that vinext emits.

## 2. Design target

**Landscape-only phone layout, one screen, nothing scrolls except the map (both axes) and the card rail (vertically).** Portrait phones get a full-screen rotate prompt; tablets keep the desktop layout with touch fixes.

Design for **640×300 usable** (a small Android in landscape with the browser bar showing) and let 812×340 / 932×430 breathe. Real usable height is 40–60px less than the screen in landscape because the page never scrolls, so browser chrome never collapses. That is why the header is folded into an overlay band, why the deck is a side rail instead of a bottom strip, and why the map must be zoomable: at 300px of height the native fit is 10.7px per cell.

Definitions used below:
- **phone-landscape** = `(hover: none) and (pointer: coarse) and (max-height: 520px)`
- **phone-portrait** = `(hover: none) and (pointer: coarse) and (orientation: portrait) and (max-width: 760px)` — receives the rotate prompt only
- **coarse** = `(hover: none) and (pointer: coarse)` — touch hygiene at every size, including tablets

### Landscape — normal state (Field zoom)

```
┌───────────────────────────────────────────────────────┬──────────┐
│ ◆520 ▰70 ✦1 · +45/7s   ▬▬ 6:00 ▬▬             ? ⏸   │[Trp|Wrk|Shp] 32  segmented tabs
│                                                       │ ┌──────┐ │
│                                                       │ │ art  │ │  vertical snap rail,
│                 battlefield, full height              │ │Ram   │ │  ~96px cards, ≥44px each,
│                 Field zoom = world fits height        │ │110 M │ │  scrolls vertically
│                 swipe to pan · pinch not required     │ └──────┘ │
│                                                       │ ┌──────┐ │
│                                                       │ │ art  │ │
│                                                       │ │Quill │ │
│ ◆ Choose a structure…            [Yard ⤢]  ‹  ›       │ └──────┘ │
│   single-line ribbon / coach     zoom toggle · pan    │[SYNC][✦1:15] 40  Sync + Reprieve pills
└───────────────────────────────────────────────────────┴──────────┘
  ← minmax(0,1fr) ───────────────────────────────────→  ← 108px →
```

The header (`.game-header`) is not a grid row on phones — it becomes a 44px translucent band overlaid on the top of the map (crest hidden, keep bars thin, clock 14px, `?`/`⏸` 44×44). The resource panel is a single line inside/next to that band. Nothing else sits over the map except the one-line ribbon (bottom-left) and the small zoom/pan control (bottom-right).

### Landscape — placement mode (Yard zoom, a card selected)

```
┌───────────────────────────────────────────────────────┬──────────┐
│ ◆520 ▰70 ✦1              ▬▬ 6:00 ▬▬            ? ⏸   │[Trp|Wrk|Shp]
│      ┏━━━━━━━━━━━━━━━━━┓                              │ ┌──────┐ │
│      ┃    upper yard   ┃    ┌─────────┐               │ │ Ram ✓│ │  selected card highlighted;
│      ┃   ┌───┐         ┃    │ ✓ Place │  ✕            │ │110 M │ │  tapping it again cancels
│      ┃   │ g │  24px   ┃    └─────────┘               │ └──────┘ │
│      ┃   └───┘  cells  ┃    chip anchored to ghost    │ ┌──────┐ │
│      ┃                 ┃    (44px, disabled+reason    │ │Quill │ │
│      ┗━━━━━━━━━━━━━━━━━┛     when invalid)            │ └──────┘ │
│ ◆ Drag in the gold yard, then tap ✓ · HAMMER · WARD   │          │
│                                  [Field ⤢]  ‹  ›      │[SYNC][✦  ]│
└───────────────────────────────────────────────────────┴──────────┘
```

Selecting a card switches to Yard zoom and scrolls so the nearest of your build areas (upper for the first placement) is centred with a margin; the other yard is one swipe down. Placing or cancelling does not yank the camera back — the player taps `Field` when they want the overview.

### Landscape — inspector (tapped one of your buildings)

The rail's card list is replaced by a vertical inspector: art 48px, name 12px, rank/HP/income at 10–11px, `Upgrade · cost` and `Hold production` as ≥44px full-width buttons, ✕ 44×44 at the top. Tapping the map closes it (already the behaviour).

### Map zoom (phones only)

Two discrete levels, no pinch in this iteration (native two-axis scrolling stays):
- **Field**: world height = stage height (today's behaviour). Cells ≈ stage/28.
- **Yard**: world height = stage height × Z where Z is chosen so a cell is ~24px (clamp 20–28px) and one full build area plus a one-cell margin fits the stage width beside the rail. `.battlefield-world { height: calc(100% * var(--map-zoom)) }`, `.battlefield-scroll { overflow: auto }` in both axes, `touch-action: pan-x pan-y` on the canvas already permits two-axis native panning; `.build-zone-input { touch-action: none }` keeps drag-inside-the-yard as placement.
- Toggle button (44px) at the bottom-right of the stage; auto-Yard when a card is selected; the current zoom is remembered per match.
- Rendering needs no change: the canvas is CSS-scaled, `renderScale` re-rasterises up to 2× on its own, hit-testing already goes through `getBoundingClientRect()`, and the ✓ chip is positioned in `%` inside `.battlefield-world` so it scrolls and scales with the map. Camera helpers (`panCamera`, `moveCameraTo`, the auto-scroll on select) need a vertical component.

### Portrait phone

A fixed full-screen prompt (`role="dialog"`): crest, "Rotate your phone", "Keepstorm plays in landscape." No "continue anyway". Solo matches pause underneath (treat it like the pause overlay in the tick effect); online matches keep running (state comes from the server). The title, faction and lobby screens are not blocked — they already work in portrait — the prompt appears only while the match screen is showing.

### Tablet (761–1100px, coarse pointer)

Keep the desktop layout. Apply only the touch hygiene, the two-step touch placement, target sizes, and the 768px deck overflow fix.

## 3. Guardrails — how desktop stays untouched

- **CSS**: every phone rule lives in the **phone-landscape** or **phone-portrait** query above; touch hygiene lives in **coarse**. Existing `:hover` rules get wrapped in `@media (hover: hover)` — zero visual change on desktop, kills sticky hover on touch. Nothing outside those blocks changes except a `touch-action: manipulation` / `user-select: none` on the game shell, which has no mouse-visible effect. The existing `@media (max-width: 760px)` match-screen rules are left in place (portrait phones never reach the match layout any more) but the phone-landscape block must come later in the file and win at 640×360, which matches both. The `(max-height: 760px) and (min-width: 761px)` short-desktop query gains `and (pointer: fine)` so it stops matching landscape phones — no change for any mouse user.
- **JS**: one hook, `useDeviceProfile()`, returning `{ coarse, phoneLandscape, phonePortrait }` from `matchMedia` (subscribed to `change`, SSR-safe defaults false). Behaviour branches on those flags or on `event.pointerType === "touch"`, which the code already does for the drag path. Mouse code paths (`onClick` place, hover preview, right-click cancel, keyboard placement) are not edited.
- **Engine**: no changes. New pure logic (yard framing, pending-placement math, cell → screen rect) goes in `lib/keepstorm/placement-input.ts` next to `placementCellFromClientPoint`, with tests in `tests/game-engine.test.ts`, matching how the touch-lift work was done.
- **Acceptance for every phase**: a 1440×900 screenshot of title, match, placement, inspector, pause, and result is pixel-identical before/after (eyeball or `git stash` diff in the emulator).

## 4. Phases

Sizes are rough solo-dev effort: S ≈ 1–3h, M ≈ half a day to a day, L ≈ 1–2 days.

### Phase 0 — Touch hygiene and bug fixes (S, ship first)

Safe, capability-gated, no layout change. Fixes #3, #8, #9, #11.

1. **Stop long-press cancelling placement.** In `.build-zone-input` `onContextMenu`: always `preventDefault()`, only call `onCancelSelection()` when the event came from a mouse (`touchPlacementPointerRef.current === null && lastPointerTypeRef.current !== "touch"`, or `event.nativeEvent.pointerType !== "touch"` where supported). Same guard on the canvas `onContextMenu` for consistency (it currently only prevents default, which is fine).
2. **Global touch CSS** (in a `(hover: none) and (pointer: coarse)` block): `.game-shell, .title-screen, .modal-backdrop { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }` (keep `touch-action: none` on `.build-zone-input` and `pan-x pan-y` on the canvas — they are more specific). `img { pointer-events: none }` inside cards/inspector so long-press never targets an image.
3. **Overscroll**: `html, body { overscroll-behavior: none }` (harmless on desktop, stops pull-to-refresh and rubber-band).
4. **Hover guard**: wrap the nine `:hover` selectors in `@media (hover: hover)`.
5. **Viewport + safe area**: export `viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0d120e" }` from `app/layout.tsx` (Next metadata API — the built vinext bundle reads a `viewport` export and today falls back to its default `width=device-width, initial-scale=1`) and pad `.game-header` / `.command-deck` / `.title-header` with `env(safe-area-inset-*)`. Do not add `maximum-scale=1` / `user-scalable=no`; `touch-action: manipulation` handles double-tap without breaking accessibility zoom.
6. **Targets** on coarse pointers: header buttons 44×44, camera chevrons 44 wide, tutorial/inspector ✕ 44×44 hit area (padding, not visual size), range thumb 28px.
7. **Tablet deck overflow**: at ≤800px use `grid-template-columns: 120px minmax(440px, 1fr) 110px` so 768px does not clip Reprieve.

Acceptance: at 812×375 (and on the tablet), hold a touch inside the yard for 2s then release — building is placed, selection not cancelled; card art long-press shows no callout; tapping a card twice quickly does not zoom; swiping the map vertically does not trigger pull-to-refresh; desktop unchanged.

### Phase 1 — Fixed landscape shell, side rail, zoomable map (L, the big one)

Fixes #1, #2, #4, #5 (with Phase 2), #6, #7, #9, #10. All inside the **phone-landscape** query plus small React changes.

**Shell**
- `.game-shell { position: fixed; inset: 0; height: auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 108px; grid-template-rows: minmax(0, 1fr); overflow: hidden; }`. `.battlefield-stage { grid-column: 1; grid-row: 1; height: auto; min-height: 0 }`, `.command-deck { grid-column: 2; grid-row: 1 }`. Nothing else in the document, so mobile browsers never get a scrollable page. No body-level `overflow: hidden` is needed because the shell is `position: fixed` and exists only during a match; if iOS Safari still rubber-bands the empty body, toggle an `is-match` class on `<html>` from `showingGame` and lock overflow there.
- Add `and (pointer: fine)` to the existing `(max-height: 760px) and (min-width: 761px)` short-desktop query so it stops matching landscape phones. Place the phone-landscape block after the `(max-width: 760px)` block so it wins at 640×360.

**HUD band (`.game-header` as an overlay, 44px)**: `position: absolute; top: 0; left: 0; right: 0; z-index: 8` inside the stage column (or `grid-area` overlap — either is fine as long as it does not take a row). Crest hidden (Leave is in the pause menu), keep bars thin with 10px names, clock 14px, `?`/`⏸` 44×44 at the right. `.resource-panel.is-local` becomes a one-line 12px chip (`◆ 520  ▰ 70  ✦ 1 · +45 in 7s`) at the band's left; the rival panel stays hidden. Translucent background, no `backdrop-filter`.

**Stage overlays** — only two things over the map besides the band:
- `.event-ribbon` bottom-left, single line, 12px, `max-width: 60%`, `max-height: 36px`, `.event-ribbon > small` hidden. `.tutorial-card` is not rendered on phones; its step text is shown in the ribbon slot instead (step counter + one sentence + a 44px ✕), with priority: placement validation message > tutorial coach text > `game.event`.
- No on-screen phone camera buttons for now. Selecting a structure automatically enters Yard view, leaving placement returns to Field view, and native two-axis swipes pan the map. Hide the horizontal scrollbar styling on phones (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`).

**Zoomable map (phones)**: see §2 "Map zoom". `.battlefield-scroll { overflow: auto }` (both axes), `.battlefield-world { height: calc(100% * var(--map-zoom, 1)) }` with `--map-zoom` set from React state (`"field" | "yard"`). New pure helpers in `placement-input.ts`: `yardZoomFactor(stageW, stageH, railW)` (target ~24px cells, clamp 20–28, must fit one build area + 1-cell margin in the stage width) and `yardFrame(areas, currentCenter)` returning the world-unit centre to scroll to (nearest area to the current view centre; upper on the first placement). `panCamera`, `moveCameraTo` and the select-time auto-scroll gain a vertical component; the auto-scroll on select becomes "switch to Yard zoom, then centre the chosen area" on phones only (desktop keeps `left: 0 / max`).

**Rail (108px, `.command-deck`)**: `display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 6px; padding: 6px`.
- Top: `.command-tabs` as a horizontal segmented control, 32px tall, 10–11px labels (`Troops · Works · Shop`), no captions. `.ledger-nav .eyebrow` hidden.
- Middle: `.foundry-list` / `.shop-list` become vertical snap lists (`display: flex; flex-direction: column; overflow-y: auto; scroll-snap-type: y mandatory; gap: 6px; scrollbar-width: none`). Cards `flex: 0 0 auto; min-height: 64px; scroll-snap-align: start; grid-template-rows: 32px auto auto`; art 32px, name 11px allowed two lines (drop `nowrap`), cost 10px, `em`/role line hidden — while a card is selected the ribbon shows `name · DAMAGE · ARMOR` so the counter information is still one tap away. Selected = gold border + `PLACE` tag; tapping the selected card again cancels (existing toggle). Hide `.hotkey` badges on coarse pointers. Shop cards: glyph 22px, name 11px, cost 10px, description hidden.
- Bottom: `.tactics-stack` as one row of two pills, each ≥44px tall: Sync (`SYNC ON`/`SYNC OFF`, plus `wave 0:07` when on — no "S ·" hint) and Reprieve (24px atlas icon + `1:15` / `READY` / `SPENT`, no "· SPACE"; `.is-ready` keeps the pulse). Text for these is chosen in JSX under the `phoneLandscape` / `coarse` gates so desktop strings are untouched.
- `.building-inspector` replaces the middle+bottom rows as a vertical sheet: ✕ 44×44 top-right, art 48px, name 12px, rank/HP/income 10–11px, `Upgrade · cost` and `Hold production` full-width ≥44px buttons. Tapping the map closes it (already the behaviour: `selectAtCell` with no hit → `onSelectBuilding(null)`).
- Type floor on phones: nothing below 10px; buttons 11–14px. Add a phone type-scale block that overrides the 6–8px sizes.

**Copy (JS, `coarse` gate)**: ribbon default while placing → "Drag in the gold yard, then tap ✓ to build. Swipe to move the map."; tutorial 02 → "Touch inside the gold yard, drag the preview into place, then tap ✓."; tutorial 03 → "Tap a placed structure to upgrade or hold its production."; canvas `aria-label` split by pointer type.

Acceptance: at 812×375 and 640×360, `document.documentElement.scrollHeight === innerHeight`; in Yard zoom the framed build area is fully inside the stage, cells ≥ 20px, and no overlay (band, ribbon, zoom control) intersects it; in Field zoom the whole world height is visible; the rail scrolls and snaps; all rail text ≥ 10px; Reprieve/Sync reachable without scrolling; desktop screenshots identical.

### Phase 2 — Two-step touch placement (M)

Fixes #5 and makes #3 structurally impossible. Touch-only (`pointerType === "touch"`); mouse click-to-place is untouched.

State added to `GameCanvas`: `pendingCell: GridPoint | null` (touch only).

1. **Drag → pending, not commit.** In `handleBuildZonePointerUp`, on touch set `pendingCell = cell` — the lifted cell the player was looking at when they let go, so nothing jumps — and keep the ghost drawn there (reuse the existing hover ghost + route preview drawing). Do not call `onPlace`.
2. **Confirm chip**: a small DOM component positioned inside `.battlefield-world` in `%` from the pending footprint (`cellRectPercent(cell, spec)` in `placement-input.ts`), to the right of the ghost and vertically centred on it, so it scrolls and scales with the map for free; clamp so it never leaves the world. Contents: `✓ Place` (≥44px, primary) and `✕` (≥44px, cancels placement — same as `onCancelSelection`). If `validatePlacement` says invalid, `✓` is disabled and the reason is shown in the ribbon (the reason strings already exist and already flow through `onHoverMessage`). `✓` → `onPlace` → clear pending → on phones exit placement mode (`setSelected(null)` in `page.tsx` under the phone gate); on tablets/desktop keep today's sticky selection.
3. **Nudging**: a new touch-down inside a yard moves the pending ghost (drag again); a plain tap in the yard sets the pending cell at the lifted tap position. `pointercancel` / `lostpointercapture` / touch `pointerleave` no longer wipe state — they only end the active drag, the last pending cell survives.
4. **Synthetic click guard**: after a touch sequence the browser fires `click`; `handleBuildZoneClick` and the canvas `onClick` must not commit at the finger position (today a 700ms timestamp guard exists — keep it or track the last pointer type).

Unit tests (pure, in `tests/game-engine.test.ts`): `cellRectPercent` is consistent with `placementCellFromClientPoint`; `yardZoomFactor` yields 20–28px cells at 640×300, 812×340, 932×430 and keeps a build area + margin inside the stage width; `yardFrame` picks the upper area first and the nearest area afterwards; the context-menu guard cancels for mouse only.

Acceptance: on a phone in Yard zoom, place a 3×3 Foundry into a specific cell next to an existing one on the first try, ten times, with no misplacements; holding still for 3s before ✓ never cancels; a slipped release can be corrected before spending Marks.

### Phase 3 — Portrait rotate prompt and tablet pass (S–M)

- **Rotate prompt** (phone-portrait, match screen only): full-screen fixed overlay `role="dialog" aria-modal="true"`, crest, "Rotate your phone", "Keepstorm plays in landscape.", no dismiss. Rendered from `page.tsx` when `phonePortrait && showingGame`; solo pauses (include it in the `paused` condition of the tick effect); online keeps running. The title / faction / lobby screens are not affected. Optional: a "Go full screen" button that calls `document.documentElement.requestFullscreen()` then `screen.orientation.lock("landscape")` inside a try/catch (works on Android Chrome; silently no-ops on iOS).
- **Tablet**: nothing beyond Phase 0 + Phase 2 (two-step placement applies via the touch gate); confirm 768×1024 and 1024×768 look right after the deck column fix.

### Phase 4 — Performance and installability (M, measure first)

Do this after Phases 1–2 on a mid-range Android (e.g. a Pixel 6a / Galaxy A5x) and an older iPhone via `npm run dev -- --host` on the LAN, Chrome remote debugging → Performance panel. Targets: 60fps idle map, ≥ 45fps mid-match with 20+ units, ≤ 16ms per React tick.

Likely wins, cheapest first:
1. `backdrop-filter: none` on phones for the five overlay panels; solid `rgba` backgrounds.
2. Skip `shadowBlur` when `renderScale <= 1` or on coarse pointers (draw a soft ellipse or a pre-blurred sprite instead) — it is the single most expensive Canvas 2D feature on mobile GPUs and it runs per building, keep and effect every frame.
3. Cull draw calls to the visible slice: read `scrollLeft/clientWidth` in `drawFrame`, skip buildings/units/effects outside `[left − 200, right + 200]` world px. `clearRect`/background fill can also be restricted to that slice.
4. Reuse `renderState` arrays across frames instead of spreading every unit/building/effect per frame; only `units` need per-frame interpolation.
5. `React.memo` `StructureCard`, `ShopCard`, `CommandDeck` with a stable props shape (they re-render every 50ms tick because `game` changes); pass only the fields they read.
6. If still short: shrink the canvas backing store to the viewport (draw with a `translate(−scrollLeft/scale)`), which cuts a 3200×896 (×scale²) surface to ~375×580×dpr². This changes hit-testing to use `.battlefield-world`'s rect instead of the canvas rect — a contained refactor, but rendering-internal, so it applies to desktop too and needs the desktop pixel check.

Installability / polish (S each, all optional):
- `public/manifest.webmanifest` (`display: standalone`, `orientation: landscape`, icons from `public/brand`) + `<link rel=manifest>` and `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style` via `layout.tsx` metadata. Standalone mode removes the browser bar (40–60px of the ~340px landscape height) and, on Android, locks the installed app to landscape — the cheapest cell-size win there is, and it makes the rotate prompt moot for installed players.
- Screen Wake Lock (`navigator.wakeLock?.request("screen")`) while `showingGame && !paused`, released on pause/result/hidden.
- `visibilitychange` → set `overlay = "pause"` in solo when hidden (today the 200ms tick clamp effectively pauses, but the player returns to a running match with no explanation).
- `navigator.vibrate?.(10)` on successful place/upgrade (Android only; no-op elsewhere).

## 5. Verification

- **Emulation loop** (fast): Chrome DevTools device toolbar or the in-app browser (mobile emulation on, so `pointer: coarse` matches) at 640×360, 812×375, 844×390, 932×430 (landscape phones), 375×812 (portrait phone → rotate prompt), 768×1024, 1024×768 (tablet), 1440×900 (desktop). Checklist per landscape size: no page scroll during a match; Field zoom shows the whole world height; Yard zoom frames a build area at ≥ 20px cells with no overlay over it; smallest text ≥ 10px; every tappable ≥ 44px; select → drag → ✓ places the intended cell; hold-still does not cancel; inspector opens/closes; pause/result modals fit.
- **Real devices** (before calling any phase done): one Android Chrome and one iOS Safari on the LAN (`npm run dev -- --host` and the machine's IP; the dev server already serves the worker locally). iOS specifically: long-press on card art, rubber-band on vertical swipe, two-axis panning feel at Yard zoom, the rotate prompt when the phone is held upright.
- **Automated**: keep `npm test` green (`placement-input` gains tests for the new pure helpers). Optionally add a `tests/mobile-layout.test.mjs` that renders the built HTML and asserts the viewport/theme-color meta exists — the existing `rendered-html.test.mjs` shows the pattern. A Playwright layout smoke test (812×375: `scrollHeight === innerHeight`, framed build area inside the stage) is worth it once Phase 1 lands but is new tooling; decide then.
- **Desktop regression**: screenshot set at 1440×900 before Phase 0, diff after every phase.

## 6. Decisions (resolved 2026-08-15)

1. **Confirm-to-place on touch: YES.** Touch placement is two-step (position ghost → tap ✓). Acknowledged risk: it may feel slow in a fast match; if so, add a "Quick place" toggle later rather than removing the confirm.
2. **Phones are landscape-only.** Portrait phones get a full-screen "rotate your phone" prompt on the match screen (no continue-anyway); solo pauses underneath. There is no portrait match layout. (An earlier draft of this plan was portrait-first; that design was dropped.)
3. **Map zoom is in scope, pinch is not.** Because landscape-only means 8–13px cells at native fit, the two-level Field/Yard zoom with two-axis native panning is part of Phase 1. Pinch-to-zoom is a later nicety.
4. **Reprieve/Sync: at the bottom of the rail** as two ≥44px pills. Nothing floats over the map except the HUD band, the one-line ribbon and the zoom/pan control.
5. **Gates**: phone-landscape `(hover: none) and (pointer: coarse) and (max-height: 520px)`; phone-portrait adds `(orientation: portrait) and (max-width: 760px)`; the existing `max-width: 760px` block is left alone so desktop CSS is untouched.

Implementation note discovered while checking the build: vinext's viewport renderer supports `width / initialScale / minimumScale / maximumScale / userScalable / themeColor / colorScheme` but drops `viewportFit`, so `viewport-fit=cover` (and therefore non-zero `env(safe-area-inset-*)`) is out of reach until the PWA/standalone phase — safe-area padding rules are still harmless to add now (they resolve to 0).

## Appendix — sketches

Device profile hook (`app/use-device-profile.ts`):

```ts
const QUERIES = {
  coarse: "(hover: none) and (pointer: coarse)",
  phoneLandscape: "(hover: none) and (pointer: coarse) and (max-height: 520px)",
  phonePortrait: "(hover: none) and (pointer: coarse) and (orientation: portrait) and (max-width: 760px)",
} as const;

// SSR-safe: all false on the server and during hydration, real values after mount
export function useDeviceProfile() {
  const [profile, setProfile] = useState(() => ({ coarse: false, phoneLandscape: false, phonePortrait: false }));
  useEffect(() => {
    setProfile(read());
    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
    const update = () => setProfile(read());
    lists.forEach((l) => l.addEventListener("change", update));
    return () => lists.forEach((l) => l.removeEventListener("change", update));
  }, []);
  return profile;
}
```

Context-menu guard (`game-canvas.tsx`, build zone button):

```tsx
onContextMenu={(event) => {
  event.preventDefault();                       // never show a browser menu over the map
  if (touchPlacementPointerRef.current !== null) return;   // long-press during a touch drag
  if (lastPointerTypeRef.current === "touch") return;      // long-press on a still finger
  onCancelSelection();                          // real right-click
}}
```

Landscape shell + rail (phone-landscape block in `globals.css`, placed after the `max-width: 760px` block):

```css
@media (hover: none) and (pointer: coarse) and (max-height: 520px) {
  .game-shell { position: fixed; inset: 0; height: auto; min-height: 0; grid-template-columns: minmax(0, 1fr) 108px; grid-template-rows: minmax(0, 1fr); overflow: hidden; }
  .game-header { position: absolute; z-index: 8; top: 0; left: 0; right: 108px; height: 44px; /* overlay band */ }
  .battlefield-stage { grid-column: 1; grid-row: 1; height: auto; min-height: 0; }
  .battlefield-scroll { overflow: auto; scrollbar-width: none; }
  .battlefield-scroll::-webkit-scrollbar { display: none; }
  .battlefield-world { height: calc(100% * var(--map-zoom, 1)); max-height: none; }
  .command-deck { grid-column: 2; grid-row: 1; display: grid; grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr) auto; gap: 6px; padding: 6px; }
  .foundry-list, .shop-list { display: flex; flex-direction: column; height: auto; gap: 6px; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; }
  .foundry-card, .shop-card { flex: 0 0 auto; min-height: 64px; scroll-snap-align: start; grid-template-columns: 1fr; grid-template-rows: 32px auto auto; padding: 6px 6px 18px; }
  .foundry-art { width: 32px; height: 32px; }
  .foundry-copy b { font-size: 11px; white-space: normal; line-height: 1.15; }
  .foundry-copy small, .foundry-copy em { display: none; }
  .foundry-cost { font-size: 10px; }
  .hotkey { display: none; }
}
```

Zoom levels (React state in `GameCanvas`, phones only):

```ts
type MapZoom = "field" | "yard";
// world height = stage height × factor; factor 1 for "field", yardZoomFactor(...) for "yard"
<div className="battlefield-world" style={{ "--map-zoom": zoomFactor } as CSSProperties}>
// after changing the factor, scroll so the chosen build area's centre (world units × scale) sits at the stage centre
```

Pending-placement flow (touch only, `game-canvas.tsx`):

```
select card ──► placement mode (phones: Yard zoom, framed on your build area)
   │ touch-down in yard → drag (lifted ghost) → release
   ▼
pending cell (ghost stays, chip shows ✓ and ✕; ribbon shows the reason if invalid)
   │ ✓ valid → onPlace → phones exit placement, tablets keep selection
   │ ✕ / tap the selected card / Escape / tab change → onCancelSelection
   │ new touch-down in yard → move pending
```

## Implementation status

- [x] Phase 0 — touch safety, hover gating, viewport metadata, safe-area variables, 44px touch targets, and tablet deck sizing
- [x] Phase 1 — fixed phone-landscape match shell, translucent HUD, 108px command rail, compact ribbon, native map panning, and automatic Field/Yard framing
- [x] Phase 2 — persistent touch ghost, explicit Place/Cancel chip, invalid-state feedback, and phone/tablet sticky-selection behavior
- [x] Phase 3 — portrait-phone rotate prompt with solo pause and live online simulation
- [x] Phone-landscape setup flow fits mode and faction selection inside the viewport without page scrolling
- [x] iOS Safari Home Screen guidance, standalone detection, seven-day dismissal, and install metadata
- [x] Pure placement/input helpers and unit coverage
- [x] README touch and landscape controls
- [ ] Phase 4 — performance profiling, PWA manifest, wake lock, and haptics (intentionally out of scope)
