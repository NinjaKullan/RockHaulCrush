import { create } from 'zustand'
import {
  cargoTuning,
  gameplayTuning,
  magnetTuning,
  starsForDelivered,
} from '../config/gameTuning'
import type { CargoCounts } from './cargoRules'
import { magnet } from './refs'

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
  bestStars: number
  bestDelivered: number
  debugVisible: boolean

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
  setCargo: (c: CargoCounts) => void
  toggleDebug: () => void
}

const BEST_STARS_KEY = 'rhr-best-stars'
const BEST_DELIVERED_KEY = 'rhr-best-delivered'

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

const freshCargo = (): CargoCounts => ({
  inBed: cargoTuning.rockCount,
  recoverable: 0,
  lost: 0,
  delivered: 0,
})

/** State shared by every new run. */
const freshRun = () => ({
  timeLeft: gameplayTuning.timeLimit,
  cargo: freshCargo(),
  magnetCharges: magnetTuning.charges,
  magnetActive: false,
  checkpointIndex: 0,
  recoverRequests: 0,
  result: null as RunResult | null,
})

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  runId: 0,
  ...freshRun(),
  bestStars: loadBest(BEST_STARS_KEY),
  bestDelivered: loadBest(BEST_DELIVERED_KEY),
  debugVisible: false,

  startRun: () =>
    set((s) => ({ ...freshRun(), phase: 'countdown', runId: s.runId + 1 })),

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
      set({
        timeLeft: 0,
        phase: 'failed',
        magnetActive: false,
        result: { delivered: 0, stars: 0, timeLeft: 0 },
      })
    } else {
      set({ timeLeft })
    }
  },

  requestRecovery: () => {
    const s = get()
    if (s.phase !== 'playing') return
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
    set({
      phase: 'finished',
      magnetActive: false,
      result: { delivered, stars, timeLeft: s.timeLeft },
      bestStars,
      bestDelivered,
    })
  },

  setCargo: (c) => set({ cargo: c }),

  toggleDebug: () => set((s) => ({ debugVisible: !s.debugVisible })),
}))
