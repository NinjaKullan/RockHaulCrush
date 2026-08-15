# Checkpoint Status

## Current checkpoint: 2 — Complete vertical slice (awaiting approval)

Date: 2026-08-15

## What exists now

A complete playable game loop on an extended graybox course:

- **State machine**: `title → countdown(3-2-1-GO) → playing ⇄ paused → finished | failed → replay`. Physics and timer freeze while paused; controls are dead outside `playing`.
- **Timer**: 90 s countdown; expiry fails the run. Recovery costs 5 s.
- **Extended course (~290 m)**: Act 1 (washboard → climb → plateau → descent → ramp jump → dip) + Act 2 (meaner washboard → long steep climb → high plateau → steep descent → whoops → big ramp jump → final flat → delivery zone).
- **Checkpoints**: 5 recovery points with flag markers. `R` teleports the truck + in-bed cargo to the latest one, zeroes velocities, and leaves spilled/lost rocks where they are.
- **Cargo states**: every rock is `inBed | recoverable | lost | delivered` (pure rules in `cargoRules.ts`). Lost and delivered are terminal; recovery never resurrects lost rocks; delivery snapshots can never double-count.
- **Cargo Magnet** (`Space`): 3 charges, 2.5 s each, pulls recoverable rocks within 8 m toward the bed with capped, damped forces + upward arc. Teal glow marker over the bed while active; HUD indicator with charges.
- **Delivery**: green-striped pad + goal arch at the course end; crossing the finish line snapshots in-bed cargo, scores stars (12/16/20), stores local bests.
- **Screens**: title (tutorial + best), countdown, pause menu, results (delivered / stars / time left / best / Play Again for finished, timeout, and completed-but-failed <12 cases).
- **HUD**: cargo count with live star potential, timer (pulses <15 s), magnet indicator, speed, hints, pause button.

## Commands

- `npm run dev` — dev server at http://localhost:5173/
- `npm test` — Vitest, 42 tests (scoring, bed volume, RNG, cargo state machine, store lifecycle)
- `npm run build` — production build (passing)
- `node scripts/fullrun.mjs <outdir>` — headless end-to-end (title → drive → magnet → recovery → pause → delivery → replay)

## Verified this checkpoint (headless Chromium)

- Full run delivered 15/20 → ★☆☆; state accounting at snapshot: bed 0 / recoverable 5 / lost 0 / delivered 15
- Magnet activation consumes exactly one charge; indicator updates
- Recovery teleported 185.9 → checkpoint at 167 with 5 s penalty applied
- Pause freezes the timer (verified frozen across 1.5 s)
- Replay resets: 20/20 cargo, checkpoint 0, body count 22, run id increments
- No console errors; build + 42 tests pass

## Known issues / honest notes

- **Timeout fail path** is covered by store unit tests, not a headless browser run (would need a 90 s idle wait). The transition logic is the same `tickTimer` code either way.
- Magnet does not yet respect line-of-sight (can pull through terrain); the brief allows this "when practical" — planned for CP3/4 polish.
- Course pacing: flat-out with mistakes ≈ 40-50 s; careful hauling uses most of the 90 s. Real tuning happens at Checkpoint 3 with hazards in place.
- Whoops bumps were rebuilt as slab pairs after the box version wedged the truck (found and fixed during headless testing).
- Headless FPS (~10) is SwiftShader software rendering; not representative of real hardware.

## Subjective feedback wanted

1. Is the 90 s limit tense but fair?
2. Magnet: does 3 × 2.5 s feel scarce enough to be a decision, strong enough to matter?
3. Recovery penalty (5 s): too cheap? too harsh?
4. Act 2 difficulty: whoops + steep descent + big jump — fun or frustrating?

## Next checkpoint: 3 — Quarry Run content

Cohesive final layout, mud patches, rolling barrels, construction barriers,
telegraphed falling rocks, one moving-machine hazard, route markers, scenery,
boundaries, tuned checkpoint placement.
