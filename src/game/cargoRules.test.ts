import { describe, expect, it } from 'vitest'
import {
  countStates,
  deliverSnapshot,
  nextRockState,
  type RockState,
} from './cargoRules'

const obs = (inBedNow: boolean, belowLostBoundary = false) => ({
  inBedNow,
  belowLostBoundary,
})

describe('nextRockState', () => {
  it('keeps a rock inBed while it stays in the bed volume', () => {
    expect(nextRockState('inBed', obs(true))).toBe('inBed')
  })

  it('moves a rock to recoverable when it leaves the bed', () => {
    expect(nextRockState('inBed', obs(false))).toBe('recoverable')
  })

  it('returns a recoverable rock to inBed when it comes back (magnet)', () => {
    expect(nextRockState('recoverable', obs(true))).toBe('inBed')
  })

  it('loses a rock that crosses the recovery boundary', () => {
    expect(nextRockState('recoverable', obs(false, true))).toBe('lost')
    expect(nextRockState('inBed', obs(false, true))).toBe('lost')
  })

  it('lost is terminal — recovery never restores lost cargo', () => {
    expect(nextRockState('lost', obs(true))).toBe('lost')
    expect(nextRockState('lost', obs(false))).toBe('lost')
  })

  it('delivered is terminal', () => {
    expect(nextRockState('delivered', obs(true))).toBe('delivered')
    expect(nextRockState('delivered', obs(false, true))).toBe('delivered')
  })
})

describe('deliverSnapshot', () => {
  const mixed: RockState[] = ['inBed', 'inBed', 'recoverable', 'lost', 'inBed']

  it('delivers exactly the in-bed rocks', () => {
    const { states, delivered } = deliverSnapshot(mixed)
    expect(delivered).toBe(3)
    expect(states).toEqual(['delivered', 'delivered', 'recoverable', 'lost', 'delivered'])
  })

  it('never double-counts on a second snapshot', () => {
    const first = deliverSnapshot(mixed)
    const second = deliverSnapshot(first.states)
    expect(second.delivered).toBe(0)
    expect(second.states).toEqual(first.states)
  })

  it('leaves recoverable and lost rocks untouched', () => {
    const { states } = deliverSnapshot(['recoverable', 'lost'])
    expect(states).toEqual(['recoverable', 'lost'])
  })
})

describe('countStates', () => {
  it('aggregates each state', () => {
    expect(
      countStates(['inBed', 'inBed', 'recoverable', 'lost', 'delivered']),
    ).toEqual({ inBed: 2, recoverable: 1, lost: 1, delivered: 1 })
  })

  it('a full fresh load is 20 inBed', () => {
    const fresh: RockState[] = Array(20).fill('inBed')
    expect(countStates(fresh).inBed).toBe(20)
  })
})
