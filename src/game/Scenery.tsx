import { useMemo } from 'react'
import { mulberry32, rangeFrom } from './rng'
import { course } from './levels/quarryRun'
import { useGameStore } from './store'

/** Non-physics background: low-poly hills and chunky clouds along the course. */
export default function Scenery() {
  const trackKind = useGameStore((s) => s.trackKind)
  const { hills, clouds, boulders } = useMemo(() => {
    const rng = mulberry32(20260815)
    const hillColors = ['#d9995c', '#c9863f', '#e0a86b', '#c07f45', '#d1904f']
    const hills = []
    // Hills flank BOTH sides of the road (chase view looks down the corridor).
    for (const side of [-1, 1]) {
      for (let x = course.levelBounds.minX - 30; x < course.levelBounds.maxX + 80; x += rangeFrom(rng, 14, 24)) {
        hills.push({
          pos: [x, -3, side * rangeFrom(rng, 26, 70)] as [number, number, number],
          scale: [rangeFrom(rng, 14, 30), rangeFrom(rng, 5, 12), rangeFrom(rng, 10, 18)] as [
            number,
            number,
            number,
          ],
          color: hillColors[Math.floor(rng() * hillColors.length)],
        })
      }
    }
    // Far backdrop wall of hills past the delivery zone.
    for (let z = -70; z <= 70; z += rangeFrom(rng, 16, 26)) {
      hills.push({
        pos: [course.levelBounds.maxX + rangeFrom(rng, 50, 90), -3, z] as [number, number, number],
        scale: [rangeFrom(rng, 18, 30), rangeFrom(rng, 8, 15), rangeFrom(rng, 14, 24)] as [
          number,
          number,
          number,
        ],
        color: hillColors[Math.floor(rng() * hillColors.length)],
      })
    }
    const clouds = []
    for (let x = course.levelBounds.minX - 20; x < course.levelBounds.maxX + 60; x += rangeFrom(rng, 20, 34)) {
      clouds.push({
        pos: [x, rangeFrom(rng, 17, 25), rangeFrom(rng, -40, 40)] as [number, number, number],
        scale: rangeFrom(rng, 0.9, 2.0),
      })
    }
    // Roadside boulders just past the curb line.
    const boulders = []
    for (let x = course.levelBounds.minX; x < course.levelBounds.maxX; x += rangeFrom(rng, 16, 30)) {
      boulders.push({
        pos: [x, 0, (rng() > 0.5 ? 1 : -1) * rangeFrom(rng, 5.6, 8.4)] as [number, number, number],
        s: rangeFrom(rng, 0.7, 1.8),
        rot: rng() * Math.PI,
      })
    }
    return { hills, clouds, boulders }
  }, [trackKind])

  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={`h${i}`} position={h.pos} scale={h.scale}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={h.color} flatShading />
        </mesh>
      ))}
      {/* Mid-ground quarry props: spoil heaps flanking the road */}
      {[
        { x: 20, z: -16, r: 4.5, h: 5.5 },
        { x: 95, z: 18, r: 6, h: 7 },
        { x: 175, z: -17, r: 5, h: 6 },
        { x: 250, z: 19, r: 5.5, h: 6.5 },
      ].map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, -0.5, s.z]}>
          <coneGeometry args={[s.r, s.h, 7]} />
          <meshStandardMaterial color="#b8834a" flatShading />
        </mesh>
      ))}
      <group position={[150, -1, -20]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[2.6, 8, 2.6]} />
          <meshStandardMaterial color="#8a7458" flatShading />
        </mesh>
        <mesh position={[8, 4.6, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[18, 1.0, 2]} />
          <meshStandardMaterial color="#9a8265" flatShading />
        </mesh>
      </group>
      {/* Roadside boulders just outside the curb line */}
      {boulders.map((b, i) => (
        <mesh key={`f${i}`} position={b.pos} scale={b.s} rotation={[0.4, b.rot, 0.2]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#857f74" flatShading />
        </mesh>
      ))}
      {clouds.map((c, i) => (
        <group key={`c${i}`} position={c.pos} scale={c.scale}>
          <mesh>
            <sphereGeometry args={[2.2, 7, 5]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#cfc8bd"
              emissiveIntensity={0.7}
              flatShading
            />
          </mesh>
          <mesh position={[2.1, -0.3, 0.2]}>
            <sphereGeometry args={[1.5, 7, 5]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#cfc8bd"
              emissiveIntensity={0.7}
              flatShading
            />
          </mesh>
          <mesh position={[-2.2, -0.4, -0.1]}>
            <sphereGeometry args={[1.6, 7, 5]} />
            <meshStandardMaterial
              color="#faf5ec"
              emissive="#cfc8bd"
              emissiveIntensity={0.7}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
