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
import { truckTuning as T } from '../config/gameTuning'
import { gameRefs, input, telemetry } from './refs'

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

    // --- Drive / brake / reverse along chassis forward
    const vAlong = lv.x * _fwd.x + lv.y * _fwd.y
    if (grounded) {
      let force = 0
      if (input.throttle && vAlong < T.maxSpeed) force += mass * T.accel
      if (input.brake) {
        if (vAlong > 0.5) force -= mass * T.brakeDecel
        else if (vAlong > -T.maxReverseSpeed) force -= mass * T.reverseAccel
      }
      if (!input.throttle && !input.brake) force -= vAlong * mass * T.rollingDrag
      if (force !== 0) {
        _imp.copy(_fwd).multiplyScalar(force * dt)
        body.applyImpulse({ x: _imp.x, y: _imp.y, z: _imp.z }, true)
      }
    }

    // --- Lean control (works grounded and airborne)
    let torque = 0
    if (input.leanBack) torque += T.leanTorque
    if (input.leanForward) torque -= T.leanTorque
    if (torque !== 0) {
      body.applyTorqueImpulse({ x: 0, y: 0, z: torque * mass * dt }, true)
    }

    telemetry.speed = vAlong
    telemetry.grounded = grounded
    telemetry.truckX = t.x
    telemetry.truckY = t.y
    telemetry.bodyCount = world.bodies.len()
  })

  // Visual wheels: follow suspension length, spin with ground speed.
  useFrame((_, delta) => {
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
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
      angularDamping={T.angularDamping}
      linearDamping={T.linearDamping}
      ccd
    >
      {/* --- Colliders --- */}
      <CuboidCollider args={[2.05, 0.35, 0.9]} position={[0, 0, 0]} friction={0.4} />
      {/* Low-slung ballast keeps the center of mass down for stability */}
      <CuboidCollider args={[1.2, 0.1, 0.5]} position={[0, -0.28, 0]} density={6} friction={0.4} />
      <CuboidCollider args={[0.62, 0.5, 0.8]} position={[1.42, 0.85, 0]} friction={0.3} />
      {/* Bed: floor + 4 walls (BED_BOUNDS in cargoMath.ts mirrors this) */}
      <CuboidCollider args={[1.28, 0.08, 0.88]} position={[-0.72, 0.43, 0]} friction={1.0} />
      <CuboidCollider args={[0.08, 0.42, 0.88]} position={[0.48, 0.93, 0]} friction={0.6} />
      <CuboidCollider args={[0.08, 0.36, 0.88]} position={[-1.92, 0.87, 0]} friction={0.6} />
      {/* Camera-side (+z) wall is lower so the cargo stays clearly visible */}
      <CuboidCollider args={[1.28, 0.24, 0.08]} position={[-0.72, 0.75, 0.8]} friction={0.6} />
      <CuboidCollider args={[1.28, 0.38, 0.08]} position={[-0.72, 0.89, -0.8]} friction={0.6} />

      {/* --- Visuals --- */}
      {/* Chassis frame */}
      <mesh castShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[4.1, 0.5, 1.7]} />
        <meshStandardMaterial color="#3a352f" />
      </mesh>
      {/* Cab */}
      <mesh castShadow position={[1.42, 0.85, 0]}>
        <boxGeometry args={[1.24, 1.0, 1.6]} />
        <meshStandardMaterial color="#f2a636" />
      </mesh>
      {/* Cab window */}
      <mesh position={[1.95, 1.0, 0]}>
        <boxGeometry args={[0.2, 0.5, 1.3]} />
        <meshStandardMaterial color="#4a5a66" />
      </mesh>
      {/* Headlight */}
      <mesh position={[2.06, 0.35, 0.55]}>
        <boxGeometry args={[0.1, 0.18, 0.24]} />
        <meshStandardMaterial color="#fff2c9" emissive="#c9b98a" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[2.06, 0.35, -0.55]}>
        <boxGeometry args={[0.1, 0.18, 0.24]} />
        <meshStandardMaterial color="#fff2c9" emissive="#c9b98a" emissiveIntensity={0.8} />
      </mesh>
      {/* Bed floor + walls */}
      <mesh castShadow position={[-0.72, 0.43, 0]}>
        <boxGeometry args={[2.56, 0.16, 1.76]} />
        <meshStandardMaterial color="#8a5a33" />
      </mesh>
      <mesh castShadow position={[0.48, 0.93, 0]}>
        <boxGeometry args={[0.16, 0.84, 1.76]} />
        <meshStandardMaterial color="#b06b35" />
      </mesh>
      <mesh castShadow position={[-1.92, 0.87, 0]}>
        <boxGeometry args={[0.16, 0.72, 1.76]} />
        <meshStandardMaterial color="#b06b35" />
      </mesh>
      <mesh castShadow position={[-0.72, 0.75, 0.8]}>
        <boxGeometry args={[2.56, 0.48, 0.16]} />
        <meshStandardMaterial color="#b06b35" />
      </mesh>
      <mesh castShadow position={[-0.72, 0.89, -0.8]}>
        <boxGeometry args={[2.56, 0.76, 0.16]} />
        <meshStandardMaterial color="#b06b35" />
      </mesh>

      {/* Wheels (visual only) */}
      {[0, 1, 2, 3].map((i) => {
        const axle = i < 2 ? 0 : 1
        const side = i % 2 === 0 ? 1 : -1
        return (
          <group
            key={i}
            ref={(el) => {
              wheelGroups.current[i] = el
            }}
            position={[AXLE_XS[axle], -0.55, side * T.wheelZ]}
          >
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[T.wheelRadius, T.wheelRadius, 0.32, 14]} />
              <meshStandardMaterial color="#2e2a26" flatShading />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.17]}>
              <cylinderGeometry args={[0.16, 0.16, 0.04, 8]} />
              <meshStandardMaterial color="#8c8272" flatShading />
            </mesh>
          </group>
        )
      })}
    </RigidBody>
  )
}
