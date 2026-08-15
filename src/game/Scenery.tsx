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
