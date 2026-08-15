import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { course, groundTopAt, type GroundBox } from './levels/quarryRun'

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

/** Wet mud patch (visual; the slowdown is applied in truck physics). */
function MudPatch({ x0, x1, groundY }: { x0: number; x1: number; groundY: number }) {
  return (
    <mesh position={[(x0 + x1) / 2, groundY + 0.04, 0]} receiveShadow>
      <boxGeometry args={[x1 - x0, 0.08, 7]} />
      <meshStandardMaterial color="#6d5138" roughness={0.55} metalness={0.2} />
    </mesh>
  )
}

/** Route sign: chevron (full speed ahead) or warning diamond (hazard ahead). */
function SignPost({ x, groundY, kind }: { x: number; groundY: number; kind: 'chevron' | 'warn' }) {
  return (
    <group position={[x, groundY, -5.4]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 1.7, 6]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      {kind === 'chevron' ? (
        <group position={[0, 1.85, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.62, 0.08]} />
            <meshStandardMaterial color="#33302b" />
          </mesh>
          {[-0.28, 0.05, 0.38].map((dx) => (
            <mesh key={dx} position={[dx, 0, 0.05]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.2, 0.34, 3]} />
              <meshStandardMaterial color="#ffd25e" />
            </mesh>
          ))}
        </group>
      ) : (
        <group position={[0, 1.9, 0]}>
          <mesh castShadow rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.72, 0.72, 0.08]} />
            <meshStandardMaterial color="#ffb52e" />
          </mesh>
          <mesh position={[0, 0.02, 0.05]}>
            <boxGeometry args={[0.12, 0.34, 0.03]} />
            <meshStandardMaterial color="#33302b" />
          </mesh>
          <mesh position={[0, -0.24, 0.05]}>
            <boxGeometry args={[0.12, 0.12, 0.03]} />
            <meshStandardMaterial color="#33302b" />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** Checkpoint gate: flag poles on both road edges. */
function CheckpointFlag({ x, y }: { x: number; y: number }) {
  const groundY = y - 1.5
  return (
    <group position={[x, groundY, 0]}>
      {[-4.5, 4.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 2.8, 6]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>
          <mesh castShadow position={[0, 2.5, 0.38]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial color="#7ec850" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Striped curb posts marking the drivable road edges. */
function CurbPosts() {
  const posts: { x: number; y: number; z: number }[] = []
  for (let x = -12; x <= course.levelBounds.maxX - 6; x += 12) {
    const y = groundTopAt(x)
    posts.push({ x, y, z: 4.3 }, { x, y, z: -4.3 })
  }
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} castShadow position={[p.x, p.y + 0.35, p.z]}>
          <boxGeometry args={[0.16, 0.7, 0.16]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#e8552f' : '#fbe8c8'} />
        </mesh>
      ))}
    </group>
  )
}

/** Delivery zone: striped pad, goal arch, and banner (pad is visual; finish is a line). */
function DeliveryZone() {
  const { padStartX, padEndX } = course.deliveryZone
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
        {course.groundBoxes.map((box, i) => (
          <GroundPiece key={`g${i}`} box={box} />
        ))}
        {course.bumps.map((box, i) => (
          <GroundPiece key={`b${i}`} box={box} />
        ))}
        {course.boundaryWalls.map((box, i) => (
          <GroundPiece key={`w${i}`} box={box} />
        ))}
        {/* Invisible walls flanking the play plane so spilled rocks stay recoverable */}
        <CuboidCollider
          args={[course.zWalls.halfLength, course.zWalls.height, course.zWalls.halfThickness]}
          position={[course.zWalls.x, course.zWalls.height - 2, course.zWalls.z]}
        />
        <CuboidCollider
          args={[course.zWalls.halfLength, course.zWalls.height, course.zWalls.halfThickness]}
          position={[course.zWalls.x, course.zWalls.height - 2, -course.zWalls.z]}
        />
      </RigidBody>
      {/* Non-physics course dressing */}
      {course.checkpoints.slice(1).map((cp) => (
        <CheckpointFlag key={cp.x} x={cp.x} y={cp.y} />
      ))}
      {course.mudRegions.map((m, i) => (
        <MudPatch key={i} {...m} />
      ))}
      {course.signs.map((s, i) => (
        <SignPost key={i} {...s} />
      ))}
      <CurbPosts />
      <DeliveryZone />
    </>
  )
}
