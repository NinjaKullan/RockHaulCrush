import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  boundaryWalls,
  bumps,
  checkpoints,
  deliveryZone,
  groundBoxes,
  zWalls,
  type GroundBox,
} from './levels/quarryRun'

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

/** Checkpoint flag pole (visual only). */
function CheckpointFlag({ x, y }: { x: number; y: number }) {
  const groundY = y - 1.5
  return (
    <group position={[x, groundY, -4.5]}>
      <mesh castShadow position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 2.8, 6]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      <mesh castShadow position={[0.38, 2.5, 0]}>
        <boxGeometry args={[0.7, 0.45, 0.04]} />
        <meshStandardMaterial color="#7ec850" />
      </mesh>
    </group>
  )
}

/** Delivery zone: striped pad, goal arch, and banner (pad is visual; finish is a line). */
function DeliveryZone() {
  const { padStartX, padEndX } = deliveryZone
  const mid = (padStartX + padEndX) / 2
  const width = padEndX - padStartX
  return (
    <group>
      {/* Striped pad on the ground */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[padStartX + (i + 0.5) * (width / 7), 0.03, 0]}>
          <boxGeometry args={[width / 7 - 0.15, 0.06, 9]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#7ec850' : '#3f6b2a'} />
        </mesh>
      ))}
      {/* Goal arch */}
      {[-4.6, 4.6].map((z) => (
        <mesh key={z} castShadow position={[mid, 2.6, z]}>
          <cylinderGeometry args={[0.16, 0.2, 5.2, 8]} />
          <meshStandardMaterial color="#e8552f" />
        </mesh>
      ))}
      <mesh castShadow position={[mid, 5.4, 0]}>
        <boxGeometry args={[1.6, 0.7, 10]} />
        <meshStandardMaterial color="#7ec850" />
      </mesh>
    </group>
  )
}

/** Static course geometry: ground slabs, bumps, end walls, and z-keeper walls. */
export default function Terrain() {
  return (
    <>
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
      {/* Non-physics course dressing */}
      {checkpoints.slice(1).map((cp) => (
        <CheckpointFlag key={cp.x} x={cp.x} y={cp.y} />
      ))}
      <DeliveryZone />
    </>
  )
}
