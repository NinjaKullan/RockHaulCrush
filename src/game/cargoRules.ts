/**
 * Pure cargo state machine — no physics or rendering imports so the rules can
 * be unit-tested exhaustively.
 *
 * Every rock has exactly one logical state:
 *  - inBed:       carried by the truck
 *  - recoverable: outside the bed but still in the playable course
 *  - lost:        crossed the recovery boundary (terminal until restart)
 *  - delivered:   counted at the finish (terminal)
 */

export type RockState = 'inBed' | 'recoverable' | 'lost' | 'delivered'

export interface RockObservation {
  /** Is the rock inside the bed volume right now? */
  inBedNow: boolean
  /** Is the rock below the lost boundary? */
  belowLostBoundary: boolean
}

/**
 * Advance one rock's state from a physics observation.
 * `lost` and `delivered` are terminal: lost cargo is never restored by
 * recovery, and delivered cargo can never be counted again.
 */
export function nextRockState(current: RockState, obs: RockObservation): RockState {
  if (current === 'lost' || current === 'delivered') return current
  if (obs.belowLostBoundary) return 'lost'
  if (obs.inBedNow) return 'inBed'
  return 'recoverable'
}

export interface CargoCounts {
  inBed: number
  recoverable: number
  lost: number
  delivered: number
}

export function countStates(states: readonly RockState[]): CargoCounts {
  const counts: CargoCounts = { inBed: 0, recoverable: 0, lost: 0, delivered: 0 }
  for (const s of states) counts[s]++
  return counts
}

/**
 * Delivery snapshot: rocks currently in the bed become `delivered`; everything
 * else keeps its state. Returns the new states and the delivered count from
 * THIS snapshot only (already-delivered rocks are not re-counted, so calling
 * twice can never double-count).
 */
export function deliverSnapshot(states: readonly RockState[]): {
  states: RockState[]
  delivered: number
} {
  let delivered = 0
  const next = states.map((s) => {
    if (s === 'inBed') {
      delivered++
      return 'delivered' as const
    }
    return s
  })
  return { states: next, delivered }
}
