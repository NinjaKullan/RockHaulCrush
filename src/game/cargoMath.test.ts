import { describe, expect, it } from 'vitest'
import { BED_BOUNDS, isPointInBed } from './cargoMath'

describe('isPointInBed', () => {
  it('accepts a rock resting on the bed floor center', () => {
    expect(isPointInBed(-0.72, 0.7, 0)).toBe(true)
  })

  it('accepts rocks in a second layer', () => {
    expect(isPointInBed(-0.72, 1.3, 0.3)).toBe(true)
  })

  it('rejects a rock in front of the bed (at the cab)', () => {
    expect(isPointInBed(1.4, 0.9, 0)).toBe(false)
  })

  it('rejects a rock behind the tailgate', () => {
    expect(isPointInBed(-2.4, 0.9, 0)).toBe(false)
  })

  it('rejects a rock below the bed floor (under the truck)', () => {
    expect(isPointInBed(-0.72, -0.4, 0)).toBe(false)
  })

  it('rejects a rock beside the truck', () => {
    expect(isPointInBed(-0.72, 0.7, 1.4)).toBe(false)
    expect(isPointInBed(-0.72, 0.7, -1.4)).toBe(false)
  })

  it('rejects a rock hovering far above the bed', () => {
    expect(isPointInBed(-0.72, 3.5, 0)).toBe(false)
  })

  it('bounds are self-consistent', () => {
    expect(BED_BOUNDS.xMin).toBeLessThan(BED_BOUNDS.xMax)
    expect(BED_BOUNDS.yMin).toBeLessThan(BED_BOUNDS.yMax)
    expect(BED_BOUNDS.zHalf).toBeGreaterThan(0)
  })
})
