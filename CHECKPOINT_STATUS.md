# Checkpoint Status

## Current checkpoint: 4 — Presentation (awaiting approval)

Date: 2026-08-15

## What exists now

The chase-camera hauler with full feedback: particles, procedural audio,
the user-requested cliff-blasting hazard, contextual hints, settings, and
polished result presentation.

### New this checkpoint

- **Cliff-blasting zone** (user request) on the long climb: chunky cliff face
  with charge wires on the left of the road, roadside red beacon. Cycle: 2.2 s
  flashing-beacon + klaxon telegraph → detonation (boom + smoke burst) →
  7 rubble chunks physically thrown across the road → debris rests 3 s and
  vanishes. Dodge right or hang back.
- **Particle system**: pooled instanced low-poly shards (320 max, zero
  frame-loop allocation). Wheel dust when rolling fast, brown mud splatter,
  landing-impact bursts scaled by fall speed, teal sparkles when the magnet
  recaptures a rock, blast smoke.
- **Procedural audio** (WebAudio, no assets, no network): engine tone tracking
  speed/throttle, landing impacts, brake skids, cargo-spill cue, magnet
  arpeggio + per-rock catch chime, blast klaxon/boom, countdown beeps,
  delivery fanfare with staggered star chimes, failure sting. The context is
  created/resumed only from user gestures (Start click / keydown) per
  autoplay rules; mute state persists.
- **Settings**: sound toggle and reduced-motion toggle on title and pause
  screens, persisted; reduced motion disables the speed-FOV boost and cuts
  particle counts ~65%. Defaults respect `prefers-reduced-motion`.
- **HUD/UI polish**: cargo chip flashes red on rock loss, star reveal pops in
  with staggered animation and chimes, blast-zone hint added.

## Commands

- `npm run dev` — dev server at http://localhost:5173/
- `npm test` — Vitest, 48 tests
- `npm run build` — production build (passing)
- `node scripts/fullrun.mjs <outdir>` — headless end-to-end

## Verified this checkpoint (headless Chromium)

- Blast cycle fires on schedule: beacon flash → rubble thrown across the road
  → debris rests and despawns; hint toast appears on approach
- Full run completes: 17/20 delivered ★★ by the straight-line bot; recovery,
  pause-freeze, replay reset all intact (body count stable at 40 across runs)
- No console errors; 48 tests + production build pass
- Audio graph code runs headless without errors; actual sound output and
  mix balance are **not** verifiable headlessly — needs your ears

## Known issues / honest notes

- Sound levels are a first pass tuned by construction, not listening. Tell me
  what's too loud/quiet.
- Blast rubble can rest in your path — intended (it's a quarry), and it
  despawns after ~3 s; magnet-recoverable rocks are unaffected.
- Timeout fail path remains unit-tested only (90 s browser wait skipped).
- Magnet can still pull rocks through thin terrain lips (rare in the new
  layout; accepted).
- Headless FPS (~11) is software rendering; not representative.

## Subjective feedback wanted

1. Audio mix: engine volume vs. impacts vs. UI chimes?
2. Does the blast zone read instantly? Is the 2.2 s warning enough at speed?
3. Dust/particles: too much, too little?
4. Star reveal + fanfare: satisfying?

## Next checkpoint: 5 — Final QA and performance

Full start-to-finish browser test, physics edge cases, repeated
restart/replay leak checks, performance review, resource cleanup,
accessibility/keyboard focus, final documentation and handoff.
