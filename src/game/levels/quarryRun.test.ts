import { describe, expect, it } from 'vitest'
import {
  barrierPositions,
  checkpoints,
  deliveryZone,
  fallingRockSpawns,
  levelBounds,
  mudRegions,
  signs,
  zWalls,
} from './quarryRun'

describe('Quarry Run level data sanity', () => {
  it('checkpoints are strictly ascending and inside the course', () => {
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i].x).toBeGreaterThan(checkpoints[i - 1].x)
    }
    for (const cp of checkpoints) {
      expect(cp.x).toBeGreaterThan(levelBounds.minX)
      expect(cp.x).toBeLessThan(levelBounds.maxX)
    }
  })

  it('the delivery finish is after the last checkpoint and inside the course', () => {
    const last = checkpoints[checkpoints.length - 1]
    expect(deliveryZone.finishX).toBeGreaterThan(last.x)
    expect(deliveryZone.padEndX).toBeLessThan(levelBounds.maxX)
    expect(deliveryZone.padStartX).toBeLessThan(deliveryZone.finishX)
  })

  it('mud regions are well-formed and inside the course', () => {
    for (const m of mudRegions) {
      expect(m.x1).toBeGreaterThan(m.x0)
      expect(m.x0).toBeGreaterThan(levelBounds.minX)
      expect(m.x1).toBeLessThan(levelBounds.maxX)
    }
  })

  it('no mud region overlaps the delivery pad', () => {
    for (const m of mudRegions) {
      expect(m.x1).toBeLessThanOrEqual(deliveryZone.padStartX)
    }
  })

  it('hazards and signs sit inside the course bounds', () => {
    for (const s of [...fallingRockSpawns, ...signs]) {
      expect(s.x).toBeGreaterThan(levelBounds.minX)
      expect(s.x).toBeLessThan(levelBounds.maxX)
    }
    for (const b of barrierPositions) {
      expect(b.x).toBeGreaterThan(levelBounds.minX)
      expect(b.x).toBeLessThan(levelBounds.maxX)
    }
  })

  it('z-walls span the whole course', () => {
    expect(zWalls.x - zWalls.halfLength).toBeLessThanOrEqual(levelBounds.minX)
    expect(zWalls.x + zWalls.halfLength).toBeGreaterThanOrEqual(levelBounds.maxX)
  })
})
