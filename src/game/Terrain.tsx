import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { boundaryWalls, bumps, groundBoxes, zWalls, type GroundBox } from './levels/quarryRun'

function GroundPiece({ box }: { box: GroundBox }) {
  return (
    <group position={[box.c[0], box.c[1], 0]} rotation={[0, 0, box.rot]}>
      <CuboidCollider args={[box.half[0], box.half[1], box.zHalf]} friction={1.0} />
      {!box.invisible && (
        <mesh receiveShadow castShadow>
          <boxGeometry args={[box.half[0] * 2, box.half[1] * 2, box.zHalf * 2]} />
          <meshStandardMaterial color={box.color} />
        </mesh>
      )}
    </group>
  )
}

/** Static course geometry: ground slabs, bumps, end walls, and z-keeper walls. */
export default function Terrain() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {groundBoxes.map((box, i) => (
        <GroundPiece key={`g${i}`} box={box} />
      ))}
      {bumps.map((box, i) => (
        <GroundPiece key={`b${i}`} box={box} />
      ))}
      {boundaryWalls.map((box, i) => (
        <GroundPiece key={`w${i}`} box={box} />
      ))}
      {/* Invisible walls flanking the play plane so spilled rocks stay recoverable */}
      <CuboidCollider
        args={[zWalls.halfLength, zWalls.height, zWalls.halfThickness]}
        position={[zWalls.x, zWalls.height - 2, zWalls.z]}
      />
      <CuboidCollider
        args={[zWalls.halfLength, zWalls.height, zWalls.halfThickness]}
        position={[zWalls.x, zWalls.height - 2, -zWalls.z]}
      />
    </RigidBody>
  )
}
