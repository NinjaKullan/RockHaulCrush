import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Lightweight pooled particle system: one InstancedMesh of chunky low-poly
 * shards. Any system can call emitParticles() — requests are consumed on the
 * next frame. No allocations in the frame loop.
 */

const POOL = 320

interface EmitRequest {
  x: number
  y: number
  z: number
  count: number
  color: number
  speed: number
  spread: number
  up: number
  life: number
  size: number
  gravity: number
}

const queue: EmitRequest[] = []

export function emitParticles(opts: {
  x: number
  y: number
  z: number
  count?: number
  color?: number
  speed?: number
  spread?: number
  up?: number
  life?: number
  size?: number
  gravity?: number
}): void {
  queue.push({
    x: opts.x,
    y: opts.y,
    z: opts.z,
    count: opts.count ?? 6,
    color: opts.color ?? 0xd8a86a,
    speed: opts.speed ?? 2,
    spread: opts.spread ?? 1,
    up: opts.up ?? 2,
    life: opts.life ?? 0.7,
    size: opts.size ?? 0.14,
    gravity: opts.gravity ?? 6,
  })
}

/** Global scale on emission counts (reduced-motion support). */
export const particleSettings = { intensity: 1 }

const _mat = new THREE.Matrix4()
const _quat = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _color = new THREE.Color()

export default function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const pool = useMemo(
    () => ({
      alive: new Array(POOL).fill(false),
      px: new Float32Array(POOL),
      py: new Float32Array(POOL),
      pz: new Float32Array(POOL),
      vx: new Float32Array(POOL),
      vy: new Float32Array(POOL),
      vz: new Float32Array(POOL),
      life: new Float32Array(POOL),
      maxLife: new Float32Array(POOL),
      size: new Float32Array(POOL),
      grav: new Float32Array(POOL),
      rot: new Float32Array(POOL),
      cursor: 0,
    }),
    [],
  )

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)

    // Spawn queued requests into the pool
    while (queue.length > 0) {
      const req = queue.pop()!
      const n = Math.max(1, Math.round(req.count * particleSettings.intensity))
      for (let k = 0; k < n; k++) {
        const i = pool.cursor
        pool.cursor = (pool.cursor + 1) % POOL
        pool.alive[i] = true
        pool.px[i] = req.x + (Math.random() - 0.5) * 0.4
        pool.py[i] = req.y + (Math.random() - 0.5) * 0.2
        pool.pz[i] = req.z + (Math.random() - 0.5) * 0.4
        pool.vx[i] = (Math.random() - 0.5) * 2 * req.spread * req.speed
        pool.vy[i] = (Math.random() * 0.7 + 0.5) * req.up
        pool.vz[i] = (Math.random() - 0.5) * 2 * req.spread * req.speed
        pool.life[i] = pool.maxLife[i] = req.life * (0.7 + Math.random() * 0.6)
        pool.size[i] = req.size * (0.7 + Math.random() * 0.7)
        pool.grav[i] = req.gravity
        pool.rot[i] = Math.random() * Math.PI * 2
        mesh.setColorAt(i, _color.setHex(req.color))
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    // Advance + write matrices
    for (let i = 0; i < POOL; i++) {
      if (!pool.alive[i]) {
        _mat.makeScale(0, 0, 0)
        mesh.setMatrixAt(i, _mat)
        continue
      }
      pool.life[i] -= dt
      if (pool.life[i] <= 0) {
        pool.alive[i] = false
        _mat.makeScale(0, 0, 0)
        mesh.setMatrixAt(i, _mat)
        continue
      }
      pool.vy[i] -= pool.grav[i] * dt
      pool.px[i] += pool.vx[i] * dt
      pool.py[i] += pool.vy[i] * dt
      pool.pz[i] += pool.vz[i] * dt
      const t = pool.life[i] / pool.maxLife[i]
      const s = pool.size[i] * (0.4 + 0.6 * t)
      pool.rot[i] += dt * 3
      _quat.setFromAxisAngle(_pos.set(0.4, 0.7, 0.2).normalize(), pool.rot[i])
      _mat.compose(_pos.set(pool.px[i], pool.py[i], pool.pz[i]), _quat, _scale.set(s, s, s))
      mesh.setMatrixAt(i, _mat)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POOL]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial flatShading />
    </instancedMesh>
  )
}
