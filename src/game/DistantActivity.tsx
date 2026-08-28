import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { course } from './levels/quarryRun'
import { mulberry32, rangeFrom } from './rng'
import { useGameStore } from './store'

/**
 * Background life: other haulers crawling along distant benches, far from the
 * play plane. The player should feel like one unit in a working pit rather
 * than the only object in a corridor. Pure visuals — no physics, no collision.
 */

interface Crawler {
  z: number
  y: number
  speed: number
  offset: number
  scale: number
  dir: number
}

export default function DistantActivity() {
  const trackKind = useGameStore((s) => s.trackKind)
  const groups = useRef<(THREE.Group | null)[]>([])

  const { crawlers, span, minX } = useMemo(() => {
    const rng = mulberry32(90210)
    const { minX, maxX } = course.levelBounds
    const span = maxX - minX + 120
    const crawlers: Crawler[] = []
    for (let i = 0; i < 5; i++) {
      const side = i % 2 === 0 ? -1 : 1
      crawlers.push({
        z: side * rangeFrom(rng, 34, 62),
        y: rangeFrom(rng, 4, 16),
        speed: rangeFrom(rng, 2.5, 5),
        offset: rng() * span,
        scale: rangeFrom(rng, 0.8, 1.3),
        dir: rng() > 0.5 ? 1 : -1,
      })
    }
    return { crawlers, span, minX }
  }, [trackKind])

  useFrame((_, delta) => {
    for (let i = 0; i < crawlers.length; i++) {
      const g = groups.current[i]
      const c = crawlers[i]
      if (!g) continue
      c.offset = (c.offset + c.speed * delta * c.dir + span) % span
      g.position.x = minX - 60 + c.offset
    }
  })

  return (
    <group>
      {crawlers.map((c, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el
          }}
          position={[minX, c.y, c.z]}
          scale={c.scale}
          rotation={[0, c.dir > 0 ? 0 : Math.PI, 0]}
        >
          {/* Tiny hauler silhouette — reads at distance, costs nothing */}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[4.2, 1.5, 2.2]} />
            <meshStandardMaterial color="#c9a13c" flatShading />
          </mesh>
          <mesh position={[-1.6, 2, 0]}>
            <boxGeometry args={[1.2, 1.1, 1.8]} />
            <meshStandardMaterial color="#d8b04a" flatShading />
          </mesh>
          <mesh position={[1.2, 2.1, 0]}>
            <boxGeometry args={[2.4, 0.9, 2.1]} />
            <meshStandardMaterial color="#8d8579" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}
