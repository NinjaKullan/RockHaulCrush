import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useRef } from 'react'
import * as THREE from 'three'
import { craneTuning as CR } from '../../config/gameTuning'
import { craneHazard } from '../levels/quarryRun'

/**
 * The moving-machine hazard: a crane load (concrete block) swinging across
 * the final approach as a pendulum with a fixed, readable period. Pass when
 * the block is at the far side of its arc. The block is a kinematic body —
 * impacts shove the truck backward rather than crushing it downward.
 */

const _quat = new THREE.Quaternion()
const _euler = new THREE.Euler()

/** Pendulum angle at time t. */
function swingAngle(t: number): number {
  return CR.amplitude * Math.sin((2 * Math.PI * t) / CR.period)
}

export default function Crane() {
  const blockBody = useRef<RapierRigidBody>(null)
  const pendulumVisual = useRef<THREE.Group>(null)
  const clock = useRef(0)

  const pivotY = craneHazard.groundY + CR.pivotY

  useBeforePhysicsStep((world) => {
    const body = blockBody.current
    if (!body) return
    clock.current += world.timestep
    const theta = swingAngle(clock.current)
    body.setNextKinematicTranslation({
      x: craneHazard.x + CR.cableLength * Math.sin(theta),
      y: pivotY - CR.cableLength * Math.cos(theta),
      z: 0,
    })
    _quat.setFromEuler(_euler.set(0, 0, theta))
    body.setNextKinematicRotation(_quat)
  })

  // Cable + block visuals hang from the pivot and mirror the physics formula.
  useFrame(() => {
    const g = pendulumVisual.current
    if (g) g.rotation.z = swingAngle(clock.current)
  })

  return (
    <group>
      {/* Kinematic collider block (visual is part of the pendulum group) */}
      <RigidBody
        ref={blockBody}
        type="kinematicPosition"
        colliders={false}
        position={[craneHazard.x, pivotY - CR.cableLength, 0]}
      >
        <CuboidCollider args={[CR.blockHalf, CR.blockHalf, CR.blockHalf]} friction={0.4} />
      </RigidBody>

      {/* Pendulum visual: cable + block, rotating around the pivot */}
      <group ref={pendulumVisual} position={[craneHazard.x, pivotY, 0]}>
        <mesh position={[0, -CR.cableLength / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, CR.cableLength, 6]} />
          <meshStandardMaterial color="#2e2a26" />
        </mesh>
        <mesh castShadow position={[0, -CR.cableLength, 0]}>
          <boxGeometry args={[CR.blockHalf * 2, CR.blockHalf * 2, CR.blockHalf * 2]} />
          <meshStandardMaterial color="#8d8478" flatShading />
        </mesh>
        <mesh position={[0, -CR.cableLength, 0]}>
          <boxGeometry args={[CR.blockHalf * 2.05, 0.24, CR.blockHalf * 2.05]} />
          <meshStandardMaterial color="#e8552f" />
        </mesh>
      </group>

      {/* Crane tower + jib (background scenery, off the play plane) */}
      <group position={[craneHazard.x, craneHazard.groundY, -3.6]}>
        <mesh castShadow position={[0, 3.2, 0]}>
          <boxGeometry args={[0.7, 6.4, 0.7]} />
          <meshStandardMaterial color="#e8a33d" />
        </mesh>
        <mesh castShadow position={[0, 6.3, 1.6]}>
          <boxGeometry args={[0.5, 0.45, 4.6]} />
          <meshStandardMaterial color="#e8a33d" />
        </mesh>
        <mesh position={[0, 6.3, -1.4]}>
          <boxGeometry args={[0.5, 0.45, 1.4]} />
          <meshStandardMaterial color="#c9882a" />
        </mesh>
        {/* Cab */}
        <mesh castShadow position={[0, 5.6, 0.5]}>
          <boxGeometry args={[0.8, 0.8, 0.9]} />
          <meshStandardMaterial color="#f2b53a" />
        </mesh>
      </group>
    </group>
  )
}
