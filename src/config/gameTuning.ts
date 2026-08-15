/**
 * Central gameplay tuning for Rock Haul Rush.
 *
 * Every gameplay-affecting constant lives here so handling, cargo behavior,
 * and difficulty can be adjusted in one place. Checkpoint 0 only needs the
 * physics-world basics; later checkpoints extend this file (truck handling,
 * cargo rules, magnet, scoring).
 */

export const physicsTuning = {
  /** Gravity in m/s². Slightly stronger than Earth for a snappier arcade feel. */
  gravity: [0, -14, 0] as [number, number, number],
  /** Fixed physics timestep in Hz. */
  timestepHz: 60,
} as const

export const renderTuning = {
  /** Clamp device pixel ratio so high-DPI displays don't tank the frame rate. */
  maxPixelRatio: 2,
} as const

export const scoringTuning = {
  totalRocks: 20,
  /** Delivered-rock thresholds: index 0 = 1 star, 1 = 2 stars, 2 = 3 stars. */
  starThresholds: [12, 16, 20] as const,
} as const

/** Star result for a delivered-rock count (0 = failed delivery). */
export function starsForDelivered(delivered: number): number {
  const { starThresholds } = scoringTuning
  if (delivered >= starThresholds[2]) return 3
  if (delivered >= starThresholds[1]) return 2
  if (delivered >= starThresholds[0]) return 1
  return 0
}
