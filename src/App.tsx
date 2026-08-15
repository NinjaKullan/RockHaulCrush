import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { Suspense } from 'react'
import { physicsTuning, renderTuning } from './config/gameTuning'

/**
 * Checkpoint 0 proof scene: WebGL + React + three.js + Rapier all initialize.
 * A handful of dynamic "rocks" drop onto a lit, shadowed ground slab.
 * No gameplay yet — this only validates the technical baseline.
 */

const ROCK_DROPS: { pos: [number, number, number]; size: number; color: string }[] = [
  { pos: [-2.2, 4, 0], size: 0.55, color: '#b0715a' },
  { pos: [-0.8, 5.5, 0.3], size: 0.7, color: '#8f8578' },
  { pos: [0.5, 7, -0.2], size: 0.5, color: '#a98f5f' },
  { pos: [1.8, 6, 0.1], size: 0.65, color: '#7d6b5d' },
  { pos: [0.1, 9, 0], size: 0.8, color: '#96612f' },
]

function ProofScene() {
  return (
    <Physics gravity={physicsTuning.gravity} timeStep={1 / physicsTuning.timestepHz}>
      {/* Ground slab */}
      <RigidBody type="fixed">
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[24, 1, 12]} />
          <meshStandardMaterial color="#c98f4e" />
        </mesh>
      </RigidBody>

      {/* A wedge to prove collisions push bodies around, not just stop them */}
      <RigidBody type="fixed">
        <mesh castShadow receiveShadow position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 10]}>
          <boxGeometry args={[5, 1, 3]} />
          <meshStandardMaterial color="#8a6238" />
        </mesh>
      </RigidBody>

      {/* Falling proof-rocks */}
      {ROCK_DROPS.map((rock, i) => (
        <RigidBody key={i} colliders="cuboid" position={rock.pos}>
          <mesh castShadow>
            <dodecahedronGeometry args={[rock.size, 0]} />
            <meshStandardMaterial color={rock.color} flatShading />
          </mesh>
        </RigidBody>
      ))}
    </Physics>
  )
}

export default function App() {
  return (
    <>
      <div className="checkpoint-banner">
        <h1>Rock Haul Rush</h1>
        <p>Checkpoint 0 — engine baseline. Rocks should drop, bounce, and settle.</p>
      </div>
      <Canvas
        shadows
        dpr={[1, renderTuning.maxPixelRatio]}
        camera={{ position: [0, 4, 12], fov: 45 }}
      >
        <color attach="background" args={['#2b2620']} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[6, 10, 4]}
          intensity={1.6}
          shadow-mapSize={[1024, 1024]}
        />
        <Suspense fallback={null}>
          <ProofScene />
        </Suspense>
      </Canvas>
    </>
  )
}
