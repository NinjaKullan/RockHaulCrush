import { describe, expect, it } from 'vitest'
import { scoringTuning, starsForDelivered } from './gameTuning'

describe('starsForDelivered', () => {
  it('fails a delivery below 12 rocks', () => {
    expect(starsForDelivered(0)).toBe(0)
    expect(starsForDelivered(11)).toBe(0)
  })

  it('awards one star for 12–15 rocks', () => {
    expect(starsForDelivered(12)).toBe(1)
    expect(starsForDelivered(15)).toBe(1)
  })

  it('awards two stars for 16–19 rocks', () => {
    expect(starsForDelivered(16)).toBe(2)
    expect(starsForDelivered(19)).toBe(2)
  })

  it('awards three stars only for the full 20', () => {
    expect(starsForDelivered(20)).toBe(3)
  })

  it('keeps thresholds consistent with the total rock count', () => {
    expect(scoringTuning.starThresholds[2]).toBe(scoringTuning.totalRocks)
  })
})
