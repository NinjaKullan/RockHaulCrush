import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mudTuning, truckTuning as T } from '../config/gameTuning'
import { course } from './levels/quarryRun'
import { gameRefs, input, telemetry } from './refs'
import { useGameStore } from './store'
import { setEngine, sfx, stopEngine } from './audio'
import { emitParticles } from './Particles'

/**
 * Arcade dump truck: one dynamic chassis rigid body, two raycast suspension
 * "axles" (spring + damper forces applied at the axle points), drive/brake
 * forces along the chassis forward axis, and lean torque. Wheels are visual
 * only. Constrained to the x/y gameplay plane.
 */

// Frame-loop scratch objects — allocated once, never inside the loop.
const _q = new THREE.Quaternion()
const _fwd = new THREE.Vector3()
const _up = new THREE.Vector3()
const _origin = new THREE.Vector3()
const _bodyPos = new THREE.Vector3()
const _rel = new THREE.Vector3()
const _pointVel = new THREE.Vector3()
const _imp = new THREE.Vector3()

const AXLE_XS = [T.axleX, -T.axleX]

const BODY_YELLOW = '#f0a93c'
const BODY_YELLOW_DARK = '#c9882a'

export default function Truck() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const { rapier } = useRapier()
  const ray = useMemo(
    () => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }),
    [rapier],
  )
  /** Smoothed suspension ray lengths per axle, for wheel visuals. */
  const wheelToi = useRef([T.suspensionRest * 0.8, T.suspensionRest * 0.8])
  const wheelSpin = useRef(0)
  const wheelGroups = useRef<(THREE.Group | null)[]>([])
  const visualRoll = useRef<THREE.Group>(null)
  const skidCooldown = useRef(0)
  const dustAcc = useRef(0)

  useEffect(() => {
    gameRefs.truck = bodyRef.current
    return () => {
      gameRefs.truck = null
    }
  }, [])

  useBeforePhysicsStep((world) => {
    const body = bodyRef.current
    if (!body) return
    const dt = world.timestep
    const mass = body.mass()
    const t = body.translation()
    const r = body.rotation()
    const lv = body.linvel()
    const av = body.angvel()
    _q.set(r.x, r.y, r.z, r.w)
    _fwd.set(1, 0, 0).applyQuaternion(_q)
    _up.set(0, 1, 0).applyQuaternion(_q)
    _bodyPos.set(t.x, t.y, t.z)

    // --- Suspension: one ray per axle, spring force applied at the axle point
    let grounded = false
    for (let i = 0; i < 2; i++) {
      _origin
        .set(AXLE_XS[i], T.suspensionOriginY, 0)
        .applyQuaternion(_q)
        .add(_bodyPos)
      ray.origin.x = _origin.x
      ray.origin.y = _origin.y
      ray.origin.z = _origin.z
      ray.dir.x = -_up.x
      ray.dir.y = -_up.y
      ray.dir.z = -_up.z
      const hit = world.castRay(ray, T.suspensionRest, true, undefined, undefined, undefined, body)
      if (hit) {
        const toi =
          (hit as unknown as { timeOfImpact?: number; toi?: number }).timeOfImpact ??
          (hit as unknown as { toi: number }).toi
        const compression = 1 - toi / T.suspensionRest
        // Vertical velocity of the axle point (linvel + angvel × r)
        _rel.copy(_origin).sub(_bodyPos)
        _pointVel
          .set(
            av.y * _rel.z - av.z * _rel.y,
            av.z * _rel.x - av.x * _rel.z,
            av.x * _rel.y - av.y * _rel.x,
          )
          .add(_imp.set(lv.x, lv.y, lv.z))
        const relUpVel = _pointVel.dot(_up)
        const forceMag =
          (mass / 2) * (T.suspensionStiffness * compression - T.suspensionDamping * relUpVel)
        if (forceMag > 0) {
          _imp.copy(_up).multiplyScalar(forceMag * dt)
          body.applyImpulseAtPoint(
            { x: _imp.x, y: _imp.y, z: _imp.z },
            { x: _origin.x, y: _origin.y, z: _origin.z },
            true,
          )
        }
        grounded = true
        wheelToi.current[i] += (toi - wheelToi.current[i]) * 0.4
      } else {
        wheelToi.current[i] += (T.suspensionRest - wheelToi.current[i]) * 0.15
      }
    }

    // --- Drive / brake / reverse along chassis forward (only while playing)
    const controlsLive = useGameStore.getState().phase === 'playing'
    const vAlong = lv.x * _fwd.x + lv.y * _fwd.y
    let inMud = false
    for (const m of course.mudRegions) {
      if (t.x >= m.x0 && t.x <= m.x1) {
        inMud = true
        break
      }
    }
    if (grounded) {
      let force = 0
      const accel = inMud ? T.accel * mudTuning.accelFactor : T.accel
      if (controlsLive && input.throttle && vAlong < T.maxSpeed) force += mass * accel
      if (controlsLive && input.brake) {
        if (vAlong > 0.5) force -= mass * T.brakeDecel
        else if (vAlong > -T.maxReverseSpeed) force -= mass * T.reverseAccel
      }
      if (!(controlsLive && (input.throttle || input.brake)))
        force -= vAlong * mass * T.rollingDrag
      if (inMud) force -= vAlong * mass * mudTuning.extraDrag
      if (force !== 0) {
        _imp.copy(_fwd).multiplyScalar(force * dt)
        body.applyImpulse({ x: _imp.x, y: _imp.y, z: _imp.z }, true)
      }
    }

    // --- Lateral steering (chase view: D = screen right = +z)
    const steer = (input.steerRight ? 1 : 0) - (input.steerLeft ? 1 : 0)
    if (controlsLive && steer !== 0 && Math.abs(lv.z) < T.maxLateralSpeed) {
      const authority = grounded ? 1 : 0.4
      body.applyImpulse({ x: 0, y: 0, z: steer * mass * T.lateralAccel * authority * dt }, true)
    }
    // Lateral damping + soft road-edge spring keep the dodge snappy and bounded.
    let zForce = -lv.z * mass * T.lateralDamping
    if (Math.abs(t.z) > T.roadHalfWidth) {
      zForce -= (t.z - Math.sign(t.z) * T.roadHalfWidth) * mass * 30
    }
    body.applyImpulse({ x: 0, y: 0, z: zForce * dt }, true)

    // --- Airborne auto-level so jumps land clean without a lean control
    if (!grounded) {
      const pitch = Math.asin(THREE.MathUtils.clamp(_fwd.y, -1, 1))
      const torque = -pitch * T.airStabilizeStrength - av.z * T.airStabilizeDamping
      body.applyTorqueImpulse({ x: 0, y: 0, z: torque * mass * dt }, true)
    }

    // Landing impact: grounded transition with real downward speed
    if (grounded && !telemetry.grounded && lv.y < -4) {
      const intensity = Math.min(1, (-lv.y - 4) / 8)
      if (controlsLive) sfx.impact(intensity)
      emitParticles({
        x: t.x,
        y: t.y - 0.8,
        z: t.z,
        count: 8 + Math.round(intensity * 10),
        color: inMud ? 0x6d5138 : 0xd8a86a,
        speed: 3,
        spread: 1.2,
        up: 2.5,
        life: 0.8,
        size: 0.16,
      })
    }
    // Brake skid at speed
    if (controlsLive && input.brake && vAlong > 8 && grounded && skidCooldown.current <= 0) {
      sfx.skid()
      skidCooldown.current = 0.35
    }
    skidCooldown.current -= dt

    telemetry.speed = vAlong
    telemetry.grounded = grounded
    telemetry.inMud = inMud
    telemetry.upY = _up.y
    telemetry.truckX = t.x
    telemetry.truckY = t.y
    telemetry.bodyCount = world.bodies.len()
  })

  // Visual wheels: follow suspension length, spin with ground speed.
  useFrame((_, delta) => {
    // Cosmetic roll into turns (colliders stay level).
    const body = bodyRef.current
    const roll = visualRoll.current
    if (body && roll) {
      const vz = body.linvel().z
      roll.rotation.x += (THREE.MathUtils.clamp(vz * 0.045, -0.13, 0.13) - roll.rotation.x) * 0.15
    }

    // Engine tone + rolling dust
    const playing = useGameStore.getState().phase === 'playing'
    if (playing) {
      setEngine(Math.min(1, Math.abs(telemetry.speed) / T.maxSpeed), input.throttle)
    } else {
      stopEngine()
    }
    if (body && playing && telemetry.grounded && Math.abs(telemetry.speed) > 5) {
      dustAcc.current += delta
      const interval = telemetry.inMud ? 0.05 : 0.09
      if (dustAcc.current > interval) {
        dustAcc.current = 0
        const p = body.translation()
        emitParticles({
          x: p.x - 1.6,
          y: p.y - 0.8,
          z: p.z,
          count: telemetry.inMud ? 4 : 2,
          color: telemetry.inMud ? 0x5d4530 : 0xdcb27a,
          speed: 1.2,
          spread: 0.8,
          up: telemetry.inMud ? 3 : 1.6,
          life: 0.6,
          size: telemetry.inMud ? 0.18 : 0.13,
        })
      }
    }
    wheelSpin.current -= (telemetry.speed / T.wheelRadius) * delta
    for (let i = 0; i < 4; i++) {
      const g = wheelGroups.current[i]
      if (!g) continue
      const axle = i < 2 ? 0 : 1
      const y = T.suspensionOriginY - wheelToi.current[axle] + T.wheelRadius
      g.position.y = THREE.MathUtils.clamp(y, -1.0, -0.3)
      g.rotation.z = wheelSpin.current
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[T.spawn[0], T.spawn[1], 0]}
      enabledTranslations={[true, true, true]}
      enabledRotations={[false, false, true]}
      angularDamping={T.angularDamping}
      linearDamping={T.linearDamping}
      ccd
    >
      {/* --- Colliders --- */}
      <CuboidCollider args={[2.05, 0.35, 0.9]} position={[0, 0, 0]} friction={0.4} />
      {/* Low-slung ballast keeps the center of mass down for stability */}
      <CuboidCollider args={[1.2, 0.1, 0.5]} position={[0, -0.28, 0]} density={6} friction={0.4} />
      {/* Nose + cab block */}
      <CuboidCollider args={[0.34, 0.45, 0.75]} position={[1.81, 0.25, 0]} friction={0.3} />
      <CuboidCollider args={[0.38, 0.32, 0.38]} position={[1.45, 1.05, -0.35]} friction={0.3} />
      {/* Rock-shed canopy over the cab — spilled rocks slide off, not through */}
      <CuboidCollider
        args={[0.7, 0.05, 0.88]}
        position={[1.3, 1.6, 0]}
        rotation={[0, 0, -0.08]}
        friction={0.3}
      />
      {/* Bed: floor + 4 walls (BED_BOUNDS in cargoMath.ts mirrors this) */}
      <CuboidCollider args={[1.28, 0.08, 0.88]} position={[-0.72, 0.43, 0]} friction={1.0} />
      <CuboidCollider args={[0.08, 0.52, 0.88]} position={[0.48, 1.02, 0]} friction={0.6} />
      <CuboidCollider args={[0.08, 0.36, 0.88]} position={[-1.92, 0.87, 0]} friction={0.6} />
      {/* Symmetric side walls — the chase camera sees into the bed from behind */}
      <CuboidCollider args={[1.28, 0.38, 0.08]} position={[-0.72, 0.89, 0.8]} friction={0.6} />
      <CuboidCollider args={[1.28, 0.38, 0.08]} position={[-0.72, 0.89, -0.8]} friction={0.6} />

      {/* --- Visuals: stylized quarry rigid hauler (group rolls into turns) --- */}
      <group ref={visualRoll}>
      {/* Chassis frame — slim, so the tires dominate like the real machines */}
      <mesh castShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[4.3, 0.3, 1.4]} />
        <meshStandardMaterial color="#33302b" />
      </mesh>
      {/* Front bumper */}
      <mesh castShadow position={[2.18, -0.05, 0]}>
        <boxGeometry args={[0.18, 0.4, 1.6]} />
        <meshStandardMaterial color="#3f3a33" />
      </mesh>
      {/* Radiator nose (below the cab, sloped hood line) */}
      <mesh castShadow position={[1.81, 0.28, 0]}>
        <boxGeometry args={[0.68, 0.86, 1.5]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Dark hood accent panel (Volvo-style) */}
      <mesh castShadow position={[1.81, 0.735, 0]}>
        <boxGeometry args={[0.72, 0.07, 1.32]} />
        <meshStandardMaterial color="#2f2b28" />
      </mesh>
      {/* Grille */}
      <mesh position={[2.16, 0.22, 0]}>
        <boxGeometry args={[0.04, 0.5, 1.1]} />
        <meshStandardMaterial color="#4a443c" />
      </mesh>
      {/* Access-ladder rungs on the nose */}
      {[0.02, 0.2, 0.38].map((y) => (
        <mesh key={y} position={[2.17, y, 0.05]}>
          <boxGeometry args={[0.04, 0.05, 0.5]} />
          <meshStandardMaterial color="#2f2b28" />
        </mesh>
      ))}
      {/* Catwalk deck across the nose */}
      <mesh castShadow position={[1.55, 0.75, 0]}>
        <boxGeometry args={[1.25, 0.08, 1.72]} />
        <meshStandardMaterial color={BODY_YELLOW_DARK} />
      </mesh>
      {/* Cab, perched high and offset to the far side */}
      <mesh castShadow position={[1.45, 1.05, -0.38]}>
        <boxGeometry args={[0.78, 0.62, 0.78]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Cab glass: big greenhouse — front, near side, and roof edge */}
      <mesh position={[1.85, 1.13, -0.38]}>
        <boxGeometry args={[0.06, 0.48, 0.7]} />
        <meshStandardMaterial color="#3d4c58" />
      </mesh>
      <mesh position={[1.45, 1.13, 0.02]}>
        <boxGeometry args={[0.68, 0.48, 0.06]} />
        <meshStandardMaterial color="#3d4c58" />
      </mesh>
      {/* Cab roof lip */}
      <mesh castShadow position={[1.45, 1.39, -0.38]}>
        <boxGeometry args={[0.86, 0.06, 0.86]} />
        <meshStandardMaterial color={BODY_YELLOW_DARK} />
      </mesh>
      {/* Mirror posts */}
      <mesh position={[1.88, 1.24, 0.06]}>
        <boxGeometry args={[0.03, 0.22, 0.03]} />
        <meshStandardMaterial color="#2f2b28" />
      </mesh>
      {/* Exhaust stack + air cleaner on the deck's near side */}
      <mesh castShadow position={[1.32, 1.08, 0.42]}>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#2e2a26" flatShading />
      </mesh>
      <mesh castShadow position={[1.72, 0.97, 0.42]}>
        <cylinderGeometry args={[0.11, 0.11, 0.34, 8]} />
        <meshStandardMaterial color="#4a443c" flatShading />
      </mesh>
      {/* Handrail along the deck edge */}
      <mesh position={[1.55, 0.98, 0.82]}>
        <boxGeometry args={[1.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#e8552f" />
      </mesh>
      {/* Headlights on the nose */}
      <mesh position={[2.17, 0.5, 0.5]}>
        <boxGeometry args={[0.06, 0.14, 0.22]} />
        <meshStandardMaterial color="#fff2c9" emissive="#c9b98a" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[2.17, 0.5, -0.5]}>
        <boxGeometry args={[0.06, 0.14, 0.22]} />
        <meshStandardMaterial color="#fff2c9" emissive="#c9b98a" emissiveIntensity={0.8} />
      </mesh>

      {/* --- Dump body: flat floor, tall front wall, canopy, tapered sides --- */}
      {/* Floor (steel interior) */}
      <mesh castShadow position={[-0.72, 0.43, 0]}>
        <boxGeometry args={[2.56, 0.16, 1.76]} />
        <meshStandardMaterial color="#575047" />
      </mesh>
      {/* Tall front wall */}
      <mesh castShadow position={[0.48, 1.02, 0]}>
        <boxGeometry args={[0.16, 1.04, 1.76]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Rock-shed canopy: wide flat slab sloping down over the cab */}
      <mesh castShadow position={[1.32, 1.62, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[1.52, 0.12, 1.92]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Rear dump lip (duck-tail) */}
      <mesh castShadow position={[-2.1, 0.56, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.5, 0.1, 1.76]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Far (-z) side: full height front section + tapered rear section */}
      <mesh castShadow position={[-0.1, 0.95, -0.83]}>
        <boxGeometry args={[1.16, 0.66, 0.14]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      <mesh castShadow position={[-1.3, 0.82, -0.83]} rotation={[0, 0, 0.09]}>
        <boxGeometry args={[1.44, 0.52, 0.14]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Near (+z) side: mirrored profile — symmetric for the chase view */}
      <mesh castShadow position={[-0.1, 0.95, 0.83]}>
        <boxGeometry args={[1.16, 0.66, 0.14]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      <mesh castShadow position={[-1.3, 0.82, 0.83]} rotation={[0, 0, 0.09]}>
        <boxGeometry args={[1.44, 0.52, 0.14]} />
        <meshStandardMaterial color={BODY_YELLOW} />
      </mesh>
      {/* Body ribs on the near side */}
      {[-1.5, -0.85, -0.2].map((x) => (
        <mesh key={x} castShadow position={[x, 0.62, 0.9]}>
          <boxGeometry args={[0.14, 0.42, 0.06]} />
          <meshStandardMaterial color={BODY_YELLOW_DARK} />
        </mesh>
      ))}
      {/* Bed underside: diagonal support slabs (the V-profile from the refs) */}
      <mesh castShadow position={[0.18, 0.22, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.8, 0.14, 1.5]} />
        <meshStandardMaterial color={BODY_YELLOW_DARK} />
      </mesh>
      <mesh castShadow position={[-1.55, 0.3, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.9, 0.12, 1.5]} />
        <meshStandardMaterial color={BODY_YELLOW_DARK} />
      </mesh>

      {/* Wheels (visual only): single fronts, duals at the rear */}
      {[0, 1, 2, 3].map((i) => {
        const axle = i < 2 ? 0 : 1
        const side = i % 2 === 0 ? 1 : -1
        const isRear = axle === 1
        return (
          <group
            key={i}
            ref={(el) => {
              wheelGroups.current[i] = el
            }}
            position={[AXLE_XS[axle], -0.42, side * T.wheelZ]}
          >
            {(isRear ? [-0.14, 0.14] : [0]).map((dz) => (
              <mesh key={dz} castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0, dz]}>
                <cylinderGeometry
                  args={[T.wheelRadius, T.wheelRadius, isRear ? 0.26 : 0.42, 16]}
                />
                <meshStandardMaterial color="#262220" flatShading />
              </mesh>
            ))}
            {/* Bright rim + dark hub center, the signature look from the refs */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * (isRear ? 0.28 : 0.22)]}>
              <cylinderGeometry args={[0.28, 0.28, 0.05, 12]} />
              <meshStandardMaterial color={BODY_YELLOW} flatShading />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * (isRear ? 0.31 : 0.25)]}>
              <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
              <meshStandardMaterial color="#262220" flatShading />
            </mesh>
          </group>
        )
      })}
      </group>
    </RigidBody>
  )
}
