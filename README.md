# Rock Haul Rush

**Keep the wheels down and the rocks in!**

A free, browser-based 2.5D arcade physics game. Drive a quarry dump truck
carrying 20 unstable rocks through a hazardous work site and reach the delivery
zone before time runs out — the more rocks you keep, the more stars you earn.

Built with Vite, TypeScript, React, three.js (React Three Fiber), and the
Rapier physics engine. All dependencies are free and open source; the game
runs fully offline with no CDN or network requests.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm

## Commands

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm install`     | Install dependencies (first time only)              |
| `npm run dev`     | Start the dev server at http://localhost:5173/      |
| `npm test`        | Run the automated game-rule tests (Vitest)          |
| `npm run build`   | Type-check and produce a production build in `dist` |
| `npm run preview` | Serve the production build locally                  |

Optional headless smoke test (requires a running dev server):
`node scripts/smoke.mjs` — loads the game in headless Chromium, verifies the
WebGL canvas, captures screenshots, and fails on console errors.

## Controls

| Key           | Action                          |
| ------------- | ------------------------------- |
| `W` / `↑`     | Accelerate                      |
| `S` / `↓`     | Brake / reverse                 |
| `A` / `←`     | Steer left                      |
| `D` / `→`     | Steer right                     |
| `Space`       | Cargo Magnet                    |
| `R`           | Recover at latest checkpoint    |
| `Esc`         | Pause / resume                  |
| `` ` ``       | Toggle developer debug overlay  |

## Project status

Checkpoint-based build in progress. See `CHECKPOINT_STATUS.md` for current
state, architecture, and known issues.

- ✅ Checkpoint 0 — engine baseline
- ✅ Checkpoint 1 — core-fun graybox
- ✅ Checkpoint 2 — complete vertical slice
- ✅ Checkpoint 3 — Quarry Run course content (chase-camera pivot)
- ✅ Checkpoint 4 — presentation: blast hazard, particles, audio, settings (this build)
- ⬜ Checkpoint 5 — final QA and performance

## Tuning

All gameplay-affecting constants live in `src/config/gameTuning.ts`.
