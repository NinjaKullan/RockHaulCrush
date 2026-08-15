import { beforeEach, describe, expect, it } from 'vitest'
import { gameplayTuning, magnetTuning } from '../config/gameTuning'
import { useGameStore } from './store'

/** Reset to a fresh playing state for each test. */
function startPlaying() {
  useGameStore.getState().startRun()
  useGameStore.getState().beginPlaying()
}

beforeEach(() => {
  useGameStore.setState({ phase: 'title', bestStars: 0, bestDelivered: 0 })
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
    expect(s.result).toEqual({ delivered: 0, stars: 0, timeLeft: 0 })
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
