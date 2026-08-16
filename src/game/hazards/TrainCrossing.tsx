import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useRef } from 'react'
import * as THREE from 'three'
import { trainCrossing as TC } from '../levels/quarryRun'
import { sfx } from '../audio'
import { useGameStore } from '../store'

/**
 * Ore-train crossing: on a fixed cycle the crossing lights flash and a bell
 * rings, then a locomotive and ore cars sweep across the road. Stop short of
 * the rails or clear them before the train arrives — kinematic cars shove
 * anything they hit.
 */

const PASS_DURATION = (2 * TC.startZ + TC.carCount * TC.carLength) / TC.passSpeed
const GATE_ARM_LENGTH = 4.2
const GATE_PIVOT_Y = 1.35

const _gateQuat = new THREE.Quaternion()
const _gateEuler = new THREE.Euler()

/** Gate progress at cycle time t: 0 = up, 1 = down across the road. */
function gateProgress(t: number): number {
  const downStart = TC.gateDelay
  const downAt = downStart + TC.gateLowerTime
  const raiseStart = TC.warnTime + PASS_DURATION + 0.5
  const raiseEnd = raiseStart + TC.gateLowerTime
  if (t < downStart) return 0
  if (t < downAt) return (t - downStart) / TC.gateLowerTime
  if (t < raiseStart) return 1
  if (t < raiseEnd) return 1 - (t - raiseStart) / TC.gateLowerTime
  return 0
}

export default function TrainCrossing() {
  const cars = useRef<(RapierRigidBody | null)[]>([])
  const gates = useRef<(RapierRigidBody | null)[]>([])
  const lightA = useRef<THREE.Mesh>(null)
  const lightB = useRef<THREE.Mesh>(null)
  const clock = useRef(0)
  const belled = useRef(false)
  const horned = useRef(false)

  useBeforePhysicsStep((world) => {
    clock.current += world.timestep
    const t = clock.current % TC.period
    const playing = useGameStore.getState().phase === 'playing'

    // Gate arms: beat them while they're lowering, or wait out the train.
    const a = gateProgress(t)
    for (let g = 0; g < 2; g++) {
      const gate = gates.current[g]
      if (!gate) continue
      const side = g === 0 ? -1 : 1 // -1: left post (arm sweeps toward +z)
      _gateQuat.setFromEuler(_gateEuler.set(side * (1 - a) * (Math.PI / 2), 0, 0))
      gate.setNextKinematicRotation(_gateQuat)
    }

    if (t < TC.warnTime) {
      horned.current = false
      if (!belled.current) {
        belled.current = true
        if (playing) sfx.trainBell()
      }
    } else {
      belled.current = false
    }

    const passT = t - TC.warnTime
    const passing = passT >= 0 && passT <= PASS_DURATION
    if (passing && !horned.current) {
      horned.current = true
      if (playing) sfx.trainHorn()
    }

    const headZ = passing ? -TC.startZ + TC.passSpeed * passT : -60
    for (let i = 0; i < TC.carCount; i++) {
      const body = cars.current[i]
      if (!body) continue
      body.setNextKinematicTranslation({
        x: TC.x,
        y: TC.groundY + 0.95,
        z: passing ? headZ - i * TC.carLength : -60 - i * TC.carLength,
      })
    }
  })

  // Alternate-flashing crossing lights during warn + pass
  useFrame(() => {
    const t = clock.current % TC.period
    const active = t < TC.warnTime + PASS_DURATION
    const phase = Math.sin(clock.current * 12) > 0
    const a = lightA.current?.material as THREE.MeshStandardMaterial | undefined
    const b = lightB.current?.material as THREE.MeshStandardMaterial | undefined
    if (a) a.emissiveIntensity = active && phase ? 2.2 : 0.12
    if (b) b.emissiveIntensity = active && !phase ? 2.2 : 0.12
  })

  return (
    <group>
      {/* Train cars: kinematic bodies parked far off-road between passes */}
      {Array.from({ length: TC.carCount }, (_, i) => {
        const isLoco = i === 0
        return (
          <RigidBody
            key={i}
            ref={(el) => {
              cars.current[i] = el
            }}
            type="kinematicPosition"
            colliders={false}
            position={[TC.x, TC.groundY + 0.95, -60 - i * TC.carLength]}
          >
            <CuboidCollider args={[0.78, 0.85, TC.carLength / 2 - 0.15]} friction={0.4} />
            {isLoco ? (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[1.5, 1.4, 3.1]} />
                  <meshStandardMaterial color="#3d5a52" flatShading />
                </mesh>
                <mesh castShadow position={[0, 0.95, -0.7]}>
                  <boxGeometry args={[1.3, 0.7, 1.4]} />
                  <meshStandardMaterial color="#2e453f" flatShading />
                </mesh>
                <mesh castShadow position={[0, 0.85, 0.9]}>
                  <cylinderGeometry args={[0.14, 0.18, 0.5, 8]} />
                  <meshStandardMaterial color="#26221e" flatShading />
                </mesh>
                {/* Headlamp facing travel direction */}
                <mesh position={[0, 0.3, 1.57]}>
                  <boxGeometry args={[0.3, 0.2, 0.06]} />
                  <meshStandardMaterial
                    color="#fff2c9"
                    emissive="#c9b98a"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </group>
            ) : (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[1.45, 1.15, 3.0]} />
                  <meshStandardMaterial color="#8a4a2e" flatShading />
                </mesh>
                {/* Ore load */}
                {[-0.9, 0, 0.9].map((dz) => (
                  <mesh key={dz} castShadow position={[0, 0.72, dz]}>
                    <dodecahedronGeometry args={[0.42, 0]} />
                    <meshStandardMaterial color="#9a8c7c" flatShading />
                  </mesh>
                ))}
              </group>
            )}
            {/* Wheels */}
            {[-1.05, 1.05].map((dz) => (
              <group key={dz}>
                {[-0.6, 0.6].map((dx) => (
                  <mesh key={dx} position={[dx, -0.75, dz]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.12, 10]} />
                    <meshStandardMaterial color="#26221e" flatShading />
                  </mesh>
                ))}
              </group>
            ))}
          </RigidBody>
        )
      })}

      {/* Crossing gates: kinematic arms that seal the road while a train passes */}
      {[0, 1].map((g) => {
        const side = g === 0 ? -1 : 1
        const armDir = -side // arm sweeps toward road center
        return (
          <group key={g}>
            {/* Post */}
            <mesh
              castShadow
              position={[TC.x - TC.gateOffset, TC.groundY + GATE_PIVOT_Y / 2, side * 4.3]}
            >
              <boxGeometry args={[0.18, GATE_PIVOT_Y, 0.18]} />
              <meshStandardMaterial color="#8c8272" />
            </mesh>
            {/* Kinematic arm pivoting at the post top */}
            <RigidBody
              ref={(el) => {
                gates.current[g] = el
              }}
              type="kinematicPosition"
              colliders={false}
              position={[TC.x - TC.gateOffset, TC.groundY + GATE_PIVOT_Y, side * 4.3]}
            >
              <CuboidCollider
                args={[0.08, 0.08, GATE_ARM_LENGTH / 2]}
                position={[0, 0, (armDir * GATE_ARM_LENGTH) / 2]}
                friction={0.5}
              />
              {Array.from({ length: 4 }, (_, seg) => (
                <mesh
                  key={seg}
                  castShadow
                  position={[0, 0, armDir * (0.55 + seg * (GATE_ARM_LENGTH - 0.6) / 4)]}
                >
                  <boxGeometry args={[0.12, 0.14, GATE_ARM_LENGTH / 4 - 0.06]} />
                  <meshStandardMaterial color={seg % 2 === 0 ? '#e8552f' : '#fbe8c8'} />
                </mesh>
              ))}
              {/* Counterweight */}
              <mesh castShadow position={[0, -0.1, -armDir * 0.45]}>
                <boxGeometry args={[0.2, 0.3, 0.4]} />
                <meshStandardMaterial color="#3a352f" />
              </mesh>
            </RigidBody>
          </group>
        )
      })}

      {/* Crossing signals on both roadsides */}
      {[-5.2, 5.2].map((z) => (
        <group key={z} position={[TC.x - 1.6, TC.groundY, z]}>
          <mesh castShadow position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 2.6, 6]} />
            <meshStandardMaterial color="#e8e0d2" />
          </mesh>
          {/* Crossbuck */}
          <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 2, 0.6]}>
            <boxGeometry args={[1.0, 0.16, 0.04]} />
            <meshStandardMaterial color="#f3ede2" />
          </mesh>
          <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 2, -0.6]}>
            <boxGeometry args={[1.0, 0.16, 0.04]} />
            <meshStandardMaterial color="#f3ede2" />
          </mesh>
          {/* Alternating red lights (refs only on the near-side signal) */}
          <mesh
            ref={z < 0 ? lightA : undefined}
            position={[-0.22, 1.95, 0]}
          >
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color="#c22" emissive="#ff2200" emissiveIntensity={0.12} />
          </mesh>
          <mesh
            ref={z < 0 ? lightB : undefined}
            position={[0.22, 1.95, 0]}
          >
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color="#c22" emissive="#ff2200" emissiveIntensity={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
