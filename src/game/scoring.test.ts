import { describe, expect, it } from 'vitest'
import { scoreTuning as S, scoringTuning } from '../config/gameTuning'
import { finalScore, isNearMiss, lateralGap, multiplierForStreak } from './scoring'

describe('multiplierForStreak', () => {
  it('starts at ×1 and steps up', () => {
    expect(multiplierForStreak(0)).toBe(1)
    expect(multiplierForStreak(2)).toBeCloseTo(1 + 2 * S.streakStep)
  })
  it('caps at the max multiplier', () => {
    expect(multiplierForStreak(100)).toBe(S.maxMultiplier)
  })
})

describe('near miss', () => {
  it('adjacent-lane pass at speed counts', () => {
    const gap = lateralGap(0, 2.2, 0.42) // barrel in the next lane
    expect(gap).toBeGreaterThan(0)
    expect(isNearMiss(gap, 12)).toBe(true)
  })
  it('far-lane pass does not count', () => {
    expect(isNearMiss(lateralGap(-2.2, 2.2, 0.42), 12)).toBe(false)
  })
  it('crawling past does not count', () => {
    expect(isNearMiss(lateralGap(0, 2.2, 0.42), 2)).toBe(false)
  })
  it('overlap (a hit) is not a near miss', () => {
    expect(isNearMiss(-0.2, 12)).toBe(false)
  })
})

describe('finalScore', () => {
  it('sums rocks, time, driving and the perfect bonus', () => {
    const b = finalScore(300, scoringTuning.totalRocks, 40.9)
    expect(b.rocks).toBe(scoringTuning.totalRocks * S.rockValue)
    expect(b.timeBonus).toBe(40 * S.timeBonusPerSecond)
    expect(b.perfect).toBe(S.perfectHaul)
    expect(b.total).toBe(b.driving + b.rocks + b.timeBonus + b.perfect)
    expect(finalScore(0, 20, 10, true).objective).toBe(S.objectiveBonus)
    expect(finalScore(0, 3, 10, true).objective).toBe(0)
  })
  it('gives no time bonus or perfect bonus for a rejected delivery', () => {
    const b = finalScore(100, scoringTuning.starThresholds[0] - 1, 60)
    expect(b.timeBonus).toBe(0)
    expect(b.perfect).toBe(0)
    expect(b.total).toBe(100 + b.rocks)
  })
})
