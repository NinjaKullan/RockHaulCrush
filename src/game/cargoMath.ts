/**
 * Pure cargo-geometry rules, separated from physics/rendering so they can be
 * unit-tested. Coordinates are in truck-local space (truck center = origin,
 * +x = forward toward the cab).
 */

/** Inner bed volume in truck-local coordinates, with small margins. */
export const BED_BOUNDS = {
  xMin: -1.9,
  xMax: 0.46,
  yMin: 0.32,
  yMax: 2.3,
  zHalf: 0.88,
} as const

/** Is a truck-local point inside the cargo bed volume? */
export function isPointInBed(x: number, y: number, z: number): boolean {
  return (
    x > BED_BOUNDS.xMin &&
    x < BED_BOUNDS.xMax &&
    y > BED_BOUNDS.yMin &&
    y < BED_BOUNDS.yMax &&
    Math.abs(z) < BED_BOUNDS.zHalf
  )
}
