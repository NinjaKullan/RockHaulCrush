import { BallCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { barrelTuning as B, cargoTuning } from '../../config/gameTuning'
import { barrelHazard } from '../levels/quarryRun'
import { mulberry32 } from '../rng'
import { useHazardRegistry } from '../hazardRegistry'

/**
 * Rolling barrels released at the top of the first climb on a fixed, staggered
 * cycle — they roll down toward the oncoming truck (time your climb or eat
 * one). Ball colliders keep the rolling stable over slab seams; the visual is
 * a striped drum. Bodies are reused: reset + re-enabled each cycle.
 */
export default function Barrels() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const clock = useRef(0)
  /** Per-barrel: seconds until (re)launch; negative while rolling. */
  const timers = useRef(
    Array.from({ length: B.count }, (_, i) => (i * B.period) / B.count + 1.5),
  )
  const ages = useRef(Array.from({ length: B.count }, () => 0))
  /** Seeded lane picker — deterministic per run, varied per launch. */
  const laneRng = useMemo(() => mulberry32(cargoTuning.seed + 77), [])
  useHazardRegistry(bodies, 'barrel', B.radius)

  useBeforePhysicsStep((world) => {
    const dt = world.timestep
    clock.current += dt
    for (let i = 0; i < B.count; i++) {
      const body = bodies.current[i]
      if (!body) continue
      timers.current[i] -= dt
      if (timers.current[i] > 0) continue

      if (ages.current[i] === 0) {
        // Launch: place at the climb top in a random lane, rolling down toward -x.
        const lane =
          barrelHazard.lanes[Math.floor(laneRng() * barrelHazard.lanes.length)]
        body.setEnabled(true)
        body.setTranslation({ x: barrelHazard.spawn.x, y: barrelHazard.spawn.y, z: lane }, true)
        body.setLinvel({ x: -B.launchSpeed, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: B.launchSpeed / B.radius }, true)
        ages.current[i] = dt
        continue
      }

      ages.current[i] += dt
      const p = body.translation()
      const expired = p.x < B.minX || p.y < -4 || ages.current[i] > B.lifetime
      if (expired) {
        body.setEnabled(false)
        ages.current[i] = 0
        timers.current[i] = B.period - B.lifetime > 0 ? B.period - B.lifetime : 0.5
      }
    }
  })

  return (
    <>
      {Array.from({ length: B.count }, (_, i) => (
        <RigidBody
          key={i}
          ref={(el) => {
            bodies.current[i] = el
          }}
          colliders={false}
          position={[barrelHazard.spawn.x, barrelHazard.spawn.y, 0]}
          enabledTranslations={[true, true, false]}
          friction={0.9}
          restitution={0.2}
          angularDamping={0.2}
          ccd
        >
          <BallCollider args={[B.radius]} density={B.density} />
          {/* Striped drum visual around the ball collider */}
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[B.radius * 0.96, B.radius * 0.96, 0.9, 12]} />
            <meshStandardMaterial color="#d9642f" flatShading />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[B.radius * 0.97, B.radius * 0.97, 0.3, 12]} />
            <meshStandardMaterial color="#f3e2c5" flatShading />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
