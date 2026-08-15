import { useFrame } from '@react-three/fiber'
import { RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { blastZone as BZ } from '../levels/quarryRun'
import { mulberry32, rangeFrom } from '../rng'
import { emitParticles } from '../Particles'
import { sfx } from '../audio'
import { useGameStore } from '../store'

/**
 * Cliff-blasting hazard: on a fixed cycle a red beacon flashes and klaxon
 * blips, then charges detonate and throw rubble from the cliff face across
 * the road. Steer to the far side or hang back until it blows.
 */

const CLIFF_ROCKS: { x: number; y: number; s: [number, number, number]; c: string }[] = [
  { x: -3.2, y: 2.4, s: [3.4, 5.2, 2.6], c: '#a97a48' },
  { x: 0.2, y: 3.4, s: [4.2, 7.2, 3.0], c: '#b8834e' },
  { x: 3.4, y: 2.2, s: [3.2, 4.6, 2.4], c: '#9a7043' },
]

export default function BlastZone() {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const beacon = useRef<THREE.Mesh>(null)
  const clock = useRef(0)
  const state = useRef<'idle' | 'warned' | 'blasted'>('idle')
  const launchRng = useMemo(() => mulberry32(4242), [])

  useBeforePhysicsStep((world) => {
    clock.current += world.timestep
    const t = clock.current % BZ.period
    const playing = useGameStore.getState().phase === 'playing'

    if (t < BZ.warnTime) {
      if (state.current === 'blasted') state.current = 'idle'
      if (state.current === 'idle') {
        state.current = 'warned'
        if (playing) sfx.blastWarn()
      }
      return
    }

    if (state.current === 'warned') {
      state.current = 'blasted'
      if (playing) sfx.blast()
      emitParticles({
        x: BZ.x,
        y: BZ.groundY + 2.5,
        z: BZ.faceZ + 0.5,
        count: 22,
        color: 0x8a7458,
        speed: 5,
        spread: 1.4,
        up: 6,
        life: 1.1,
        size: 0.3,
      })
      for (let i = 0; i < BZ.rubbleCount; i++) {
        const body = bodies.current[i]
        if (!body) continue
        body.setEnabled(true)
        body.setTranslation(
          {
            x: BZ.x + rangeFrom(launchRng, -3, 3),
            y: BZ.groundY + rangeFrom(launchRng, 1.5, 4.5),
            z: BZ.faceZ + 0.3,
          },
          true,
        )
        body.setLinvel(
          {
            x: rangeFrom(launchRng, -2, 2),
            y: rangeFrom(launchRng, 2, 5),
            z: rangeFrom(launchRng, 4, 9.5),
          },
          true,
        )
        body.setAngvel(
          { x: rangeFrom(launchRng, -4, 4), y: 0, z: rangeFrom(launchRng, -4, 4) },
          true,
        )
      }
    }

    // Retire rubble after the rest window
    if (t > BZ.warnTime + BZ.restTime) {
      for (const body of bodies.current) {
        if (body?.isEnabled()) body.setEnabled(false)
      }
    }
  })

  // Beacon flash during the warn phase
  useFrame(() => {
    const b = beacon.current
    if (!b) return
    const t = clock.current % BZ.period
    const warning = t < BZ.warnTime
    const mat = b.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = warning ? 1.5 + 1.5 * Math.sin(clock.current * 22) : 0.15
  })

  return (
    <group>
      {/* Rubble bodies (disabled between blasts) */}
      {Array.from({ length: BZ.rubbleCount }, (_, i) => (
        <RigidBody
          key={i}
          ref={(el) => {
            bodies.current[i] = el
          }}
          colliders="hull"
          position={[BZ.x, BZ.groundY + 6, BZ.faceZ]}
          density={1.2}
          friction={0.9}
          restitution={0.15}
          ccd
        >
          <mesh castShadow>
            <dodecahedronGeometry args={[0.32 + (i % 3) * 0.07, 0]} />
            <meshStandardMaterial color="#9a8265" flatShading />
          </mesh>
        </RigidBody>
      ))}

      {/* Cliff face on the left of the road */}
      <group position={[BZ.x, BZ.groundY, BZ.faceZ - 2.2]}>
        {CLIFF_ROCKS.map((r, i) => (
          <mesh
            key={i}
            castShadow
            position={[r.x, r.y, 0]}
            scale={[r.s[0] * 0.62, r.s[1] * 0.58, r.s[2] * 0.62]}
            rotation={[0.15 * i, 0.7 * i, 0.1]}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={r.c} flatShading />
          </mesh>
        ))}
        {/* Charge wires detail */}
        <mesh position={[0, 1.1, 1.7]}>
          <boxGeometry args={[6.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#c23b22" />
        </mesh>
      </group>

      {/* Warning beacon on a pole at the roadside */}
      <group position={[BZ.x - 6, BZ.groundY + 0.4, -4.8]}>
        <mesh castShadow position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 2.0, 6]} />
          <meshStandardMaterial color="#3a352f" />
        </mesh>
        <mesh ref={beacon} position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.24, 10, 8]} />
          <meshStandardMaterial color="#ff3b1f" emissive="#ff2200" emissiveIntensity={0.15} />
        </mesh>
      </group>
    </group>
  )
}
