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
  rollingDrag: 0.65,
  /** Lateral steering acceleration, m/s². */
  lateralAccel: 24,
  /** Lateral velocity damping per second (snappy dodge feel). */
  lateralDamping: 3.4,
  /** Max sideways speed, m/s. */
  maxLateralSpeed: 7,
  /** Truck center is softly kept within ±this z (hard walls sit further out). */
  roadHalfWidth: 2.9,
  /** Airborne auto-level: pitch-correcting torque strength and damping. */
  airStabilizeStrength: 9,
  airStabilizeDamping: 2.2,
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
  rockMinRadius: 0.15,
  rockMaxRadius: 0.19,
  rockFriction: 1.0,
  rockRestitution: 0.12,
  rockDensity: 1.5,
  rockLinearDamping: 0.2,
  rockAngularDamping: 0.5,
  /** Seed for deterministic rock shapes/placement. */
  seed: 1337,
} as const

export const cameraTuning = {
  /** Chase camera: distance behind the truck. */
  back: 11,
  /** Height above the truck. */
  height: 4.4,
  /** How far ahead of the truck the camera aims. */
  lookAhead: 7,
  lookUp: 1.2,
  /** Fraction of truck z the camera position/aim follow (parallax feel). */
  zFollow: 0.55,
  zLook: 0.85,
  /** Follow smoothing rate (higher = snappier). */
  followRate: 4.5,
  heightRate: 3.0,
  baseFov: 53,
  /** Extra FOV per m/s of speed, capped below. */
  fovPerSpeed: 0.45,
  maxFovBoost: 8,
} as const

export const gameplayTuning = {
  /** Countdown timer for a run, seconds. */
  timeLimit: 105,
  /** Time penalty applied on checkpoint recovery, seconds. */
  recoveryPenaltySeconds: 5,
  /** Rocks below this world-y are lost (out of the playable course). */
  lostBelowY: -8,
  /** Countdown length before control begins, seconds. */
  countdownSeconds: 3,
} as const

export const magnetTuning = {
  /** Charges per run. */
  charges: 3,
  /** Active duration per charge, seconds. */
  duration: 2.5,
  /** Pull radius around the bed target, meters. */
  radius: 8,
  /** Pull acceleration applied to recoverable rocks, m/s². */
  pullAccel: 38,
  /** Upward bias so pulled rocks arc into the bed instead of dragging. */
  upwardBias: 0.4,
  /** Rocks moving faster than this are not pulled harder (prevents slingshots). */
  maxPullSpeed: 13,
} as const

export const mudTuning = {
  /** Multiplier on throttle force while in mud. */
  accelFactor: 0.35,
  /** Extra per-second velocity drag while in mud. */
  extraDrag: 1.8,
} as const

export const barrelTuning = {
  count: 2,
  /** Seconds between a single barrel's respawns (staggered ⇒ one every period/count). */
  period: 7,
  /** Initial downhill speed, m/s (toward -x, into the oncoming truck). */
  launchSpeed: 2.5,
  radius: 0.42,
  density: 0.35,
  /** Reset when a barrel rolls past this x or exceeds its lifetime. */
  minX: 24,
  lifetime: 6,
} as const

export const fallingRockTuning = {
  /** Full cycle per spawn point, seconds. */
  period: 6,
  /** Telegraph duration before the drop, seconds. */
  warnTime: 1.4,
  /** How long a fallen boulder rests before vanishing, seconds. */
  restTime: 2.2,
  dropHeight: 12,
  radius: 0.55,
  density: 2,
} as const

export const craneTuning = {
  /** Swing period, seconds. */
  period: 4.5,
  /** Max swing angle, radians. */
  amplitude: 0.95,
  /** Pendulum pivot height above ground. */
  pivotY: 5.7,
  cableLength: 4.35,
  /** Concrete block half-extent. */
  blockHalf: 0.45,
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
