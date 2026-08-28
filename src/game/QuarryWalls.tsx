import { useMemo } from 'react'
import * as THREE from 'three'
import { blastZone, course, craneHazard, groundTopAt, trainCrossing } from './levels/quarryRun'
import { mulberry32, rangeFrom } from './rng'
import { useGameStore } from './store'

/**
 * Benched quarry walls flanking the haul road — the signature stepped-terrace
 * profile of a real limestone pit, and the main source of *scale*: they rise
 * well above the truck close to the roadside so the player feels small.
 *
 * All benches share one box geometry and render as a single InstancedMesh, so
 * a few hundred terraces cost one draw call.
 */

const BENCH_COUNT = 4
const BENCH_H = 4.6 // vertical height gained per bench
const BENCH_STEP = 4.2 // how far each bench sits back from the one below
// Front face of the lowest bench. Set back far enough that the corridor still
// shows sky and upcoming hazards stay visible — scale, not claustrophobia.
const BASE_Z = 13.5
const BENCH_DEPTH = 11 // box depth away from the road (overlaps the next bench)
const SEG = 8 // x length of a wall segment

/** Ranges where a wall would collide with a hazard or block its sightline. */
function clearZones(): { x0: number; x1: number; side: number }[] {
  const d = course.deliveryZone
  return [
    // Rail crossing: track runs right through both walls
    { x0: trainCrossing.x - 13, x1: trainCrossing.x + 13, side: 0 },
    // Blast cliff face has its own geometry on the left
    { x0: blastZone.x - 13, x1: blastZone.x + 13, side: -1 },
    // Crane tower + jib reach over the road from the left
    { x0: craneHazard.x - 11, x1: craneHazard.x + 11, side: -1 },
    // Delivery: the plant needs the room, and the finish should feel open
    { x0: d.padStartX - 14, x1: course.levelBounds.maxX + 20, side: 0 },
  ]
}

function blocked(x: number, side: number, zones: ReturnType<typeof clearZones>): boolean {
  return zones.some((z) => x > z.x0 && x < z.x1 && (z.side === 0 || z.side === side))
}

const _m = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _color = new THREE.Color()

/** Limestone strata: paler and warmer toward the top, where topsoil sits. */
const STRATA = ['#8e8a80', '#9a958a', '#a6a094', '#b0a89a']
const CAP = '#7f7c53'
/** Dusty verge between the engineered road edge and the wall toe. */
const VERGE = ['#a08a68', '#96805f', '#a89372']
const VERGE_INNER = 5.4

export default function QuarryWalls() {
  const trackKind = useGameStore((s) => s.trackKind)

  const instances = useMemo(() => {
    const rng = mulberry32(31337)
    const zones = clearZones()
    const out: { m: THREE.Matrix4; c: string }[] = []
    const { minX, maxX } = course.levelBounds

    for (const side of [-1, 1]) {
      for (let x = minX - 16; x < maxX + 12; x += SEG) {
        if (blocked(x + SEG / 2, side, zones)) continue
        const ground = groundTopAt(x + SEG / 2)
        // Wall foot runs well below grade so no gap shows on slopes.
        const foot = ground - 6

        // Verge apron: fills the ground from the road edge out to the wall toe
        // so no void shows between them, and reads as the dusty shoulder that
        // real haul roads have between the running surface and the rock face.
        _pos.set(
          x + SEG / 2,
          ground - 0.35,
          side * (VERGE_INNER + (BASE_Z + 1.5 - VERGE_INNER) / 2),
        )
        _scale.set(SEG + 0.4, 0.7, BASE_Z + 1.5 - VERGE_INNER)
        _m.compose(_pos, _quat, _scale)
        out.push({ m: _m.clone(), c: VERGE[Math.floor(rng() * VERGE.length)] })

        for (let level = 0; level < BENCH_COUNT; level++) {
          const jitter = rangeFrom(rng, -0.5, 0.5)
          const top = foot + (level + 1) * BENCH_H + jitter
          const height = top - foot
          const zFront = side * (BASE_Z + level * BENCH_STEP + rangeFrom(rng, -0.3, 0.3))
          _pos.set(
            x + SEG / 2,
            foot + height / 2,
            zFront + (side * BENCH_DEPTH) / 2,
          )
          _scale.set(SEG + 0.4, height, BENCH_DEPTH)
          _m.compose(_pos, _quat, _scale)
          out.push({
            m: _m.clone(),
            c: level === BENCH_COUNT - 1 && rng() > 0.45 ? CAP : STRATA[level],
          })
        }
      }
    }
    return out
    // trackKind switches the active course, so walls must rebuild with it.
  }, [trackKind])

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95 }),
    [],
  )

  const meshRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < instances.length; i++) {
      mesh.setMatrixAt(i, instances[i].m)
      mesh.setColorAt(i, _color.set(instances[i].c))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }

  return (
    <instancedMesh
      key={`walls-${trackKind}-${instances.length}`}
      ref={meshRef}
      args={[geometry, material, instances.length]}
      receiveShadow
      frustumCulled={false}
    />
  )
}
