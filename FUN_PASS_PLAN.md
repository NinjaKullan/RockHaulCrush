# Fun Pass — first-principles review and plan

Goal: the player should fall in love with Rock Haul Rush in the first run and
want a second one immediately. Everything added stays inside a working rock
quarry: haul roads, hazards, the weighbridge, the foreman on the radio.

## Where the game stands (first-principles read)

What already works: a readable chase view, dodge steering, fair approach-armed
hazards, a real quarry look, a good speed dial, touch support.

What is missing for "love":

1. **No score — only stars.** Stars come from rocks alone, so speed, nerve,
   and clean driving are invisible. Skilled play is not rewarded, so there is
   no reason to replay a 3-star run. The loop needs a number that goes up.
2. **No micro-rewards.** Passing a hazard cleanly, threading a gap at speed,
   or clearing a section without a spill happens silently. Arcade games live
   on the popup that says *you did that*.
3. **The finish is flat.** Crossing a line and reading a count is not a
   payoff. A quarry has a payoff moment: the **weighbridge**. The load gets
   weighed, the tonnage ticks up, the foreman signs it off.
4. **No personality.** Nobody talks to the driver. A foreman on the radio
   turns a physics demo into a place with people in it.
5. **Nothing to share.** The player will find this on LinkedIn. A one-tap
   share of their result (score, stars, rank) is the viral loop.
6. **Long-term hook is thin.** Career totals exist but mean nothing. Ranks
   (Rookie → Quarry Legend) and truck paint unlocks give the totals a reason.
7. **Juice.** No camera shake on blasts or hard landings, no whoosh on a near
   miss, no celebration on a perfect haul.

## Phases (each committed and verified separately)

- **A. Haul Score.** Score from rocks, time bonus, near misses, clean-section
  streak multiplier, perfect-haul bonus. Near-miss detection via a hazard body
  registry. Floating popups in the HUD. Results breakdown that tallies up.
  Persisted best score.
- **B. Weighbridge finale.** Steel scale deck at the delivery pad with a
  readout board. On finish, the results screen weighs the load (tonnage
  ticker) before the stars land.
- **C. Foreman radio + horn.** Contextual radio lines (distinct from
  tutorial hints) with a squelch. Horn on H / touch button; oncoming haulers
  honk back.
- **D. Ranks, run stats, share.** Career ranks with progress bar. Run stats
  on results (close calls, top speed, recoveries). Share button using the Web
  Share API with clipboard fallback. Foreman's bonus objective per run.
- **E. Juice.** Camera shake (blast, landing, rubble hit), near-miss whoosh,
  perfect-haul particle burst, last-10-seconds tick.
- **F. Truck paint.** Paint swatches on the title screen, unlocked by rank.

Constraints unchanged: free/open-source only, no CDN, no assets with unclear
licences, all tuning in `src/config/gameTuning.ts`, tests stay green, verified
headless with Playwright on desktop and iPhone emulation.
