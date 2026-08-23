import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { course, groundTopAt, trainCrossing, type GroundBox } from './levels/quarryRun'
import { mulberry32, rangeFrom } from './rng'

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

/**
 * Organic surface patch built from overlapping flattened discs — no more
 * rectangular carpets. Mud is matte browns; puddles are a muddy rim with a
 * reflective water surface on top.
 */
function SurfacePatch({
  x0,
  x1,
  groundY,
  kind,
}: {
  x0: number
  x1: number
  groundY: number
  kind: 'mud' | 'puddle'
}) {
  const blobs = useMemo(() => {
    const rng = mulberry32(Math.round(x0 * 97))
    const n = 6
    return Array.from({ length: n }, (_, i) => ({
      x: x0 + 1 + ((x1 - x0 - 2) * i) / (n - 1) + rangeFrom(rng, -0.5, 0.5),
      z: rangeFrom(rng, -2.2, 2.2),
      r: rangeFrom(rng, 1.6, 2.8),
      squash: rangeFrom(rng, 0.6, 0.85),
    }))
  }, [x0, x1])

  const mudColors = ['#5d4530', '#4f3a26', '#6d5138']
  return (
    <group>
      {blobs.map((b, i) => (
        <group key={i} position={[b.x, groundY, b.z]} scale={[1, 1, b.squash]}>
          {/* muddy rim */}
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <cylinderGeometry args={[b.r, b.r, 0.06, 14]} />
            <meshStandardMaterial color={mudColors[i % 3]} roughness={0.6} metalness={0.1} />
          </mesh>
          {kind === 'puddle' && (
            <mesh position={[0, 0.075, 0]}>
              <cylinderGeometry args={[b.r * 0.82, b.r * 0.82, 0.03, 14]} />
              <meshStandardMaterial
                color="#6f9fb5"
                roughness={0.08}
                metalness={0.85}
                emissive="#2a4a5a"
                emissiveIntensity={0.25}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Pothole crater (visual; the jolt is applied in truck physics). */
function Pothole({ x, z, r, groundY }: { x: number; z: number; r: number; groundY: number }) {
  return (
    <group position={[x, groundY, z]}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[r + 0.25, r + 0.25, 0.05, 12]} />
        <meshStandardMaterial color="#9a7443" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[r, r, 0.05, 12]} />
        <meshStandardMaterial color="#3a2c1c" roughness={1} />
      </mesh>
    </group>
  )
}

/** Rail track crossing the road at the train hazard (visual only). */
function RailTracks() {
  const { x, groundY } = trainCrossing
  return (
    <group position={[x, groundY, 0]}>
      {/* Sleepers */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[0, 0.04, -9 + i * 1.2]} receiveShadow>
          <boxGeometry args={[2.1, 0.08, 0.5]} />
          <meshStandardMaterial color="#4a3826" />
        </mesh>
      ))}
      {/* Rails run across the road (along z) */}
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[dx, 0.1, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.14, 0.1, 19.5]} />
          <meshStandardMaterial color="#6b6560" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
    </group>
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
        <SurfacePatch key={`m${i}`} {...m} kind="mud" />
      ))}
      {course.puddleRegions.map((p, i) => (
        <SurfacePatch key={`p${i}`} {...p} kind="puddle" />
      ))}
      <RailTracks />
      {course.signs.map((s, i) => (
        <SignPost key={i} {...s} />
      ))}
      {course.potholes.map((p, i) => (
        <Pothole key={`ph${i}`} {...p} />
      ))}
      <CurbPosts />
      <DeliveryZone />
    </>
  )
}
