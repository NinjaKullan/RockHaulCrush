# Checkpoint Status

## Current checkpoint: 3 (revised) — Chase-camera pivot + Quarry Run content (awaiting approval)

Date: 2026-08-15

## Design pivot (user-directed)

Playtesting showed the side-view timing game fought player instinct: everyone
wants to dodge. The game is now a **chase-camera lane-dodging hauler**:

- Camera sits behind and above the truck, looking down the road corridor —
  cargo is fully visible in the bed from behind.
- `A/D` steer left/right across a ~7.8 m-wide road (soft spring at the edges,
  hard invisible walls beyond). Cosmetic roll into turns.
- Lean controls removed; jumps auto-level with a gentle airborne stabilizer.
- Hazards became spatial: barrels pick one of three lanes (seeded), falling
  rocks land on fixed learnable lanes marked by their rings, barriers block
  part of the road leaving a gap, the crane load now swings ACROSS the road.
  Mud and ramps stay full-width speed decisions.
- Physics was already fully 3D — cargo, magnet, checkpoints, scoring, timer
  all carried over unchanged. Recovery re-centers the truck (z=0).

## What exists now

The full hazard set on the Quarry Run course — dodge laterally, or decide
between speed and cargo:

- **Mud** (×2): flat before the first ramp, and guarding the final delivery
  approach. Throttle force ×0.35 + heavy drag inside; dark wet patch visual.
- **Rolling barrels**: released at the top of the first climb on a fixed
  staggered cycle (2 barrels, one every 3.5 s), rolling down into the
  oncoming truck. Crawl the climb safely or send it and risk a wheelie.
- **Construction barriers** (×3): light pushable A-frames — nudge through
  slowly or scatter them at speed and rattle the cargo.
- **Telegraphed falling rocks** (×2 spawns over the second washboard):
  pulsing amber ring marks the landing spot for 1.4 s, then the boulder
  drops, rests, and vanishes on a fixed 6 s cycle.
- **Crane load (moving machine)**: concrete block swinging across the final
  approach as a pendulum (4.5 s period, kinematic — impacts shove backward,
  never crush). Pass on the upswing.
- **Route markers**: chevron signs before both ramps, warning diamonds before
  barrels / rockfall / crane. Checkpoint flags at all 6 recovery points
  (added one after the whoops). Scenery: spoil heaps, distant conveyor,
  foreground parallax rocks.
- **Timer raised to 105 s** for the hazard-laden course.

## Tuning changes from headless playtesting

- Barrels: 3→2, smaller/lighter, real gaps — 3 staggered barrels made the
  climb literally impossible to pass unhit (unfair).
- Cargo repacked: 20 slightly smaller rocks, 15 in a 5×3 floor layer + 5 on
  top — the old 2-layer stack rode above the bed walls and shed on every
  washboard. Camera-side wall raised slightly (still lower than the far
  side for cargo visibility).
- Rolling drag 1.1→0.65: throttle lifts no longer pitch-dump cargo.
- Final gap exit slope softened 25°→18° (bot stranded itself in the pit).
- Sundry visual fixes: mud color, spoil heap placement, conveyor distance.

## Verified this checkpoint (headless Chromium)

- Full-throttle run completes end-to-end through all hazards (delivery at
  ~272 m, "Delivery Rejected" 0-star path shown — mindless speed loses most
  cargo, which is the intended pressure)
- Careful (pulse-throttle) bot kept 13/20 through the barrel climb
- Mud slows the truck to ~10 km/h; debug overlay flags `(mud)`
- All hazard bodies reset cleanly on replay (body count stable at 30)
- 48 unit tests pass (added level-data sanity suite); production build clean;
  no console errors

## Known issues / honest notes

- **Three-star achievability is not machine-verified.** My bots are too dumb
  to drive well; the intended 3-star path is careful driving + using magnet
  charges as jump insurance (spills cluster within the 8 m magnet radius).
  Your playtest is the real test — if 20/20 feels impossible, hazard or
  magnet tuning gets adjusted before approval.
- Spilling many rocks and then driving into your own pile can beach the
  truck (physics being honest). `R` recovery always works; not treating as a
  defect unless it feels bad in play.
- Magnet still pulls through terrain (noted since CP2; CP4 polish).
- Timeout fail path remains unit-tested rather than browser-waited.

## Subjective feedback wanted

1. Barrel climb: fair? Is waiting for a gap readable?
2. Falling rocks: is the amber ring telegraph clear enough at speed?
3. Crane: is the swing rhythm readable on approach?
4. Mud: annoying-fun or just annoying?
5. Can you reach 3 stars with careful play + magnets? How close do you get?
6. Is 105 s right?

## Next checkpoint: 4 — Presentation

Final art direction pass (truck/rocks/terrain/machinery materials and
lighting), HUD/menu polish, dust/mud/impact/magnet effects, procedural
audio with autoplay compliance, tutorial/delivery/star-reveal presentation,
responsive UI, sound + reduced-motion toggles.
