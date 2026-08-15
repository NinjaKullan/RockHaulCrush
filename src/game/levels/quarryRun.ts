import { gameplayTuning } from '../../config/gameTuning'

/**
 * Quarry Run level data, built as selectable courses:
 *  - standard: Acts 1–2 (~290 m), the original run
 *  - long:     Acts 1–3 (~430 m) for the Long Haul option
 * Pure data + a tiny builder — no rendering or physics imports.
 *
 * Course reading order (truck drives +x):
 *   Act 1: start pad → washboard → barrel climb → plateau → descent →
 *          barriers → ramp jump → dip → landing
 *   Act 2: meaner washboard + rockfall → blasting climb → high plateau →
 *          steep descent → whoops → big ramp → gap → crane + mud → delivery*
 *   Act 3 (long only): washboard → third climb + rockfall → plateau →
 *          descent → mud flat → whoops → ramp → gap → delivery
 */

export interface GroundBox {
  /** Center [x, y]. */
  c: [number, number]
  /** Half extents [x, y] (before rotation). */
  half: [number, number]
  /** Rotation around z, radians. */
  rot: number
  color: string
  /** Half depth in z (visual breadth). */
  zHalf: number
  /** Collider-only (no mesh). */
  invisible?: boolean
}

const THICK = 1 // half thickness of ground slabs
const Z_HALF = 6

/** Slab whose top surface runs (x0,top0) → (x1,top1). */
function slab(x0: number, x1: number, top0: number, top1: number, color: string): GroundBox {
  const dx = x1 - x0
  const dy = top1 - top0
  const rot = Math.atan2(dy, dx)
  const len = Math.hypot(dx, dy)
  const nx = -Math.sin(rot)
  const ny = Math.cos(rot)
  return {
    c: [(x0 + x1) / 2 - nx * THICK, (top0 + top1) / 2 - ny * THICK],
    half: [len / 2, THICK],
    rot,
    color,
    zHalf: Z_HALF,
  }
}

const SAND = '#dfa055'
const SAND_ALT = '#d3924a'
const ROUGH = '#c9863f'
const RAMP = '#e0763a'
const PIT = '#b57b3e'
const BEDROCK = '#8a5a2e'

function washboard(xs: number[], baseY: number): GroundBox[] {
  return xs.map(
    (x, i): GroundBox => ({
      c: [x, baseY],
      half: [0.7, i % 2 === 0 ? 0.18 : 0.26],
      rot: i % 2 === 0 ? 0.1 : -0.12,
      color: '#b57b3e',
      zHalf: Z_HALF,
    }),
  )
}

function whoops(starts: number[], baseY: number, peak: number): GroundBox[] {
  return starts.flatMap((x) => [
    slab(x, x + 2.6, baseY, peak, '#c9863f'),
    slab(x + 2.6, x + 5.2, peak, baseY, '#c9863f'),
  ])
}

export interface CourseData {
  name: string
  timeLimit: number
  groundBoxes: GroundBox[]
  bumps: GroundBox[]
  boundaryWalls: GroundBox[]
  zWalls: { x: number; halfLength: number; height: number; z: number; halfThickness: number }
  levelBounds: { minX: number; maxX: number }
  profile: [number, number][]
  checkpoints: { x: number; y: number }[]
  deliveryZone: { padStartX: number; finishX: number; padEndX: number }
  mudRegions: { x0: number; x1: number; groundY: number }[]
  fallingRockSpawns: { x: number; z: number; groundY: number; phase: number }[]
  barrierPositions: { x: number; y: number; z: number }[]
  signs: { x: number; groundY: number; kind: 'chevron' | 'warn' }[]
}

function buildCourse(long: boolean): CourseData {
  const endX = long ? 414 : 274

  const groundBoxes: GroundBox[] = [
    slab(-18, endX, -3.4, -3.4, BEDROCK),

    // --- Act 1
    slab(-18, 8, 0, 0, SAND),
    slab(8, 30, 0, 0, ROUGH),
    slab(30, 44, 0, 2.6, SAND_ALT),
    slab(44, 52, 2.6, 2.6, SAND),
    slab(52, 66, 2.6, 0.6, SAND_ALT),
    slab(66, 80, 0.6, 0.6, SAND),
    slab(80, 86.5, 0.6, 2.35, RAMP),
    slab(85, 92.5, -1.4, -1.4, PIT),
    slab(92.5, 95.6, -1.4, 0, PIT),
    slab(95.2, 122, 0, 0, SAND),

    // --- Act 2
    slab(122, 142, 0, 0, ROUGH),
    slab(142, 164, 0, 3.4, SAND_ALT),
    slab(164, 172, 3.4, 3.4, SAND),
    slab(172, 185, 3.4, 0.8, SAND_ALT),
    slab(185, 212, 0.8, 0.8, SAND),
    slab(212, 219, 0.8, 2.7, RAMP),
    slab(217, 228.6, -1.6, -1.6, PIT),
    slab(228, 233.4, -1.6, 0.1, PIT),
    slab(232.8, long ? 250 : 274, 0, 0, SAND),
  ]

  const bumps: GroundBox[] = [
    ...washboard([11, 13.5, 16, 18.5, 21, 23.5, 26, 28.5], 0),
    ...washboard([124.5, 127, 129.5, 132, 134.5, 137, 139.5], 0.04),
    ...whoops([189, 196, 203], 0.8, 1.45),
  ]

  const profile: [number, number][] = [
    [-18, 0],
    [30, 0],
    [44, 2.6],
    [52, 2.6],
    [66, 0.6],
    [80, 0.6],
    [86.5, 2.35],
    [86.51, -1.4],
    [92.5, -1.4],
    [95.6, 0],
    [142, 0],
    [164, 3.4],
    [172, 3.4],
    [185, 0.8],
    [212, 0.8],
    [219, 2.7],
    [219.01, -1.6],
    [228.6, -1.6],
    [233.4, 0.1],
  ]

  const checkpoints: { x: number; y: number }[] = [
    { x: -6, y: 1.5 },
    { x: 47, y: 4.2 },
    { x: 105, y: 1.6 },
    { x: 167, y: 5.0 },
    { x: 209.5, y: 2.4 },
    { x: 234, y: 1.6 },
  ]

  const mudRegions = [{ x0: 70, x1: 76, groundY: 0.6 }]

  const fallingRockSpawns = [
    { x: 127, z: -1.6, groundY: 0.4, phase: 0 },
    { x: 135, z: 1.6, groundY: 0.4, phase: 3 },
  ]

  const barrierPositions = [
    { x: 77.5, y: 1.1, z: -1.9 },
    { x: 77.5, y: 1.1, z: -0.1 },
    { x: 130.5, y: 0.7, z: 1.9 },
    { x: 130.5, y: 0.7, z: 0.1 },
    { x: 138.5, y: 0.7, z: -1.9 },
    { x: 138.5, y: 0.7, z: -0.1 },
  ]

  const signs: CourseData['signs'] = [
    { x: 28.5, groundY: 0, kind: 'warn' },
    { x: 78.5, groundY: 0.6, kind: 'chevron' },
    { x: 121, groundY: 0, kind: 'warn' },
    { x: 146, groundY: 0.6, kind: 'warn' },
    { x: 210.5, groundY: 0.8, kind: 'chevron' },
    { x: 237.5, groundY: 0, kind: 'warn' },
  ]

  if (!long) {
    // Act 2 finale: mud grind guarding the delivery pad.
    mudRegions.push({ x0: 246, x1: 254, groundY: 0 })
    profile.push([274, 0])
    return {
      name: 'Standard Run',
      timeLimit: gameplayTuning.timeLimit,
      groundBoxes,
      bumps,
      boundaryWalls: [
        { c: [-19, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
        { c: [275, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
      ],
      zWalls: { x: 128, halfLength: 148, height: 12, z: 3.9, halfThickness: 0.3 },
      levelBounds: { minX: -18, maxX: 274 },
      profile,
      checkpoints,
      deliveryZone: { padStartX: 258, finishX: 262, padEndX: 270 },
      mudRegions,
      fallingRockSpawns,
      barrierPositions,
      signs,
    }
  }

  // --- Act 3 (Long Haul)
  groundBoxes.push(
    slab(250, 270, 0, 0, ROUGH),
    slab(270, 292, 0, 3.2, SAND_ALT),
    slab(292, 300, 3.2, 3.2, SAND),
    slab(300, 314, 3.2, 0.6, SAND_ALT),
    slab(314, 330, 0.6, 0.6, SAND),
    slab(330, 352, 0.6, 0.6, SAND),
    slab(352, 359, 0.6, 2.5, RAMP),
    slab(357, 368.6, -1.6, -1.6, PIT),
    slab(368, 373.4, -1.6, 0.1, PIT),
    slab(372.8, 414, 0, 0, SAND),
  )
  bumps.push(
    ...washboard([252.5, 255, 257.5, 260, 262.5, 265, 267.5], 0.02),
    ...whoops([331, 338, 345], 0.6, 1.3),
  )
  profile.push(
    [250, 0],
    [270, 0],
    [292, 3.2],
    [300, 3.2],
    [314, 0.6],
    [352, 0.6],
    [359, 2.5],
    [359.01, -1.6],
    [368.6, -1.6],
    [373.4, 0.1],
    [414, 0],
  )
  checkpoints.push({ x: 253, y: 1.6 }, { x: 295, y: 4.7 }, { x: 376, y: 1.6 })
  mudRegions.push({ x0: 318, x1: 326, groundY: 0.6 }, { x0: 384, x1: 392, groundY: 0 })
  fallingRockSpawns.push(
    { x: 276, z: -1.6, groundY: 1.0, phase: 1.5 },
    { x: 284, z: 1.6, groundY: 2.1, phase: 4.5 },
  )
  barrierPositions.push({ x: 336.5, y: 1.3, z: 1.9 }, { x: 336.5, y: 1.3, z: 0.1 })
  signs.push(
    { x: 272, groundY: 0.2, kind: 'warn' },
    { x: 315.5, groundY: 0.6, kind: 'warn' },
    { x: 353.5, groundY: 0.6, kind: 'chevron' },
  )

  return {
    name: 'Long Haul',
    timeLimit: 170,
    groundBoxes,
    bumps,
    boundaryWalls: [
      { c: [-19, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
      { c: [415, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
    ],
    zWalls: { x: 198, halfLength: 218, height: 12, z: 3.9, halfThickness: 0.3 },
    levelBounds: { minX: -18, maxX: 414 },
    profile,
    checkpoints,
    deliveryZone: { padStartX: 396, finishX: 400, padEndX: 408 },
    mudRegions,
    fallingRockSpawns,
    barrierPositions,
    signs,
  }
}

export const courses = {
  standard: buildCourse(false),
  long: buildCourse(true),
} as const

export type TrackKind = keyof typeof courses

/** The active course. Select BEFORE starting a run (the physics world remounts per run). */
export let course: CourseData = courses.standard

export function selectCourse(kind: TrackKind): void {
  course = courses[kind]
}

/** Approximate ground top at x on the active course (ignores bumps/whoops). */
export function groundTopAt(x: number): number {
  const p = course.profile
  if (x <= p[0][0]) return p[0][1]
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [x0, y0] = p[i - 1]
      const [x1, y1] = p[i]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return p[p.length - 1][1]
}

/** Drivable road half-width (visual slabs extend a little further). */
export const roadHalfWidth = 3.9

/** Rolling-barrel hazard on the first climb: barrels pick a lane, dodge them. */
export const barrelHazard = {
  spawn: { x: 43.2, y: 3.8 },
  lanes: [-2.2, 0, 2.2],
} as const

/** Crane load swinging ACROSS the road (z-axis) on the final Act 2 approach. */
export const craneHazard = {
  x: 242,
  groundY: 0,
} as const

/**
 * Cliff-blasting zone on the Act 2 climb: charges detonate on a telegraphed
 * cycle and throw rubble across the road from the cliff face on the left.
 * Rubble persists until the next detonation.
 */
export const blastZone = {
  x: 153,
  faceZ: -5.2,
  groundY: 1.7,
  period: 9,
  warnTime: 2.2,
  rubbleCount: 12,
} as const
