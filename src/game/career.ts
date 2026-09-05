/**
 * Career progression: ranks earned by lifetime rocks hauled, and truck paints
 * unlocked by rank. Pure data + helpers so the UI and tests share one truth.
 */

export interface Rank {
  name: string
  /** Career rocks needed to hold this rank. */
  rocks: number
}

export const RANKS: readonly Rank[] = [
  { name: 'Rookie', rocks: 0 },
  { name: 'Greenhorn', rocks: 40 },
  { name: 'Hauler', rocks: 120 },
  { name: 'Pit Veteran', rocks: 300 },
  { name: 'Shift Boss', rocks: 600 },
  { name: 'Quarry Legend', rocks: 1200 },
]

export interface RankStatus {
  index: number
  name: string
  next: Rank | null
  /** 0..1 progress toward the next rank (1 at the top). */
  progress: number
  /** Rocks still needed for the next rank (0 at the top). */
  remaining: number
}

export function rankFor(careerRocks: number): RankStatus {
  let index = 0
  for (let i = 0; i < RANKS.length; i++) if (careerRocks >= RANKS[i].rocks) index = i
  const rank = RANKS[index]
  const next = RANKS[index + 1] ?? null
  if (!next) return { index, name: rank.name, next, progress: 1, remaining: 0 }
  const span = next.rocks - rank.rocks
  return {
    index,
    name: rank.name,
    next,
    progress: Math.min(1, (careerRocks - rank.rocks) / span),
    remaining: Math.max(0, next.rocks - careerRocks),
  }
}

export interface Paint {
  id: string
  name: string
  body: string
  dark: string
  /** Rank index required. */
  rank: number
}

export const PAINTS: readonly Paint[] = [
  { id: 'quarry', name: 'Quarry Yellow', body: '#f0a93c', dark: '#c9882a', rank: 0 },
  { id: 'cat', name: 'Cat Yellow', body: '#f5c518', dark: '#c99d0f', rank: 1 },
  { id: 'fire', name: 'Fire Red', body: '#d9382b', dark: '#a52a20', rank: 2 },
  { id: 'mine', name: 'Mine Green', body: '#4c8c3f', dark: '#376a2e', rank: 3 },
  { id: 'arctic', name: 'Arctic White', body: '#e9e6df', dark: '#bdb8ad', rank: 4 },
  { id: 'onyx', name: 'Onyx Black', body: '#2c2c30', dark: '#1a1a1d', rank: 5 },
]

export function paintById(id: string): Paint {
  return PAINTS.find((p) => p.id === id) ?? PAINTS[0]
}

export function paintUnlocked(paint: Paint, careerRocks: number): boolean {
  return rankFor(careerRocks).index >= paint.rank
}
