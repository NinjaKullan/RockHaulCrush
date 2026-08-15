import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Physics, RigidBody } from '@react-three/rapier'
import { Suspense } from 'react'
import { physicsTuning, renderTuning } from './config/gameTuning'

/**
 * Checkpoint 0 proof scene: WebGL + React + three.js + Rapier all initialize.
 * Dynamic "rocks" drop onto a lit, shadowed quarry floor under an open sky.
 * No gameplay yet — this validates the technical and visual baseline.
 */

const SUN_POSITION: [number, number, number] = [40, 30, 25]

const ROCK_DROPS: { pos: [number, number, number]; size: number; color: string }[] = [
  { pos: [-2.2, 4, 0], size: 0.55, color: '#c0714f' },
  { pos: [-0.8, 5.5, 0.3], size: 0.7, color: '#9a8c7c' },
  { pos: [0.5, 7, -0.2], size: 0.5, color: '#c9a55a' },
  { pos: [1.8, 6, 0.1], size: 0.65, color: '#8d7a68' },
  { pos: [0.1, 9, 0], size: 0.8, color: '#b2683a' },
]

/** Distant low-poly hills for depth — scenery only, no physics. */
const HILLS: { pos: [number, number, number]; scale: [number, number, number]; color: string }[] = [
  { pos: [-38, -2, -55], scale: [22, 8, 12], color: '#d9995c' },
  { pos: [-8, -2, -62], scale: [26, 11, 13], color: '#c9863f' },
  { pos: [20, -2, -55], scale: [18, 6.5, 11], color: '#e0a86b' },
  { pos: [48, -2, -60], scale: [24, 9, 12], color: '#c07f45' },
  { pos: [-62, -2, -58], scale: [20, 7, 12], color: '#d1904f' },
]

const CLOUDS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-26, 16, -48], scale: 1.6 },
  { pos: [4, 20, -52], scale: 1.2 },
  { pos: [30, 15, -45], scale: 2.0 },
  { pos: [-4, 14, -40], scale: 0.9 },
]

function Cloud({ pos, scale }: { pos: [number, number, number]; scale: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh>
        <sphereGeometry args={[2.2, 7, 5]} />
        <meshStandardMaterial color="#fff6ea" emissive="#a99f92" emissiveIntensity={0.55} flatShading />
      </mesh>
      <mesh position={[2.1, -0.3, 0.2]}>
        <sphereGeometry args={[1.5, 7, 5]} />
        <meshStandardMaterial color="#fff6ea" emissive="#a99f92" emissiveIntensity={0.55} flatShading />
      </mesh>
      <mesh position={[-2.2, -0.4, -0.1]}>
        <sphereGeometry args={[1.6, 7, 5]} />
        <meshStandardMaterial color="#fdeeda" emissive="#a99f92" emissiveIntensity={0.55} flatShading />
      </mesh>
    </group>
  )
}

function Scenery() {
  return (
    <group>
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={h.color} flatShading />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} pos={c.pos} scale={c.scale} />
      ))}
      {/* Striped safety barrier — palette accent from the art direction */}
      <group position={[-6.5, 0.55, -3.5]} rotation={[0, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[3.4, 0.5, 0.25]} />
          <meshStandardMaterial color="#e8552f" />
        </mesh>
        {[-1.05, 0, 1.05].map((x) => (
          <mesh key={x} position={[x, 0, 0.01]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.26]} />
            <meshStandardMaterial color="#fbe8c8" />
          </mesh>
        ))}
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, -0.45, 0]} castShadow>
            <boxGeometry args={[0.14, 0.5, 0.14]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ProofScene() {
  return (
    <Physics gravity={physicsTuning.gravity} timeStep={1 / physicsTuning.timestepHz}>
      {/* Quarry floor */}
      <RigidBody type="fixed">
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[90, 1, 60]} />
          <meshStandardMaterial color="#dfa055" />
        </mesh>
      </RigidBody>

      {/* A wedge to prove collisions push bodies around, not just stop them */}
      <RigidBody type="fixed">
        <mesh castShadow receiveShadow position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 10]}>
          <boxGeometry args={[5, 1, 3]} />
          <meshStandardMaterial color="#a9743f" flatShading />
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
        camera={{ position: [0, 3.5, 14], fov: 48 }}
        onCreated={({ camera }) => camera.lookAt(0, 5.5, -20)}
      >
        <Sky sunPosition={SUN_POSITION} turbidity={4} rayleigh={1.1} />
        <fog attach="fog" args={['#f0d0a2', 55, 160]} />
        <hemisphereLight args={['#bcd8ff', '#c98a4d', 0.65]} />
        <directionalLight
          castShadow
          position={SUN_POSITION}
          intensity={2.2}
          color="#fff1d6"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <Suspense fallback={null}>
          <Scenery />
          <ProofScene />
        </Suspense>
      </Canvas>
    </>
  )
}
