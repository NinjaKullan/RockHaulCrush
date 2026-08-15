/**
 * Quarry Run level data — Checkpoint 1 graybox layout.
 * Pure data, no rendering or physics imports, so courses can be added or
 * regenerated without touching game systems.
 *
 * Course reading order (truck drives +x):
 *   start pad → rough washboard → climb → plateau → descent →
 *   flat run-up → launch ramp → gap (dip) → landing pad
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
  // Center = midpoint of the top surface, pushed down along the slab normal.
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

export const groundBoxes: GroundBox[] = [
  // Bedrock base slab — closes visual gaps under everything.
  slab(-18, 274, -3.4, -3.4, BEDROCK),

  // --- Act 1: warm-up ---
  slab(-18, 8, 0, 0, SAND), // start pad
  slab(8, 30, 0, 0, ROUGH), // rough washboard base (bumps sit on top)
  slab(30, 44, 0, 2.6, SAND_ALT), // climb
  slab(44, 52, 2.6, 2.6, SAND), // plateau — checkpoint
  slab(52, 66, 2.6, 0.6, SAND_ALT), // descent
  slab(66, 80, 0.6, 0.6, SAND), // flat run-up
  slab(80, 86.5, 0.6, 2.35, RAMP), // launch ramp
  slab(85, 92.5, -1.4, -1.4, PIT), // gap floor (short landing dip)
  slab(92.5, 95.6, -1.4, 0, PIT), // drive-out slope from the dip
  slab(95.2, 122, 0, 0, SAND), // landing pad — checkpoint

  // --- Act 2: the long haul ---
  slab(122, 142, 0, 0, ROUGH), // second washboard
  slab(142, 164, 0, 3.4, SAND_ALT), // long steep climb
  slab(164, 172, 3.4, 3.4, SAND), // high plateau — checkpoint
  slab(172, 185, 3.4, 0.8, SAND_ALT), // steep descent (brake test)
  slab(185, 212, 0.8, 0.8, SAND), // whoops section base
  slab(212, 219, 0.8, 2.7, RAMP), // big launch ramp
  slab(217, 228, -1.6, -1.6, PIT), // wide gap floor
  slab(228, 231.4, -1.6, 0, PIT), // drive-out slope
  slab(231, 274, 0, 0, SAND), // final flat — checkpoint + delivery
]

/** Washboard bumps and whoops. */
export const bumps: GroundBox[] = [
  // Act 1 washboard
  ...[11, 13.5, 16, 18.5, 21, 23.5, 26, 28.5].map(
    (x, i): GroundBox => ({
      c: [x, 0.0],
      half: [0.7, i % 2 === 0 ? 0.16 : 0.24],
      rot: i % 2 === 0 ? 0.1 : -0.12,
      color: '#b57b3e',
      zHalf: Z_HALF,
    }),
  ),
  // Act 2 washboard — meaner
  ...[124.5, 127, 129.5, 132, 134.5, 137, 139.5].map(
    (x, i): GroundBox => ({
      c: [x, 0.04],
      half: [0.7, i % 2 === 0 ? 0.2 : 0.28],
      rot: i % 2 === 0 ? -0.12 : 0.14,
      color: '#b57b3e',
      zHalf: Z_HALF,
    }),
  ),
  // Whoops: three bumps built from slab pairs so they're climbable both ways
  ...[189, 196, 203].flatMap((x) => [
    slab(x, x + 2.6, 0.8, 1.45, '#c9863f'),
    slab(x + 2.6, x + 5.2, 1.45, 0.8, '#c9863f'),
  ]),
]

/** Invisible boundary walls at the course ends. */
export const boundaryWalls: GroundBox[] = [
  { c: [-19, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
  { c: [275, 4], half: [0.5, 5], rot: 0, color: '', zHalf: Z_HALF, invisible: true },
]

/** Invisible z-plane walls that keep loose rocks near the gameplay plane. */
export const zWalls = {
  x: 128,
  halfLength: 148,
  height: 12,
  z: 1.9,
  halfThickness: 0.3,
} as const

export const levelBounds = { minX: -18, maxX: 274 } as const

/**
 * Checkpoints: recovery points along the course. The truck respawns at the
 * latest one passed. Order matters — index 0 is the start.
 */
export const checkpoints: { x: number; y: number }[] = [
  { x: -6, y: 1.5 }, // start
  { x: 47, y: 4.2 }, // plateau
  { x: 105, y: 1.6 }, // after first jump
  { x: 167, y: 5.0 }, // high plateau
  { x: 236, y: 1.6 }, // after big jump
]

/** Delivery zone: crossing `finishX` snapshots the in-bed cargo and scores. */
export const deliveryZone = {
  padStartX: 250,
  finishX: 256,
  padEndX: 264,
} as const
