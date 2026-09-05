import { scoreTuning as S, scoringTuning } from '../config/gameTuning'

/**
 * Pure scoring maths for the Haul Score: streak multiplier, near-miss
 * clearance test, and the end-of-run breakdown.
 */

export interface ScoreBreakdown {
  /** Points earned while driving: near misses and clean sections. */
  driving: number
  rocks: number
  timeBonus: number
  perfect: number
  total: number
}

/** ×1.00, ×1.25, ×1.50 … capped. */
export function multiplierForStreak(streak: number): number {
  return Math.min(S.maxMultiplier, 1 + Math.max(0, streak) * S.streakStep)
}

/** Lateral clearance between truck and hazard edges (negative = overlapping). */
export function lateralGap(truckZ: number, hazardZ: number, hazardHalfWidth: number): number {
  return Math.abs(truckZ - hazardZ) - hazardHalfWidth - S.truckHalfWidth
}

/** A near miss is a pass with a sliver of daylight, at real speed. */
export function isNearMiss(gap: number, speed: number): boolean {
  return gap >= 0 && gap <= S.nearMissMaxGap && speed >= S.nearMissMinSpeed
}

export function finalScore(driving: number, delivered: number, timeLeft: number): ScoreBreakdown {
  const scored = delivered >= scoringTuning.starThresholds[0]
  const rocks = delivered * S.rockValue
  const timeBonus = scored ? Math.floor(Math.max(0, timeLeft)) * S.timeBonusPerSecond : 0
  const perfect = delivered >= scoringTuning.totalRocks ? S.perfectHaul : 0
  return { driving, rocks, timeBonus, perfect, total: driving + rocks + timeBonus + perfect }
}

export function formatScore(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
