import { create } from 'zustand'
import { cargoTuning } from '../config/gameTuning'

/**
 * Slow-changing game state. Fast per-frame values live in refs.ts —
 * this store only holds what the UI should re-render for.
 */
interface GameStore {
  /** Incremented on restart; keys the <Physics> world so every body is rebuilt. */
  runId: number
  cargoInBed: number
  debugVisible: boolean
  restart: () => void
  setCargo: (n: number) => void
  toggleDebug: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  runId: 0,
  cargoInBed: cargoTuning.rockCount,
  debugVisible: false,
  restart: () =>
    set((s) => ({ runId: s.runId + 1, cargoInBed: cargoTuning.rockCount })),
  setCargo: (n) => set({ cargoInBed: n }),
  toggleDebug: () => set((s) => ({ debugVisible: !s.debugVisible })),
}))
