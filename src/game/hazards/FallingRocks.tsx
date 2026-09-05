import { useFrame } from '@react-three/fiber'
import { RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useHazardRegistry } from '../hazardRegistry'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { fallingRockTuning as F } from '../../config/gameTuning'
import { course } from '../levels/quarryRun'
import { gameRefs } from '../refs'

/** Arm each spawn when the truck is this close — a full-speed driver meets
 *  the drop right at the ring instead of blowing past an idle cycle. */
const ARM_DISTANCE = 40

/**
 * Telegraphed falling boulders. Each spawn is armed by the truck's approach:
 * warn (pulsing amber marker) → drop → rest → vanish, then repeating cycle.
 * The boulder body is disabled outside its fall/rest window.
 */
export default function FallingRocks() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const markers = useRef<(THREE.Mesh | null)[]>([])
  const clocks = useRef(course.fallingRockSpawns.map(() => -1))
  const armed = useRef(course.fallingRockSpawns.map(() => false))
  const dropped = useRef(course.fallingRockSpawns.map(() => false))
  useHazardRegistry(bodies, 'boulder', F.radius)

  // Boulders start dormant (their bodies would otherwise free-fall on mount).
  useEffect(() => {
    const id = setTimeout(() => {
      for (const b of bodies.current) b?.setEnabled(false)
    }, 0)
    return () => clearTimeout(id)
  }, [])

  useBeforePhysicsStep((world) => {
    const dt = world.timestep
    const truck = gameRefs.truck
    for (let i = 0; i < course.fallingRockSpawns.length; i++) {
      const body = bodies.current[i]
      if (!body) continue
      if (!armed.current[i]) {
        if (!truck) continue
        if (course.fallingRockSpawns[i].x - truck.translation().x < ARM_DISTANCE) {
          armed.current[i] = true
          clocks.current[i] = 0
        }
        continue
      }
      clocks.current[i] += dt
      const t = clocks.current[i] % F.period
      if (clocks.current[i] < 0) continue

      const inFallWindow = t >= F.warnTime && t < F.warnTime + F.restTime + 1.5
      if (inFallWindow && !dropped.current[i]) {
        dropped.current[i] = true
        const s = course.fallingRockSpawns[i]
        body.setEnabled(true)
        body.setTranslation({ x: s.x, y: s.groundY + F.dropHeight, z: s.z }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 1.5 }, true)
      } else if (!inFallWindow && dropped.current[i]) {
        dropped.current[i] = false
        body.setEnabled(false)
      }
    }
  })

  // Warning markers pulse on the render loop (visual only).
  useFrame(() => {
    for (let i = 0; i < course.fallingRockSpawns.length; i++) {
      const marker = markers.current[i]
      if (!marker) continue
      const t = ((clocks.current[i] % F.period) + F.period) % F.period
      const warning = clocks.current[i] > 0 && t < F.warnTime
      marker.visible = warning
      if (warning) {
        const pulse = 1 + 0.25 * Math.sin(t * 18)
        marker.scale.setScalar(pulse)
      }
    }
  })

  return (
    <>
      {course.fallingRockSpawns.map((s, i) => (
        <group key={i}>
          <RigidBody
            ref={(el) => {
              bodies.current[i] = el
            }}
            colliders="hull"
            position={[s.x, s.groundY + F.dropHeight, s.z]}
            enabledTranslations={[true, true, false]}
            friction={0.9}
            restitution={0.1}
            density={F.density}
            ccd
          >
            <mesh castShadow>
              <dodecahedronGeometry args={[F.radius, 0]} />
              <meshStandardMaterial color="#7d6b5d" flatShading />
            </mesh>
          </RigidBody>
          {/* Amber warning disc on the road during the telegraph phase */}
          <mesh
            ref={(el) => {
              markers.current[i] = el
            }}
            visible={false}
            position={[s.x, s.groundY + 0.5, s.z]}
          >
            <torusGeometry args={[0.85, 0.12, 8, 20]} />
            <meshStandardMaterial
              color="#ffb52e"
              emissive="#ff8c1a"
              emissiveIntensity={1.6}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Perched crag the rocks fall from — visual anchor overhead */}
          <mesh position={[s.x, s.groundY + F.dropHeight + 1.2, s.z]} rotation={[0.3, 0.5, 0]}>
            <dodecahedronGeometry args={[1.6, 0]} />
            <meshStandardMaterial color="#9a7a50" flatShading />
          </mesh>
        </group>
      ))}
    </>
  )
}
