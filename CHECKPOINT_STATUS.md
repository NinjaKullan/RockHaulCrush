# Checkpoint Status

## Current checkpoint: 0 — Baseline (awaiting approval)

Date: 2026-08-15

## What exists now

A minimal proof scene demonstrating that the full technical baseline
initializes correctly in the browser:

- Vite 8 + TypeScript 6 + React 19 scaffold
- three.js 0.185 rendered through React Three Fiber 9.7
- Rapier physics via `@react-three/rapier` 2.2 (WASM inlined — no CDN)
- Five dynamic "proof rocks" drop onto a lit, shadowed ground slab with a
  wedge obstacle; they bounce, roll, and settle
- Visual baseline pass (user-requested): procedural sky, warm sun +
  hemisphere light, distance fog, low-poly background hills, chunky clouds,
  and a striped safety barrier establishing the quarry palette — all
  code-generated, no assets
- DOM overlay banner proving HTML/CSS HUD layering over the canvas
- Vitest with 5 passing tests (star-threshold scoring rules)
- Playwright smoke script (`scripts/smoke.mjs`): headless load, WebGL canvas
  check, screenshots, console-error detection

## Commands

- `npm install` — first-time setup
- `npm run dev` — dev server at http://localhost:5173/
- `npm test` — Vitest (5 tests passing)
- `npm run build` — production build (passing)
- `node scripts/smoke.mjs` — headless smoke test (dev server must be running)

## Architecture so far

- `src/App.tsx` — canvas, lighting, and the Checkpoint 0 proof scene
  (throwaway; replaced by real game systems in Checkpoint 1)
- `src/config/gameTuning.ts` — central tuning file (gravity, timestep,
  pixel-ratio clamp, rock count, star thresholds) + `starsForDelivered()`
- `scripts/smoke.mjs` — headless browser verification

## Decisions recorded

- **2.5D side-view** per the brief; physics constrained to one plane starting
  Checkpoint 1.
- **Gravity −14 m/s²** (slightly stronger than Earth) for a snappier arcade
  feel; tunable.
- **Single-chassis arcade vehicle** planned for Checkpoint 1 — one dynamic
  rigid body with forces/torque and visual wheels, not four simulated wheels.
- **Reference images are not in the repo** (`references/` is absent). Art
  direction proceeds from the written description in the build brief. If the
  four screenshots are pushed later, they will be consulted from Checkpoint 3+.
- Rapier WASM is inlined by `@react-three/rapier`, keeping the game fully
  offline at the cost of bundle size.

## Known issues (none blocking)

- Bundle is ~3.3 MB minified (~1.1 MB gzip) — dominated by three.js + Rapier
  WASM. Acceptable for a local/offline game; code-splitting can come later if
  a hosted build ever needs it.
- Physics scene is a throwaway proof; no gameplay yet by design.

## Next checkpoint: 1 — Core-fun graybox

Side-following camera, graybox terrain (rough section, hill, ramp), drivable
truck (accelerate/brake/reverse/lean), 20 rocks in a visible bed, cargo count,
reliable restart, developer debug overlay.
