import { useFrame } from '@react-three/fiber'
import { RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cargoTuning as C, gameplayTuning, magnetTuning, truckTuning } from '../config/gameTuning'
import { isPointInBed } from './cargoMath'
import { countStates, nextRockState } from './cargoRules'
import { mulberry32, rangeFrom } from './rng'
import { cargo, gameRefs, magnet } from './refs'
import { useGameStore } from './store'
import { sfx } from './audio'
import { emitParticles } from './Particles'

/**
 * The 20 cargo rocks: individual dynamic bodies spawned in the truck bed.
 * Owns the per-rock state machine (inBed/recoverable/lost/delivered) and the
 * Cargo Magnet forces that pull recoverable rocks back toward the bed.
 */

interface RockSpec {
  bedOffset: [number, number, number]
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
  // 15 rocks in a 5×3 floor layer, 5 more centered on top — the pile sits
  // mostly below the bed walls so ordinary jostling doesn't shed cargo.
  for (let i = 0; i < C.rockCount; i++) {
    const layer = i < 15 ? 0 : 1
    const col = i % 5
    const row = layer === 0 ? Math.floor(i / 5) : 1
    const lx = -1.62 + col * 0.45 + rangeFrom(rng, -0.03, 0.03)
    const lz = (row - 1) * 0.44 + rangeFrom(rng, -0.04, 0.04)
    const ly = 0.75 + layer * 0.42
    rocks.push({
      bedOffset: [lx, ly, lz],
      position: [sx + lx, sy + ly, lz],
      rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      radius: rangeFrom(rng, C.rockMinRadius, C.rockMaxRadius),
      color: ROCK_COLORS[i % ROCK_COLORS.length],
    })
  }
  return rocks
}

const _truckPos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _invQuat = new THREE.Quaternion()
const _local = new THREE.Vector3()
const _target = new THREE.Vector3()
const _pull = new THREE.Vector3()

/** Bed center in truck-local space — where the magnet pulls rocks toward. */
const BED_TARGET_LOCAL = new THREE.Vector3(-0.72, 1.5, 0)

export default function Rocks() {
  const specs = useMemo(generateRocks, [])
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const frameCounter = useRef(0)
  const magnetGlow = useRef<THREE.Mesh>(null)

  // Register runtime cargo state for GameDirector; fresh every run (remount).
  useEffect(() => {
    cargo.states = specs.map(() => 'inBed')
    cargo.bodies = bodies.current
    cargo.bedOffsets = specs.map((s) => s.bedOffset)
    return () => {
      cargo.states = []
      cargo.bodies = []
      cargo.bedOffsets = []
    }
  }, [specs])

  // --- Cargo Magnet forces (inside the fixed physics step)
  useBeforePhysicsStep((world) => {
    if (magnet.remaining <= 0) return
    const dt = world.timestep
    magnet.remaining -= dt
    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()
    const r = truck.rotation()
    _quat.set(r.x, r.y, r.z, r.w)
    _target.copy(BED_TARGET_LOCAL).applyQuaternion(_quat).add(_truckPos.set(t.x, t.y, t.z))

    for (let i = 0; i < cargo.states.length; i++) {
      if (cargo.states[i] !== 'recoverable') continue
      const body = bodies.current[i]
      if (!body) continue
      const p = body.translation()
      _pull.set(_target.x - p.x, _target.y - p.y, _target.z - p.z)
      const dist = _pull.length()
      if (dist > magnetTuning.radius || dist < 0.05) continue
      const v = body.linvel()
      const speed = Math.hypot(v.x, v.y, v.z)
      if (speed > magnetTuning.maxPullSpeed) continue
      const mass = body.mass()
      _pull
        .normalize()
        .multiplyScalar(magnetTuning.pullAccel * mass * dt)
      _pull.y += magnetTuning.upwardBias * magnetTuning.pullAccel * mass * dt
      body.applyImpulse({ x: _pull.x, y: _pull.y, z: _pull.z }, true)
      // Mild damping keeps pulled rocks controllable rather than ballistic.
      body.applyImpulse({ x: -v.x * mass * 0.06, y: -v.y * mass * 0.06, z: -v.z * mass * 0.06 }, true)
    }
  })

  // --- Rock state machine + magnet glow visual (render loop, every 3rd frame)
  useFrame(() => {
    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()
    const r = truck.rotation()

    const glow = magnetGlow.current
    if (glow) {
      const active = useGameStore.getState().magnetActive
      glow.visible = active
      if (active) {
        _quat.set(r.x, r.y, r.z, r.w)
        _target.copy(BED_TARGET_LOCAL).applyQuaternion(_quat).add(_truckPos.set(t.x, t.y, t.z))
        glow.position.copy(_target)
        glow.scale.setScalar(1 + 0.15 * Math.sin(performance.now() / 90))
      }
    }

    frameCounter.current++
    if (frameCounter.current % 3 !== 0) return
    _truckPos.set(t.x, t.y, t.z)
    _invQuat.set(r.x, r.y, r.z, r.w).invert()

    let changed = false
    let spilled = 0
    let caught = 0
    for (let i = 0; i < cargo.states.length; i++) {
      const body = bodies.current[i]
      if (!body) continue
      const p = body.translation()
      _local.set(p.x, p.y, p.z).sub(_truckPos).applyQuaternion(_invQuat)
      const prev = cargo.states[i]
      const next = nextRockState(prev, {
        inBedNow: isPointInBed(_local.x, _local.y, _local.z),
        belowLostBoundary: p.y < gameplayTuning.lostBelowY,
      })
      if (next !== prev) {
        cargo.states[i] = next
        changed = true
        if (prev === 'inBed' && next === 'recoverable') spilled++
        if (prev === 'recoverable' && next === 'inBed') {
          caught++
          emitParticles({
            x: p.x,
            y: p.y,
            z: p.z,
            count: 5,
            color: 0x5ee8d8,
            speed: 1.5,
            spread: 0.8,
            up: 2,
            life: 0.5,
            size: 0.1,
            gravity: 2,
          })
        }
      }
    }
    if (changed) {
      const phase = useGameStore.getState().phase
      if (spilled > 0 && phase === 'playing') sfx.spill()
      if (caught > 0 && phase === 'playing') sfx.rockCaught()
      useGameStore.getState().setCargo(countStates(cargo.states))
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
      {/* Magnet glow marker over the bed while the ability is active */}
      <mesh ref={magnetGlow} visible={false}>
        <sphereGeometry args={[0.55, 12, 8]} />
        <meshStandardMaterial
          color="#5ee8d8"
          emissive="#2fc4b2"
          emissiveIntensity={1.4}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
