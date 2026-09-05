import { scoringTuning } from '../config/gameTuning'

/**
 * Foreman's bonus: one optional side objective per run, rotating so
 * consecutive runs ask for something different. Judged at delivery.
 */

export interface ObjectiveFacts {
  delivered: number
  stars: number
  timeLeft: number
  recoveries: number
  nearMisses: number
  bestStreak: number
  magnetChargesLeft: number
}

export interface Objective {
  id: string
  text: string
  test: (f: ObjectiveFacts) => boolean
}

export const OBJECTIVES: readonly Objective[] = [
  {
    id: 'noRecovery',
    text: 'Deliver without calling the recovery crew',
    test: (f) => f.stars > 0 && f.recoveries === 0,
  },
  {
    id: 'closeCalls',
    text: 'Log 3 close calls and still deliver',
    test: (f) => f.stars > 0 && f.nearMisses >= 3,
  },
  {
    id: 'spare45',
    text: 'Deliver with 45 seconds to spare',
    test: (f) => f.stars > 0 && f.timeLeft >= 45,
  },
  {
    id: 'streak3',
    text: 'Clear 3 sections in a row without a spill',
    test: (f) => f.stars > 0 && f.bestStreak >= 3,
  },
  {
    id: 'noMagnet',
    text: `Deliver ${scoringTuning.starThresholds[1]}+ rocks without the magnet`,
    test: (f) => f.delivered >= scoringTuning.starThresholds[1] && f.magnetChargesLeft === 3,
  },
]

export function objectiveForRun(runId: number): Objective {
  return OBJECTIVES[((runId % OBJECTIVES.length) + OBJECTIVES.length) % OBJECTIVES.length]
}
