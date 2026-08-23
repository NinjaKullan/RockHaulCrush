import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { cargoTuning, haulerTuning as H } from '../../config/gameTuning'
import { course } from '../levels/quarryRun'
import { mulberry32 } from '../rng'
import { sfx } from '../audio'
import { emitParticles } from '../Particles'
import { gameRefs } from '../refs'
import { useGameStore } from '../store'

/**
 * Oncoming empty haulers on the two-way haul road stretch: they enter at the
 * far end in a seeded lane and drive straight at the player. Headlights on,
 * horn when close — read the lane and keep out of it. Kinematic bodies:
 * a head-on hit is a hard stop, telegraphed the whole way in the chase view.
 */

const PARK_Y = -60

export default function OncomingHauler() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const clock = useRef(0)
  const armed = useRef(false)
  const timers = useRef(Array.from({ length: H.count }, (_, i) => i * H.spawnGap + 1))
  const active = useRef(Array.from({ length: H.count }, () => false))
  const posX = useRef(Array.from({ length: H.count }, () => 0))
  const lane = useRef(Array.from({ length: H.count }, () => 0))
  const horned = useRef(Array.from({ length: H.count }, () => false))
  const dustAcc = useRef(0)
  const laneRng = useMemo(() => mulberry32(cargoTuning.seed + 555), [])

  useBeforePhysicsStep((world) => {
    const zone = course.trafficZone
    const truck = gameRefs.truck
    const dt = world.timestep

    if (!armed.current) {
      if (!truck || zone.x0 - truck.translation().x > H.armDistance) {
        for (let i = 0; i < H.count; i++) {
          bodies.current[i]?.setNextKinematicTranslation({ x: zone.x0, y: PARK_Y, z: 0 })
        }
        return
      }
      armed.current = true
    }
    clock.current += dt
    const playing = useGameStore.getState().phase === 'playing'

    for (let i = 0; i < H.count; i++) {
      const body = bodies.current[i]
      if (!body) continue

      if (!active.current[i]) {
        timers.current[i] -= dt
        body.setNextKinematicTranslation({ x: zone.x0, y: PARK_Y, z: 0 })
        if (timers.current[i] <= 0) {
          active.current[i] = true
          horned.current[i] = false
          posX.current[i] = zone.x1 + 10
          lane.current[i] = H.lanes[Math.floor(laneRng() * H.lanes.length)]
        }
        continue
      }

      posX.current[i] -= H.speed * dt
      body.setNextKinematicTranslation({
        x: posX.current[i],
        y: zone.groundY + 0.95,
        z: lane.current[i],
      })

      if (truck && playing && !horned.current[i]) {
        const dist = posX.current[i] - truck.translation().x
        if (dist > 0 && dist < H.hornRange) {
          horned.current[i] = true
          sfx.haulerHorn()
        }
      }

      // Retire once past the zone start (or well behind the player).
      const behindTruck = truck ? posX.current[i] < truck.translation().x - 14 : false
      if (posX.current[i] < zone.x0 - 12 || behindTruck) {
        active.current[i] = false
        timers.current[i] = H.spawnGap * H.count - 2
        body.setNextKinematicTranslation({ x: zone.x0, y: PARK_Y, z: 0 })
      }
    }
  })

  // Dust trail behind active haulers
  useFrame((_, delta) => {
    dustAcc.current += delta
    if (dustAcc.current < 0.15) return
    dustAcc.current = 0
    const zone = course.trafficZone
    for (let i = 0; i < H.count; i++) {
      if (!active.current[i] || posX.current[i] > zone.x1 + 4) continue
      emitParticles({
        x: posX.current[i] + 2.2,
        y: zone.groundY + 0.3,
        z: lane.current[i],
        count: 2,
        color: 0xdcb27a,
        speed: 1,
        spread: 0.6,
        up: 1.4,
        life: 0.5,
        size: 0.12,
      })
    }
  })

  return (
    <>
      {Array.from({ length: H.count }, (_, i) => (
        <RigidBody
          key={i}
          ref={(el) => {
            bodies.current[i] = el
          }}
          type="kinematicPosition"
          colliders={false}
          position={[0, PARK_Y, 0]}
        >
          <CuboidCollider args={[2.0, 0.85, 0.92]} friction={0.4} />
          {/* Empty hauler, cab facing -x (toward the player) */}
          <group>
            {/* Chassis */}
            <mesh castShadow position={[0, -0.5, 0]}>
              <boxGeometry args={[4.2, 0.3, 1.4]} />
              <meshStandardMaterial color="#33302b" />
            </mesh>
            {/* Nose + cab at the -x end */}
            <mesh castShadow position={[-1.75, -0.1, 0]}>
              <boxGeometry args={[0.7, 0.85, 1.5]} />
              <meshStandardMaterial color="#c94f3a" />
            </mesh>
            <mesh castShadow position={[-1.4, 0.65, 0.36]}>
              <boxGeometry args={[0.78, 0.6, 0.76]} />
              <meshStandardMaterial color="#c94f3a" />
            </mesh>
            <mesh position={[-1.8, 0.72, 0.36]}>
              <boxGeometry args={[0.06, 0.4, 0.62]} />
              <meshStandardMaterial color="#3d4c58" />
            </mesh>
            {/* Headlights blazing toward the player */}
            {[0.5, -0.5].map((z) => (
              <mesh key={z} position={[-2.12, -0.05, z]}>
                <boxGeometry args={[0.07, 0.16, 0.24]} />
                <meshStandardMaterial
                  color="#fff8dc"
                  emissive="#ffe9a8"
                  emissiveIntensity={2.4}
                />
              </mesh>
            ))}
            {/* Empty dump body (tall front wall toward cab, open box) */}
            <mesh castShadow position={[0.55, 0.55, 0]}>
              <boxGeometry args={[0.14, 0.9, 1.7]} />
              <meshStandardMaterial color="#b0492f" />
            </mesh>
            <mesh castShadow position={[1.45, 0.28, 0]}>
              <boxGeometry args={[1.9, 0.14, 1.7]} />
              <meshStandardMaterial color="#8a3f2c" />
            </mesh>
            {[0.83, -0.83].map((z) => (
              <mesh key={z} castShadow position={[1.45, 0.62, z]}>
                <boxGeometry args={[1.9, 0.55, 0.13]} />
                <meshStandardMaterial color="#b0492f" />
              </mesh>
            ))}
            <mesh castShadow position={[2.35, 0.5, 0]} rotation={[0, 0, -0.35]}>
              <boxGeometry args={[0.45, 0.1, 1.7]} />
              <meshStandardMaterial color="#b0492f" />
            </mesh>
            {/* Wheels */}
            {[-1.3, 1.3].map((x) =>
              [-0.8, 0.8].map((z) => (
                <mesh
                  key={`${x}${z}`}
                  castShadow
                  position={[x, -0.55, z]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <cylinderGeometry args={[0.42, 0.42, 0.3, 12]} />
                  <meshStandardMaterial color="#262220" flatShading />
                </mesh>
              )),
            )}
          </group>
        </RigidBody>
      ))}
    </>
  )
}
