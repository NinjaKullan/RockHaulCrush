import { beforeEach, describe, expect, it } from 'vitest'
import { gameplayTuning, magnetTuning } from '../config/gameTuning'
import { useGameStore } from './store'

/** Reset to a fresh playing state for each test. */
function startPlaying() {
  useGameStore.getState().startRun()
  useGameStore.getState().beginPlaying()
}

beforeEach(() => {
  useGameStore.setState({ phase: 'title', bestStars: 0, bestDelivered: 0, bestScore: 0, careerRocks: 0 })
  useGameStore.getState().startRun()
})

describe('run lifecycle', () => {
  it('startRun resets run state and bumps runId', () => {
    const before = useGameStore.getState().runId
    useGameStore.getState().startRun()
    const s = useGameStore.getState()
    expect(s.runId).toBe(before + 1)
    expect(s.phase).toBe('countdown')
    expect(s.timeLeft).toBe(gameplayTuning.timeLimit)
    expect(s.magnetCharges).toBe(magnetTuning.charges)
    expect(s.checkpointIndex).toBe(0)
    expect(s.result).toBeNull()
    expect(s.cargo.inBed).toBe(20)
  })

  it('beginPlaying only transitions from countdown', () => {
    useGameStore.getState().beginPlaying()
    expect(useGameStore.getState().phase).toBe('playing')
    useGameStore.getState().beginPlaying()
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('pause/resume round-trips', () => {
    startPlaying()
    useGameStore.getState().pause()
    expect(useGameStore.getState().phase).toBe('paused')
    useGameStore.getState().resume()
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('timer expiry fails the run', () => {
    startPlaying()
    useGameStore.getState().tickTimer(gameplayTuning.timeLimit + 1)
    const s = useGameStore.getState()
    expect(s.phase).toBe('failed')
    expect(s.result).toMatchObject({ delivered: 0, stars: 0, timeLeft: 0 })
    expect(s.result?.score.total).toBe(0)
  })

  it('timer does not tick outside playing', () => {
    const t = useGameStore.getState().timeLeft
    useGameStore.getState().tickTimer(5)
    expect(useGameStore.getState().timeLeft).toBe(t)
  })
})

describe('recovery', () => {
  it('applies a time penalty and queues a request', () => {
    startPlaying()
    const t = useGameStore.getState().timeLeft
    useGameStore.getState().requestRecovery()
    const s = useGameStore.getState()
    expect(s.recoverRequests).toBe(1)
    expect(s.timeLeft).toBeCloseTo(t - gameplayTuning.recoveryPenaltySeconds)
  })

  it('checkpoint index never regresses', () => {
    startPlaying()
    useGameStore.getState().reachCheckpoint(2)
    useGameStore.getState().reachCheckpoint(1)
    expect(useGameStore.getState().checkpointIndex).toBe(2)
  })
})

describe('magnet', () => {
  it('consumes one charge per activation and blocks double-activation', () => {
    startPlaying()
    useGameStore.getState().activateMagnet()
    let s = useGameStore.getState()
    expect(s.magnetActive).toBe(true)
    expect(s.magnetCharges).toBe(magnetTuning.charges - 1)
    useGameStore.getState().activateMagnet() // still active — no extra charge
    s = useGameStore.getState()
    expect(s.magnetCharges).toBe(magnetTuning.charges - 1)
  })

  it('cannot activate with zero charges', () => {
    startPlaying()
    useGameStore.setState({ magnetCharges: 0 })
    useGameStore.getState().activateMagnet()
    expect(useGameStore.getState().magnetActive).toBe(false)
  })
})

describe('finish and scoring', () => {
  it('scores stars and stores the result', () => {
    startPlaying()
    useGameStore.getState().finish(17)
    const s = useGameStore.getState()
    expect(s.phase).toBe('finished')
    expect(s.result?.delivered).toBe(17)
    expect(s.result?.stars).toBe(2)
  })

  it('a failed delivery (<12) completes with zero stars', () => {
    startPlaying()
    useGameStore.getState().finish(7)
    const s = useGameStore.getState()
    expect(s.phase).toBe('finished')
    expect(s.result?.stars).toBe(0)
  })

  it('persists bests only for scoring runs', () => {
    startPlaying()
    useGameStore.getState().finish(11)
    expect(useGameStore.getState().bestDelivered).toBe(0)
    useGameStore.getState().startRun()
    useGameStore.getState().beginPlaying()
    useGameStore.getState().finish(16)
    const s = useGameStore.getState()
    expect(s.bestStars).toBe(2)
    expect(s.bestDelivered).toBe(16)
  })

  it('finish is ignored outside playing (no double delivery)', () => {
    startPlaying()
    useGameStore.getState().finish(20)
    useGameStore.getState().finish(20)
    const s = useGameStore.getState()
    expect(s.result?.delivered).toBe(20)
    expect(s.bestStars).toBe(3)
  })

  it('replay after a result starts a clean run', () => {
    startPlaying()
    useGameStore.getState().finish(20)
    useGameStore.getState().startRun()
    const s = useGameStore.getState()
    expect(s.phase).toBe('countdown')
    expect(s.result).toBeNull()
    expect(s.cargo.inBed).toBe(20)
    expect(s.magnetCharges).toBe(magnetTuning.charges)
  })
})

describe('career', () => {
  it('a delivery that crosses a rank threshold reports the promotion', () => {
    useGameStore.setState({ careerRocks: 290 })
    startPlaying()
    useGameStore.getState().finish(20)
    const r = useGameStore.getState().result!
    expect(r.promotedTo).toBe('Pit Veteran')
    expect(useGameStore.getState().careerRocks).toBe(310)
  })

  it('locked paints cannot be selected', () => {
    useGameStore.setState({ careerRocks: 0, paintId: 'quarry' })
    useGameStore.getState().selectPaint('onyx')
    expect(useGameStore.getState().paintId).toBe('quarry')
    useGameStore.getState().selectPaint('cat')
    expect(useGameStore.getState().paintId).toBe('quarry')
    useGameStore.setState({ careerRocks: 40 })
    useGameStore.getState().selectPaint('cat')
    expect(useGameStore.getState().paintId).toBe('cat')
  })
})

describe('haul score', () => {
  it('accumulates driving points and folds them into the final breakdown', () => {
    startPlaying()
    useGameStore.getState().addScore(75)
    useGameStore.getState().addScore(150.4)
    expect(useGameStore.getState().score).toBe(225)
    useGameStore.getState().finish(20)
    const r = useGameStore.getState().result!
    expect(r.score.driving).toBe(225)
    expect(r.score.rocks).toBe(2000)
    expect(r.score.perfect).toBeGreaterThan(0)
    expect(r.score.total).toBe(225 + 2000 + r.score.timeBonus + r.score.perfect + r.score.objective)
    expect(r.newBest).toBe(true)
    expect(useGameStore.getState().bestScore).toBe(r.score.total)
  })

  it('streak drives the multiplier and resets to ×1 each run', () => {
    startPlaying()
    useGameStore.getState().setStreak(2)
    expect(useGameStore.getState().multiplier).toBe(1.5)
    useGameStore.getState().startRun()
    expect(useGameStore.getState().multiplier).toBe(1)
    expect(useGameStore.getState().score).toBe(0)
  })
})
