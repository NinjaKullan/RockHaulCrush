import { useFrame } from '@react-three/fiber'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cargoTuning as C, truckTuning } from '../config/gameTuning'
import { isPointInBed } from './cargoMath'
import { mulberry32, rangeFrom } from './rng'
import { gameRefs } from './refs'
import { useGameStore } from './store'

/**
 * The 20 cargo rocks: individual dynamic bodies spawned in the truck bed.
 * In-bed detection transforms each rock into truck-local space and tests the
 * bed volume (see cargoMath.ts) — no fragile single-coordinate checks.
 */

interface RockSpec {
  position: [number, number, number]
  rotation: [number, number, number]
  radius: number
  color: string
}

const ROCK_COLORS = ['#c0714f', '#9a8c7c', '#c9a55a', '#8d7a68', '#b2683a', '#a67f5b']

function generateRocks(): RockSpec[] {
  const rng = mulberry32(C.seed)
  const rocks: RockSpec[] = []
  const [sx, sy] = truckTuning.spawn
  for (let i = 0; i < C.rockCount; i++) {
    const layer = Math.floor(i / 10)
    const col = i % 5
    const row = Math.floor(i / 5) % 2
    const lx = -1.62 + col * 0.45 + rangeFrom(rng, -0.03, 0.03)
    const lz = (row === 0 ? -0.33 : 0.33) + rangeFrom(rng, -0.04, 0.04)
    const ly = 0.78 + layer * 0.52
    rocks.push({
      position: [sx + lx, sy + ly, lz],
      rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      radius: rangeFrom(rng, C.rockMinRadius, C.rockMaxRadius),
      color: ROCK_COLORS[i % ROCK_COLORS.length],
    })
  }
  return rocks
}

const _truckPos = new THREE.Vector3()
const _invQuat = new THREE.Quaternion()
const _local = new THREE.Vector3()

export default function Rocks() {
  const specs = useMemo(generateRocks, [])
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const frameCounter = useRef(0)
  const lastCount = useRef<number>(C.rockCount)

  // Count in-bed rocks every few frames; update the store only on change.
  useFrame(() => {
    frameCounter.current++
    if (frameCounter.current % 6 !== 0) return
    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()
    const r = truck.rotation()
    _truckPos.set(t.x, t.y, t.z)
    _invQuat.set(r.x, r.y, r.z, r.w).invert()
    let count = 0
    for (const body of bodies.current) {
      if (!body) continue
      const p = body.translation()
      _local.set(p.x, p.y, p.z).sub(_truckPos).applyQuaternion(_invQuat)
      if (isPointInBed(_local.x, _local.y, _local.z)) count++
    }
    if (count !== lastCount.current) {
      lastCount.current = count
      useGameStore.getState().setCargo(count)
    }
  })

  return (
    <>
      {specs.map((spec, i) => (
        <RigidBody
          key={i}
          ref={(el) => {
            bodies.current[i] = el
          }}
          colliders="hull"
          position={spec.position}
          rotation={spec.rotation}
          friction={C.rockFriction}
          restitution={C.rockRestitution}
          density={C.rockDensity}
          linearDamping={C.rockLinearDamping}
          angularDamping={C.rockAngularDamping}
          ccd
        >
          <mesh castShadow>
            <dodecahedronGeometry args={[spec.radius, 0]} />
            <meshStandardMaterial color={spec.color} flatShading />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
