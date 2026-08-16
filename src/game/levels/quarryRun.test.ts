import { describe, expect, it } from 'vitest'
import { courses, type CourseData } from './quarryRun'

function checkCourse(name: string, c: CourseData) {
  describe(`${name} course sanity`, () => {
    it('checkpoints are strictly ascending and inside the course', () => {
      for (let i = 1; i < c.checkpoints.length; i++) {
        expect(c.checkpoints[i].x).toBeGreaterThan(c.checkpoints[i - 1].x)
      }
      for (const cp of c.checkpoints) {
        expect(cp.x).toBeGreaterThan(c.levelBounds.minX)
        expect(cp.x).toBeLessThan(c.levelBounds.maxX)
      }
    })

    it('the delivery finish is after the last checkpoint and inside the course', () => {
      const last = c.checkpoints[c.checkpoints.length - 1]
      expect(c.deliveryZone.finishX).toBeGreaterThan(last.x)
      expect(c.deliveryZone.padEndX).toBeLessThan(c.levelBounds.maxX)
      expect(c.deliveryZone.padStartX).toBeLessThan(c.deliveryZone.finishX)
    })

    it('mud and puddle regions are well-formed, inside bounds, and clear of the pad', () => {
      for (const m of [...c.mudRegions, ...c.puddleRegions]) {
        expect(m.x1).toBeGreaterThan(m.x0)
        expect(m.x0).toBeGreaterThan(c.levelBounds.minX)
        expect(m.x1).toBeLessThanOrEqual(c.deliveryZone.padStartX)
      }
    })

    it('has at least one hydroplane puddle', () => {
      expect(c.puddleRegions.length).toBeGreaterThan(0)
    })

    it('hazards and signs sit inside the course bounds', () => {
      for (const s of [...c.fallingRockSpawns, ...c.signs]) {
        expect(s.x).toBeGreaterThan(c.levelBounds.minX)
        expect(s.x).toBeLessThan(c.levelBounds.maxX)
      }
      for (const b of c.barrierPositions) {
        expect(b.x).toBeGreaterThan(c.levelBounds.minX)
        expect(b.x).toBeLessThan(c.levelBounds.maxX)
      }
    })

    it('z-walls span the whole course', () => {
      expect(c.zWalls.x - c.zWalls.halfLength).toBeLessThanOrEqual(c.levelBounds.minX)
      expect(c.zWalls.x + c.zWalls.halfLength).toBeGreaterThanOrEqual(c.levelBounds.maxX)
    })

    it('the surface profile is ordered and covers the course', () => {
      for (let i = 1; i < c.profile.length; i++) {
        expect(c.profile[i][0]).toBeGreaterThan(c.profile[i - 1][0])
      }
      expect(c.profile[c.profile.length - 1][0]).toBeGreaterThanOrEqual(
        c.deliveryZone.padEndX,
      )
    })

    it('has a positive time limit', () => {
      expect(c.timeLimit).toBeGreaterThan(0)
    })
  })
}

checkCourse('standard', courses.standard)
checkCourse('long', courses.long)

describe('course variants', () => {
  it('long course is meaningfully longer with more time and checkpoints', () => {
    expect(courses.long.levelBounds.maxX).toBeGreaterThan(courses.standard.levelBounds.maxX + 100)
    expect(courses.long.timeLimit).toBeGreaterThan(courses.standard.timeLimit)
    expect(courses.long.checkpoints.length).toBeGreaterThan(courses.standard.checkpoints.length)
  })
})
