import { useFrame } from '@react-three/fiber'
import { RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import * as THREE from 'three'
import { fallingRockTuning as F } from '../../config/gameTuning'
import { fallingRockSpawns } from '../levels/quarryRun'

/**
 * Telegraphed falling boulders over the second washboard. Cycle per spawn:
 * warn (pulsing amber marker on the road) → drop → rest → vanish → repeat.
 * The boulder body is disabled outside its fall/rest window.
 */
export default function FallingRocks() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const markers = useRef<(THREE.Mesh | null)[]>([])
  const clocks = useRef(fallingRockSpawns.map((s) => -s.phase))
  const dropped = useRef(fallingRockSpawns.map(() => false))

  useBeforePhysicsStep((world) => {
    const dt = world.timestep
    for (let i = 0; i < fallingRockSpawns.length; i++) {
      const body = bodies.current[i]
      if (!body) continue
      clocks.current[i] += dt
      const t = clocks.current[i] % F.period
      if (clocks.current[i] < 0) continue

      const inFallWindow = t >= F.warnTime && t < F.warnTime + F.restTime + 1.5
      if (inFallWindow && !dropped.current[i]) {
        dropped.current[i] = true
        const s = fallingRockSpawns[i]
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
    for (let i = 0; i < fallingRockSpawns.length; i++) {
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
      {fallingRockSpawns.map((s, i) => (
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
