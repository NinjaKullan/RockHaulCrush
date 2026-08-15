# Checkpoint Status

## Current checkpoint: 1 — Core-fun graybox (awaiting approval)

Date: 2026-08-15

## What exists now

A drivable vertical slice of the core interaction: haul 20 loose rocks over
rough ground, a hill, and a jump without losing them.

- **Truck**: single dynamic chassis rigid body, two raycast-suspension axles
  (spring + damper applied at axle points), drive/brake/reverse forces along
  the chassis forward axis, lean torque, low-slung ballast collider for
  stability. Visual wheels follow suspension length and spin with speed.
  Constrained to the x/y gameplay plane.
- **Cargo**: 20 individually simulated rocks (convex hulls, CCD, seeded
  shapes/placement) resting in a colliding bed (floor + 4 walls; camera-side
  wall is lower so cargo stays visible). In-bed detection transforms each rock
  into truck-local space and tests the bed volume (`cargoMath.ts`).
- **Course (graybox Quarry Run)**: start pad → washboard rough section →
  climb → plateau → descent → flat run-up → launch ramp → dip → landing flat.
  Invisible end walls and z-plane walls keep everything recoverable.
- **Camera**: side-following with velocity look-ahead, speed-based FOV
  widening, snap-to-spawn on restart. Sun light tracks the truck for crisp
  shadows everywhere.
- **HUD**: cargo count (turns red below 12), speed, control hints, restart
  button. **Debug overlay** on backquote (`): fps, speed, grounded, position,
  cargo, body count, run id.
- **Restart (R)**: remounts the whole physics world via a run-id key — no
  duplicated bodies, verified across repeated rapid restarts.

## Commands

- `npm run dev` — dev server at http://localhost:5173/
- `npm test` — Vitest (17 tests: scoring thresholds, bed-volume rules, seeded RNG)
- `npm run build` — production build (passing)
- `node scripts/smoke.mjs` / `node scripts/drive.mjs <outdir>` — headless
  browser verification (server must be running)

## Architecture

- `src/config/gameTuning.ts` — all tuning: physics, truck handling,
  suspension, cargo, camera, scoring
- `src/game/refs.ts` — per-frame mutable channels (input, telemetry, body
  handles) that bypass React re-render
- `src/game/store.ts` — slow-changing UI state (zustand): run id, cargo
  count, debug visibility
- `src/game/Truck.tsx` — chassis body, colliders, suspension/drive/lean
  physics (in `useBeforePhysicsStep`), visuals
- `src/game/Rocks.tsx` — rock generation (seeded), bodies, in-bed counting
- `src/game/cargoMath.ts` — pure bed-volume rules (unit-tested)
- `src/game/Terrain.tsx` + `src/game/levels/quarryRun.ts` — level data
  separated from rendering/physics
- `src/game/CameraRig.tsx` — follow camera + tracking sun light
- `src/game/KeyboardManager.tsx` — input mapping, browser-default suppression
- `src/ui/HUD.tsx`, `src/ui/DebugOverlay.tsx`

## Verified this checkpoint (headless Chromium)

- 20/20 rocks at spawn; cargo survives rough section and hill at full
  throttle; ramp jump sheds 3–4 rocks (visible, physical, no instability)
- Reverse caps at −6 m/s, forward at 15 m/s, braking stops from full speed
  in <1 s
- 4 rapid restarts: cargo returns to 20/20, body count constant (22), no
  console errors
- Production build and all 17 tests pass

## Known issues / honest notes (none blocking for CP1)

- **Course is short**: full-throttle run takes ~15–25 s. The 60–90 s target
  applies to the finished Quarry Run; the course gets extended and populated
  in Checkpoints 2–3.
- **No delivery zone yet** — the course ends at an invisible wall (CP2).
- The rough section barely threatens cargo at full speed; bumps may need to
  be meaner. Subjective tuning feedback wanted.
- Airborne lean was not visually verified headless (slow software-renderer
  timing); the code path is shared with verified controls.
- Headless FPS is ~25–30 under SwiftShader software rendering; that is not
  representative of a real GPU. No real-hardware frame-rate claim is made.

## Subjective feedback wanted from playtest

1. Does the truck feel heavy-but-responsive, or too twitchy / too sluggish?
2. Is acceleration too strong? (0→54 km/h is quick; `accel` in gameTuning)
3. Do the rocks feel alive in the bed — do you *see* them shift on bumps?
4. Is the ramp jump fun? Does lean control in the air feel useful?
5. Camera: comfortable at speed? Enough look-ahead?

## Next checkpoint: 2 — Complete vertical slice

60–90 s course, checkpoints + recovery, timer, delivery zone, cargo states
(recoverable/lost), Cargo Magnet, scoring + stars, title/countdown/pause/
results/replay states, tests for cargo transitions and scoring.
