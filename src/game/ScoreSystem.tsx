import { useBeforePhysicsStep } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { scoreTuning as S } from '../config/gameTuning'
import { sfx } from './audio'
import { hazardList } from './hazardRegistry'
import { gameRefs, pushPopup, runStats } from './refs'
import { isNearMiss, lateralGap } from './scoring'
import { useGameStore } from './store'

/** Minimum spacing between near-miss awards, seconds. */
const NEAR_MISS_COOLDOWN = 0.5
/** A spill this recent disqualifies a near miss (you clipped it). */
const SPILL_GRACE = 0.7

/**
 * Haul Score driver: near misses against registered hazards, clean-section
 * streaks at checkpoints, top-speed tracking. Pure observer — it never moves
 * anything.
 */
export default function ScoreSystem() {
  const clock = useRef(0)
  const lastNearMiss = useRef(-10)
  const lastSpill = useRef(-10)
  const spillsSinceCheckpoint = useRef(0)

  // Spills and checkpoints arrive through the store; subscribe once per mount.
  useEffect(() => {
    return useGameStore.subscribe((s, prev) => {
      if (s.phase !== 'playing') return
      if (s.cargo.inBed < prev.cargo.inBed) {
        spillsSinceCheckpoint.current += prev.cargo.inBed - s.cargo.inBed
        lastSpill.current = clock.current
        if (s.streak > 0) s.setStreak(0)
      }
      if (s.checkpointIndex > prev.checkpointIndex) {
        if (spillsSinceCheckpoint.current === 0) {
          const streak = s.streak + 1
          s.setStreak(streak)
          const mult = useGameStore.getState().multiplier
          const pts = S.sectionClear * mult
          s.addScore(pts)
          runStats.cleanSections++
          pushPopup(
            `SECTION CLEAR +${Math.round(pts)}${mult > 1 ? `  ×${mult.toFixed(2).replace(/\.?0+$/, '')}` : ''}`,
            'section',
          )
          sfx.sectionClear(Math.min(6, streak))
        }
        spillsSinceCheckpoint.current = 0
      }
    })
  }, [])

  useBeforePhysicsStep((world) => {
    clock.current += world.timestep
    const truck = gameRefs.truck
    if (!truck) return
    const store = useGameStore.getState()
    const playing = store.phase === 'playing'
    const t = truck.translation()
    const v = truck.linvel()
    const speed = Math.abs(v.x)
    if (playing && speed > runStats.topSpeed) runStats.topSpeed = speed

    for (const e of hazardList) {
      if (!e.body.isEnabled()) {
        e.prevRel = 1
        continue
      }
      const p = e.body.translation()
      const rel = p.x - t.x
      const crossed = e.prevRel > 0 && rel <= 0
      e.prevRel = rel
      if (!crossed || !playing) continue
      if (Math.abs(p.y - t.y) > 3) continue
      if (clock.current - lastNearMiss.current < NEAR_MISS_COOLDOWN) continue
      if (clock.current - lastSpill.current < SPILL_GRACE) continue
      const gap = lateralGap(t.z, p.z, e.halfWidth)
      if (!isNearMiss(gap, speed)) continue

      lastNearMiss.current = clock.current
      runStats.nearMisses++
      const pts = S.nearMiss * store.multiplier
      store.addScore(pts)
      pushPopup(`CLOSE CALL +${Math.round(pts)}`, 'near')
      sfx.whoosh()
    }
  })

  return null
}
