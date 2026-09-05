import { describe, expect, it } from 'vitest'
import { PAINTS, RANKS, paintUnlocked, rankFor } from './career'
import { OBJECTIVES, objectiveForRun } from './objectives'

describe('ranks', () => {
  it('starts as Rookie with progress toward the next rank', () => {
    const r = rankFor(0)
    expect(r.name).toBe('Rookie')
    expect(r.next?.name).toBe(RANKS[1].name)
    expect(r.progress).toBe(0)
    expect(r.remaining).toBe(RANKS[1].rocks)
  })
  it('promotes exactly at the threshold', () => {
    expect(rankFor(RANKS[2].rocks - 1).index).toBe(1)
    expect(rankFor(RANKS[2].rocks).index).toBe(2)
  })
  it('tops out with full progress', () => {
    const r = rankFor(999999)
    expect(r.next).toBeNull()
    expect(r.progress).toBe(1)
  })
})

describe('paints', () => {
  it('default paint is always unlocked; the last needs the top rank', () => {
    expect(paintUnlocked(PAINTS[0], 0)).toBe(true)
    const top = PAINTS[PAINTS.length - 1]
    expect(paintUnlocked(top, 0)).toBe(false)
    expect(paintUnlocked(top, RANKS[RANKS.length - 1].rocks)).toBe(true)
  })
})

describe('objectives', () => {
  it('rotate per run and wrap', () => {
    expect(objectiveForRun(1)).toBe(OBJECTIVES[1])
    expect(objectiveForRun(OBJECTIVES.length + 1)).toBe(OBJECTIVES[1])
  })
  it('the no-recovery objective needs a scoring delivery', () => {
    const o = OBJECTIVES.find((x) => x.id === 'noRecovery')!
    const base = { delivered: 0, stars: 0, timeLeft: 0, recoveries: 0, nearMisses: 0, bestStreak: 0, magnetChargesLeft: 3 }
    expect(o.test(base)).toBe(false)
    expect(o.test({ ...base, delivered: 20, stars: 3 })).toBe(true)
    expect(o.test({ ...base, delivered: 20, stars: 3, recoveries: 1 })).toBe(false)
  })
})
