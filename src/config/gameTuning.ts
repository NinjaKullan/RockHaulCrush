/**
 * Central gameplay tuning for Rock Haul Rush.
 *
 * Every gameplay-affecting constant lives here so handling, cargo behavior,
 * and difficulty can be adjusted in one place.
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

export const truckTuning = {
  /** Forward top speed, m/s (truck drives toward +x). */
  maxSpeed: 15,
  /** Reverse top speed, m/s. */
  maxReverseSpeed: 6,
  /** Throttle acceleration, m/s². */
  accel: 15,
  /** Braking deceleration, m/s². */
  brakeDecel: 24,
  /** Reverse acceleration, m/s². */
  reverseAccel: 9,
  /** Horizontal velocity damping per second when grounded with no input. */
  rollingDrag: 1.1,
  /** Lean control strength (torque per unit mass, scaled by dt). */
  leanTorque: 7.5,
  /** Rigid-body angular damping — resists endless spinning without killing bounce. */
  angularDamping: 1.4,
  linearDamping: 0.04,

  wheelRadius: 0.6,
  /** Axle x-offset from chassis center (front = +, rear = −). */
  axleX: 1.22,
  /** Visual wheel z-offset from center (each side). */
  wheelZ: 0.78,
  /** Suspension ray origin height in chassis-local space. */
  suspensionOriginY: -0.2,
  /** Max suspension ray length — beyond this a wheel is airborne. */
  suspensionRest: 0.85,
  /** Spring strength: upward accel (m/s²) per wheel at full compression. */
  suspensionStiffness: 95,
  /** Suspension damping against vertical point-velocity. */
  suspensionDamping: 9,

  spawn: [-6, 1.5] as [number, number],
} as const

export const cargoTuning = {
  rockCount: 20,
  rockMinRadius: 0.16,
  rockMaxRadius: 0.22,
  rockFriction: 1.0,
  rockRestitution: 0.12,
  rockDensity: 1.5,
  rockLinearDamping: 0.2,
  rockAngularDamping: 0.5,
  /** Seed for deterministic rock shapes/placement. */
  seed: 1337,
} as const

export const cameraTuning = {
  distance: 13,
  height: 3.9,
  /** Seconds of velocity to look ahead. */
  lookAhead: 0.55,
  /** Follow smoothing rate (higher = snappier). */
  followRate: 4.0,
  heightRate: 3.0,
  baseFov: 48,
  /** Extra FOV per m/s of speed, capped below. */
  fovPerSpeed: 0.5,
  maxFovBoost: 9,
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
