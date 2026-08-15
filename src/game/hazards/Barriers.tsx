import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { course } from '../levels/quarryRun'

/**
 * Pushable A-frame construction barriers. Light dynamic bodies: nudge through
 * them slowly, or plow them at speed and let the impact rattle the cargo.
 */
export default function Barriers() {
  return (
    <>
      {course.barrierPositions.map((b, i) => (
        <RigidBody
          key={i}
          colliders={false}
          position={[b.x, b.y, b.z]}
          density={0.5}
          linearDamping={0.6}
          angularDamping={0.8}
        >
          <CuboidCollider args={[0.35, 0.55, 0.8]} friction={0.7} />
          {/* A-frame legs */}
          <mesh castShadow position={[-0.18, -0.1, 0]} rotation={[0, 0, 0.28]}>
            <boxGeometry args={[0.1, 1.0, 1.5]} />
            <meshStandardMaterial color="#8c8272" />
          </mesh>
          <mesh castShadow position={[0.18, -0.1, 0]} rotation={[0, 0, -0.28]}>
            <boxGeometry args={[0.1, 1.0, 1.5]} />
            <meshStandardMaterial color="#8c8272" />
          </mesh>
          {/* Striped board */}
          <mesh castShadow position={[0, 0.32, 0]}>
            <boxGeometry args={[0.12, 0.34, 1.6]} />
            <meshStandardMaterial color="#e8552f" />
          </mesh>
          {[-0.55, 0, 0.55].map((z) => (
            <mesh key={z} position={[0.005, 0.32, z]}>
              <boxGeometry args={[0.125, 0.34, 0.24]} />
              <meshStandardMaterial color="#fbe8c8" />
            </mesh>
          ))}
        </RigidBody>
      ))}
    </>
  )
}
