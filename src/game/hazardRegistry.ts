import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, type RefObject } from 'react'

/**
 * Every moving hazard registers its bodies here so one system can score
 * near misses without knowing hazard internals. Entries are removed when the
 * hazard unmounts (each run remounts the physics world).
 */
export type HazardKind = 'barrel' | 'hauler' | 'boulder' | 'rubble' | 'crane' | 'train'

export interface HazardEntry {
  kind: HazardKind
  body: RapierRigidBody
  /** Half-extent across the road (z), meters. */
  halfWidth: number
  /** Last frame's (hazard.x − truck.x); a sign flip means the truck passed it. */
  prevRel: number
}

export const hazardList: HazardEntry[] = []

/** Registers the bodies in `ref` (populated by ref callbacks) once mounted. */
export function useHazardRegistry(
  ref: RefObject<(RapierRigidBody | null)[]>,
  kind: HazardKind,
  halfWidth: number,
): void {
  useEffect(() => {
    const added: HazardEntry[] = []
    const id = setTimeout(() => {
      for (const body of ref.current ?? []) {
        if (!body) continue
        const entry: HazardEntry = { kind, body, halfWidth, prevRel: 1 }
        hazardList.push(entry)
        added.push(entry)
      }
    }, 0)
    return () => {
      clearTimeout(id)
      for (const e of added) {
        const i = hazardList.indexOf(e)
        if (i >= 0) hazardList.splice(i, 1)
      }
    }
  }, [ref, kind, halfWidth])
}
