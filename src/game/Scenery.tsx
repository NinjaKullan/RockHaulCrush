import { useMemo } from 'react'
import { mulberry32, rangeFrom } from './rng'
import { levelBounds } from './levels/quarryRun'

/** Non-physics background: low-poly hills and chunky clouds along the course. */
export default function Scenery() {
  const { hills, clouds } = useMemo(() => {
    const rng = mulberry32(20260815)
    const hillColors = ['#d9995c', '#c9863f', '#e0a86b', '#c07f45', '#d1904f']
    const hills = []
    for (let x = levelBounds.minX - 30; x < levelBounds.maxX + 40; x += rangeFrom(rng, 12, 20)) {
      hills.push({
        pos: [x, -3, rangeFrom(rng, -105, -78)] as [number, number, number],
        scale: [rangeFrom(rng, 20, 36), rangeFrom(rng, 6, 13), rangeFrom(rng, 10, 16)] as [
          number,
          number,
          number,
        ],
        color: hillColors[Math.floor(rng() * hillColors.length)],
      })
    }
    const clouds = []
    for (let x = levelBounds.minX - 20; x < levelBounds.maxX + 30; x += rangeFrom(rng, 18, 30)) {
      clouds.push({
        pos: [x, rangeFrom(rng, 13, 21), rangeFrom(rng, -52, -38)] as [number, number, number],
        scale: rangeFrom(rng, 0.9, 2.0),
      })
    }
    return { hills, clouds }
  }, [])

  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={`h${i}`} position={h.pos} scale={h.scale}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={h.color} flatShading />
        </mesh>
      ))}
      {/* Mid-ground quarry props: spoil heaps and a conveyor tower */}
      {[
        { x: 20, z: -42, r: 4.5, h: 5.5 },
        { x: 95, z: -46, r: 6, h: 7 },
        { x: 175, z: -42, r: 5, h: 6 },
        { x: 250, z: -45, r: 5.5, h: 6.5 },
      ].map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, -0.5, s.z]}>
          <coneGeometry args={[s.r, s.h, 7]} />
          <meshStandardMaterial color="#b8834a" flatShading />
        </mesh>
      ))}
      <group position={[150, -1, -58]}>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[2.6, 8, 2.6]} />
          <meshStandardMaterial color="#8a7458" flatShading />
        </mesh>
        <mesh position={[8, 4.6, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[18, 1.0, 2]} />
          <meshStandardMaterial color="#9a8265" flatShading />
        </mesh>
      </group>
      {/* Foreground parallax rocks (between camera and action, low in frame) */}
      {[
        { x: -2, z: 8, s: 1.6 },
        { x: 58, z: 8.5, s: 2.1 },
        { x: 118, z: 8, s: 1.4 },
        { x: 182, z: 8.5, s: 2.3 },
        { x: 246, z: 8, s: 1.7 },
      ].map((f, i) => (
        <mesh key={`f${i}`} position={[f.x, -0.9, f.z]} scale={f.s} rotation={[0.4, i, 0.2]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a5f36" flatShading />
        </mesh>
      ))}
      {clouds.map((c, i) => (
        <group key={`c${i}`} position={c.pos} scale={c.scale}>
          <mesh>
            <sphereGeometry args={[2.2, 7, 5]} />
            <meshStandardMaterial
              color="#fff6ea"
              emissive="#a99f92"
              emissiveIntensity={0.55}
              flatShading
            />
          </mesh>
          <mesh position={[2.1, -0.3, 0.2]}>
            <sphereGeometry args={[1.5, 7, 5]} />
            <meshStandardMaterial
              color="#fff6ea"
              emissive="#a99f92"
              emissiveIntensity={0.55}
              flatShading
            />
          </mesh>
          <mesh position={[-2.2, -0.4, -0.1]}>
            <sphereGeometry args={[1.6, 7, 5]} />
            <meshStandardMaterial
              color="#fdeeda"
              emissive="#a99f92"
              emissiveIntensity={0.55}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
