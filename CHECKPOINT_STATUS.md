# Checkpoint Status

## Post-handoff content update (from playtest feedback)

- **Waterlogged puddles with hydroplaning**: mud/water patches are now organic
  overlapping blob shapes (no more rectangular carpet). Puddles have a
  reflective water surface over a muddy rim; hitting one fast triggers a
  splash burst + splash sound, and while on water the truck hydroplanes —
  weak throttle, 25% braking, 30% steering authority, and lateral drift
  carries. Standard has one before the delivery pad; Long Haul has two.
  Mud (slow grind) remains a distinct surface.
- **Ore-train crossing** at x≈112 (both tracks): rails + sleepers cross the
  road, crossbuck signals with alternating red lights, a bell during the
  2.6 s warning, a horn as the locomotive and four loaded ore cars sweep
  across. Stop short or clear the rails.
- **Blast is approach-armed**: the first detonation now waits for the truck
  (~30 m out) so every driver sees it, then the cycle continues normally.
- **Career tally** on the title screen (lifetime rocks hauled + runs,
  persisted) — the "number goes up" retention hook.
- Crane cable no longer smears across the camera when driving under it.

## Current checkpoint: 5 — Final QA (awaiting final approval)

Date: 2026-08-15

## Checkpoint 5 changes (from your CP4 feedback)

1. **Engine sound rebuilt** — the sawtooth "bee/clogged muffler" is gone.
   The engine is now a low diesel rumble: a soft triangle pair in a very
   narrow pitch band (~31–47 Hz, so no whining up/down) plus looped
   brown-noise "exhaust breath" whose volume, not pitch, carries the speed
   feel.
2. **Long Haul track option** — the title screen now offers Standard Run
   (~290 m, 1:45) and Long Haul (~430 m, 2:50). The level module became a
   course builder; Long Haul adds a third act (washboard, third climb with
   two more falling-rock lanes, high plateau, descent, mud flat, second
   whoops set, barrier pair, a third ramp-and-gap, second mud grind) with
   8 checkpoints and its own delivery zone.
3. **Blasting made more authentic** — 12 rubble chunks per detonation
   (varied sizes) instead of 7, launched with wider scatter and a much
   bigger dust plume, and **debris no longer fades away**: it stays on the
   road as a real obstacle field until the next detonation recycles it
   (chunks far behind you are retired silently).

## Final QA performed (headless Chromium, software rendering)

- **Standard track**: full loop title→countdown→drive→magnet→recovery→
  pause(timer frozen)→delivery→results→replay; body count stable across
  runs; no console errors.
- **Long Haul**: track selection honored (timer 2:48), all ~430 m drivable,
  Act 3 hazards active, delivery + results + rejection path working.
- **Timeout path browser-verified** (previously unit-only): 105 s idle run
  ends in "Time's Up!", and replay from the failure screen restores a clean
  20/20 run.
- **Resize**: 1280×720 → 1920×1080 mid-session; canvas tracks the viewport;
  HUD legible at both.
- **Repeated restarts**: no body duplication or state leakage (fixed body
  count per course; cargo/checkpoint/magnet reset verified every run).
- **Tests**: 57 passing (scoring, bed geometry, RNG, cargo state machine,
  store lifecycle, both course datasets). Production build clean.
- **No network requests after load; no third-party assets** (README
  documents licensing).

## Performance notes (honest)

- Headless SwiftShader runs at ~10–30 FPS — that is software rendering and
  **not representative of real hardware**. On a normal laptop GPU this scene
  (low-poly, one shadow map, ≤46 physics bodies, pooled particles) should
  hold 60 FPS, but I cannot measure your machine from here: check the FPS
  readout in the debug overlay (`` ` ``) during your run and tell me if it
  dips below ~45.
- Physics: rocks/rubble sleep when settled; hazard bodies are pooled and
  disabled between cycles; the whole world is rebuilt per run (leak-proof
  restart by construction).

## Known limitations

- Audio mix is tuned by construction; only your ears can sign it off.
- Magnet can pull rocks through thin terrain lips (rare; accepted).
- Blast rubble variance makes blind full-throttle runs noticeably harsher —
  intended, but flag it if it feels unfair after the telegraph.
- No gamepad/touch input (input layer is isolated in KeyboardManager and
  extensible).
- Single scenery seed — background layout is identical between runs.

## Suggested next features (priority order)

1. Gamepad + touch/mobile controls
2. A third course or a procedural "endless haul" mode
3. Per-track best times + a simple medal board (localStorage)
4. Ghost replay of your best run
5. Weather/time-of-day variants (dusk hauling, rain reducing grip)
6. More machine hazards (wheel loader crossing, conveyor spill)

## Awaiting final approval

Per the protocol this is the last checkpoint: play both tracks, listen to
the new engine, watch a blast cycle up close, and give the final word.
