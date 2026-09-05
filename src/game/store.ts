import { create } from 'zustand'
import {
  cargoTuning,
  gameplayTuning,
  magnetTuning,
  starsForDelivered,
} from '../config/gameTuning'
import type { CargoCounts } from './cargoRules'
import { magnet, resetRunStats, runStats } from './refs'
import { finalScore, multiplierForStreak, type ScoreBreakdown } from './scoring'
import { objectiveForRun } from './objectives'
import { PAINTS, paintById, paintUnlocked, rankFor } from './career'
import { isSoundEnabled, setSoundEnabled } from './audio'
import { course, selectCourse, type TrackKind } from './levels/quarryRun'
import { particleSettings } from './Particles'
import { quality } from './device'

const REDUCED_MOTION_KEY = 'rhr-reduced-motion'

function loadReducedMotion(): boolean {
  try {
    const stored = globalThis.localStorage?.getItem(REDUCED_MOTION_KEY)
    if (stored !== null && stored !== undefined) return stored === '1'
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/**
 * Game state machine:
 *   title → countdown → playing ⇄ paused
 *   playing → finished (delivery) | failed (timeout)
 *   finished/failed → countdown (replay)
 * Fast per-frame values live in refs.ts — this store re-renders the UI only.
 */
export type GamePhase = 'title' | 'countdown' | 'playing' | 'paused' | 'finished' | 'failed'

export interface RunResult {
  delivered: number
  stars: number
  timeLeft: number
  score: ScoreBreakdown
  newBest: boolean
  nearMisses: number
  cleanSections: number
  recoveries: number
  /** km/h */
  topSpeed: number
  objectiveText: string
  objectiveMet: boolean
  /** Rank name if this run earned a promotion. */
  promotedTo: string | null
}

interface GameStore {
  phase: GamePhase
  /** Incremented per run; keys the <Physics> world so every body is rebuilt. */
  runId: number
  timeLeft: number
  cargo: CargoCounts
  magnetCharges: number
  magnetActive: boolean
  checkpointIndex: number
  /** Consumed by GameDirector: how many recoveries have been requested. */
  recoverRequests: number
  result: RunResult | null
  /** Haul Score earned so far this run (driving points only until delivery). */
  score: number
  /** Consecutive clean sections; drives the multiplier. */
  streak: number
  multiplier: number
  bestScore: number
  bestStars: number
  bestDelivered: number
  /** Lifetime totals — the "number goes up" hook. */
  careerRocks: number
  careerRuns: number
  debugVisible: boolean
  soundOn: boolean
  reducedMotion: boolean
  trackKind: TrackKind
  /** Foreman's bonus objective for the current run. */
  objectiveId: string
  paintId: string
  selectPaint: (id: string) => void
  toggleSound: () => void
  toggleReducedMotion: () => void
  selectTrack: (kind: TrackKind) => void

  startRun: () => void
  beginPlaying: () => void
  pause: () => void
  resume: () => void
  tickTimer: (dt: number) => void
  requestRecovery: () => void
  reachCheckpoint: (index: number) => void
  activateMagnet: () => void
  setMagnetActive: (active: boolean) => void
  finish: (delivered: number) => void
  addScore: (points: number) => void
  setStreak: (streak: number) => void
  setCargo: (c: CargoCounts) => void
  toggleDebug: () => void
}

const BEST_STARS_KEY = 'rhr-best-stars'
const BEST_SCORE_KEY = 'rhr-best-score'
const BEST_DELIVERED_KEY = 'rhr-best-delivered'
const CAREER_ROCKS_KEY = 'rhr-career-rocks'
const CAREER_RUNS_KEY = 'rhr-career-runs'
const PAINT_KEY = 'rhr-paint'

function loadBest(key: string): number {
  try {
    const v = globalThis.localStorage?.getItem(key)
    return v ? Number(v) || 0 : 0
  } catch {
    return 0
  }
}

function saveBest(key: string, value: number): void {
  try {
    globalThis.localStorage?.setItem(key, String(value))
  } catch {
    /* storage unavailable — bests just don't persist */
  }
}

function loadPaint(): string {
  try {
    const id = globalThis.localStorage?.getItem(PAINT_KEY)
    return id && PAINTS.some((p) => p.id === id) ? id : PAINTS[0].id
  } catch {
    return PAINTS[0].id
  }
}

let lastRecoveryAt = 0

const freshCargo = (): CargoCounts => ({
  inBed: cargoTuning.rockCount,
  recoverable: 0,
  lost: 0,
  delivered: 0,
})

/** State shared by every new run. Time limit comes from the active course. */
const freshRun = () => ({
  timeLeft: course.timeLimit,
  cargo: freshCargo(),
  magnetCharges: magnetTuning.charges,
  magnetActive: false,
  checkpointIndex: 0,
  recoverRequests: 0,
  result: null as RunResult | null,
  score: 0,
  streak: 0,
  multiplier: 1,
})

/** Assembles the results payload from the run's live state and stats. */
function buildResult(s: GameStore, delivered: number, stars: number, timeLeft: number): RunResult {
  const objective = objectiveForRun(s.runId)
  const objectiveMet = objective.test({
    delivered,
    stars,
    timeLeft,
    recoveries: runStats.recoveries,
    nearMisses: runStats.nearMisses,
    bestStreak: runStats.bestStreak,
    magnetChargesLeft: s.magnetCharges,
  })
  const score = finalScore(s.score, delivered, timeLeft, objectiveMet)
  const before = rankFor(s.careerRocks).index
  const after = rankFor(s.careerRocks + delivered)
  return {
    objectiveText: objective.text,
    objectiveMet,
    promotedTo: after.index > before ? after.name : null,
    delivered,
    stars,
    timeLeft,
    score,
    newBest: score.total > s.bestScore && score.total > 0,
    nearMisses: runStats.nearMisses,
    cleanSections: runStats.cleanSections,
    recoveries: runStats.recoveries,
    topSpeed: Math.round(runStats.topSpeed * 3.6),
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  runId: 0,
  ...freshRun(),
  bestScore: loadBest(BEST_SCORE_KEY),
  bestStars: loadBest(BEST_STARS_KEY),
  bestDelivered: loadBest(BEST_DELIVERED_KEY),
  careerRocks: loadBest(CAREER_ROCKS_KEY),
  careerRuns: loadBest(CAREER_RUNS_KEY),
  debugVisible: false,
  soundOn: isSoundEnabled(),
  reducedMotion: loadReducedMotion(),
  trackKind: 'standard',
  objectiveId: objectiveForRun(0).id,
  paintId: loadPaint(),

  selectPaint: (id) => {
    if (!paintUnlocked(paintById(id), get().careerRocks)) return
    try {
      globalThis.localStorage?.setItem(PAINT_KEY, id)
    } catch {
      /* non-persistent */
    }
    set({ paintId: id })
  },

  selectTrack: (kind) => {
    const phase = get().phase
    if (phase !== 'title' && phase !== 'finished' && phase !== 'failed') return
    selectCourse(kind)
    set({ trackKind: kind })
  },

  toggleSound: () => {
    const next = !get().soundOn
    setSoundEnabled(next)
    set({ soundOn: next })
  },

  toggleReducedMotion: () => {
    const next = !get().reducedMotion
    particleSettings.intensity = (next ? 0.35 : 1) * quality.particleScale
    try {
      globalThis.localStorage?.setItem(REDUCED_MOTION_KEY, next ? '1' : '0')
    } catch {
      /* non-persistent */
    }
    set({ reducedMotion: next })
  },

  startRun: () => {
    resetRunStats()
    set((s) => ({
      ...freshRun(),
      phase: 'countdown',
      runId: s.runId + 1,
      objectiveId: objectiveForRun(s.runId + 1).id,
    }))
  },

  beginPlaying: () => {
    if (get().phase === 'countdown') set({ phase: 'playing' })
  },

  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },

  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },

  tickTimer: (dt) => {
    const s = get()
    if (s.phase !== 'playing') return
    const timeLeft = Math.max(0, s.timeLeft - dt)
    if (timeLeft <= 0) {
      const careerRuns = s.careerRuns + 1
      saveBest(CAREER_RUNS_KEY, careerRuns)
      set({
        timeLeft: 0,
        phase: 'failed',
        magnetActive: false,
        result: buildResult(s, 0, 0, 0),
        careerRuns,
      })
    } else {
      set({ timeLeft })
    }
  },

  requestRecovery: () => {
    const s = get()
    if (s.phase !== 'playing') return
    // Debounce: an accidental double-tap should not cost two penalties.
    const now = Date.now()
    if (now - lastRecoveryAt < 1200) return
    lastRecoveryAt = now
    runStats.recoveries++
    set({
      recoverRequests: s.recoverRequests + 1,
      timeLeft: Math.max(0.1, s.timeLeft - gameplayTuning.recoveryPenaltySeconds),
    })
  },

  reachCheckpoint: (index) =>
    set((s) => ({ checkpointIndex: Math.max(s.checkpointIndex, index) })),

  activateMagnet: () => {
    const s = get()
    if (s.phase !== 'playing' || s.magnetActive || s.magnetCharges <= 0) return
    magnet.remaining = magnetTuning.duration
    set({ magnetCharges: s.magnetCharges - 1, magnetActive: true })
  },

  setMagnetActive: (active) => set({ magnetActive: active }),

  finish: (delivered) => {
    const s = get()
    if (s.phase !== 'playing') return
    const stars = starsForDelivered(delivered)
    const bestStars = Math.max(s.bestStars, stars)
    const bestDelivered = stars > 0 ? Math.max(s.bestDelivered, delivered) : s.bestDelivered
    if (bestStars !== s.bestStars) saveBest(BEST_STARS_KEY, bestStars)
    if (bestDelivered !== s.bestDelivered) saveBest(BEST_DELIVERED_KEY, bestDelivered)
    const careerRocks = s.careerRocks + delivered
    const careerRuns = s.careerRuns + 1
    saveBest(CAREER_ROCKS_KEY, careerRocks)
    saveBest(CAREER_RUNS_KEY, careerRuns)
    const result = buildResult(s, delivered, stars, s.timeLeft)
    const bestScore = Math.max(s.bestScore, result.score.total)
    if (bestScore !== s.bestScore) saveBest(BEST_SCORE_KEY, bestScore)
    set({
      phase: 'finished',
      magnetActive: false,
      result,
      bestScore,
      bestStars,
      bestDelivered,
      careerRocks,
      careerRuns,
    })
  },

  setCargo: (c) => set({ cargo: c }),

  addScore: (points) => set((s) => ({ score: s.score + Math.round(points) })),

  setStreak: (streak) => {
    runStats.bestStreak = Math.max(runStats.bestStreak, streak)
    set({ streak, multiplier: multiplierForStreak(streak) })
  },

  toggleDebug: () => set((s) => ({ debugVisible: !s.debugVisible })),
}))

// Apply persisted reduced-motion preference to the particle system at load.
particleSettings.intensity =
  (useGameStore.getState().reducedMotion ? 0.35 : 1) * quality.particleScale
