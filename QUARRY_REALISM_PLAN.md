# Quarry Realism Pass — working plan

Derived from real quarry reference photos (limestone pit, haul road, plant).
Executed in phases; each phase is committed separately so progress survives
any interruption. Tick items as they land.

## Phase 1 — Grey engineered haul road  [DONE]
Goal: the drivable surface reads as manufactured crushed limestone, distinct
from the warm terrain around it. Side benefit: hi-vis hazards (orange barrels,
red gates, amber rings, yellow truck) gain contrast against a desaturated road.
- [x] Road slab palette → pale grey family (SAND/SAND_ALT/ROUGH/RAMP/PIT)
- [x] Bedrock → dark grey base
- [x] Washboard bumps + whoops → grey variants
- [x] Mud/puddle/pothole colours re-checked against grey
- [x] Delivery pad + curb posts re-checked against grey

## Phase 2 — Benched quarry walls tight to the roadside  [DONE]
Goal: scale. In the references the truck is dwarfed by stepped rock walls.
- [x] New `QuarryWalls` component: stepped terraces flanking the road
- [x] Follows the course ground profile so benches sit on grade
- [x] Gaps carved where hazards need room (blast cliff, crane, train, traffic)
- [x] Grey limestone strata banding, warm only at the very top (topsoil)

## Phase 3 — Processing plant as the delivery destination  [DONE]
Goal: the finish is a *place with purpose* — you feed the crusher.
- [x] Plant structure at the delivery zone: hopper, silos, conveyor, stacks
- [x] Tall enough to be visible far down the course (diegetic progress cue)
- [x] Keeps existing finish-line trigger + pad geometry working

## Phase 4 — Atmosphere pass  [DONE]

Note: sun sits low BEHIND the camera. An early attempt put it ahead of the
player, which turned the plant, walls and oncoming haulers into unreadable
silhouettes. Reference photos are lit ground against a darker sky, not
backlight — keep the sun behind.
Goal: match the moody reference lighting.
- [x] Low golden-hour sun angle, long shadows
- [x] Deeper sky + dust haze fog tuned to grey/warm world
- [x] Living background: distant trucks crawling far benches, conveyor motion

## Deliberately NOT doing (realism that would hurt the game)
- Curving haul roads (would require rewriting the +x movement model)
- Realistic haul speeds / no jumps / no cargo spill (kills the game)
- Full grey-on-grey world (terrain stays warm for palette contrast)
