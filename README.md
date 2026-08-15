# Rock Haul Rush

**Keep the wheels down and the rocks in!**

A free, browser-based 3D arcade hauling game. Drive a quarry rigid dump truck
carrying 20 loose rocks down a hazardous haul road — dodge rolling barrels,
falling rocks, blast rubble, and a swinging crane load — and reach the
delivery zone before time runs out. The more rocks you keep, the more stars
you earn.

Built with Vite, TypeScript, React, three.js (React Three Fiber), and the
Rapier physics engine. **Everything is procedural**: geometry, effects, and
audio are all code-generated. No third-party assets, no CDN, no network
requests after load, no telemetry.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm

## Commands

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm install`     | Install dependencies (first time only)              |
| `npm run dev`     | Start the dev server at http://localhost:5173/      |
| `npm test`        | Run the automated game-rule tests (Vitest, 57)      |
| `npm run build`   | Type-check and produce a production build in `dist` |
| `npm run preview` | Serve the production build locally                  |

Headless verification (dev server must be running):
`node scripts/smoke.mjs` (load + console-error check) and
`node scripts/fullrun.mjs <outdir>` (full game-loop drive test).

## How to play

Pick **Standard Run** (~290 m, 1:45) or **Long Haul** (~430 m, 2:50) on the
title screen. Deliver 12+ rocks to score; 16+ for two stars; all 20 for three.

| Key       | Action                         |
| --------- | ------------------------------ |
| `W` / `↑` | Accelerate                     |
| `S` / `↓` | Brake / reverse                |
| `A` / `←` | Steer left                     |
| `D` / `→` | Steer right                    |
| `Space`   | Cargo Magnet (3 charges — pulls spilled rocks back into the bed) |
| `R`       | Recover at latest checkpoint (−5 s) |
| `Esc`     | Pause / resume                 |
| `` ` ``   | Developer debug overlay        |

Hazards can't be out-muscled — dodge them or time them: barrels pick lanes,
falling rocks mark their landing spots, the blast zone telegraphs with a red
beacon and klaxon before throwing rubble across the road, and the crane load
swings on a fixed rhythm. Mud and ramps are speed decisions: fast risks
cargo, slow burns clock.

## Architecture

- `src/config/gameTuning.ts` — **every gameplay constant** (physics, truck
  handling, suspension, cargo, magnet, hazards, camera, scoring)
- `src/game/levels/quarryRun.ts` — course builder producing the standard and
  long variants: slabs, hazard placements, checkpoints, delivery, profile
- `src/game/Truck.tsx` — single-chassis arcade vehicle: raycast suspension,
  drive/brake/steer forces, airborne auto-level, dust/engine hooks
- `src/game/Rocks.tsx` + `cargoRules.ts` + `cargoMath.ts` — the 20 cargo
  bodies and the pure, unit-tested rock state machine
  (inBed/recoverable/lost/delivered) plus magnet forces
- `src/game/GameDirector.tsx` — timer, checkpoints, delivery snapshot,
  recovery execution
- `src/game/hazards/` — Barrels, Barriers, FallingRocks, BlastZone, Crane
- `src/game/store.ts` — zustand state machine
  (title → countdown → playing ⇄ paused → finished/failed)
- `src/game/audio.ts` — procedural WebAudio (gesture-initialized)
- `src/game/Particles.tsx` — pooled instanced particle system
- `src/ui/` — HUD, screens, contextual hint system, debug overlay

## Status

All six build checkpoints complete. See `CHECKPOINT_STATUS.md` for the final
QA report, known limitations, and suggested next features.

## Licensing

All code and generated content in this repository is original. No third-party
art, audio, or model assets are used or redistributed. Dependencies are
standard open-source npm packages (MIT/Apache-style licenses) resolved at
build time.
