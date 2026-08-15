import { describe, expect, it } from 'vitest'
import { mulberry32, rangeFrom } from './rng'

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(1337)
    const b = mulberry32(1337)
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, a)
    const seqB = Array.from({ length: 10 }, b)
    expect(seqA).not.toEqual(seqB)
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('rangeFrom', () => {
  it('maps into the requested range', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = rangeFrom(rng, 5, 9)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(9)
    }
  })
})
