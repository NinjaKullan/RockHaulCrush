import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Suspense } from 'react'
import { physicsTuning, renderTuning, cameraTuning, truckTuning } from './config/gameTuning'
import KeyboardManager from './game/KeyboardManager'
import CameraRig from './game/CameraRig'
import GameDirector from './game/GameDirector'
import Rocks from './game/Rocks'
import Scenery from './game/Scenery'
import Terrain from './game/Terrain'
import Truck from './game/Truck'
import { useGameStore } from './game/store'
import DebugOverlay from './ui/DebugOverlay'
import HUD from './ui/HUD'
import { CountdownOverlay, PauseMenu, ResultsScreen, TitleScreen } from './ui/screens'

export default function App() {
  const runId = useGameStore((s) => s.runId)
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      <KeyboardManager />
      {phase !== 'title' && <HUD />}
      {phase === 'title' && <TitleScreen />}
      {phase === 'countdown' && <CountdownOverlay />}
      {phase === 'paused' && <PauseMenu />}
      {(phase === 'finished' || phase === 'failed') && <ResultsScreen />}
      <DebugOverlay />
      <Canvas
        shadows
        dpr={[1, renderTuning.maxPixelRatio]}
        camera={{
          position: [
            truckTuning.spawn[0],
            truckTuning.spawn[1] + cameraTuning.height,
            cameraTuning.distance,
          ],
          fov: cameraTuning.baseFov,
        }}
      >
        <Sky sunPosition={[40, 30, 25]} turbidity={4} rayleigh={1.1} />
        <fog attach="fog" args={['#f0d0a2', 70, 230]} />
        <hemisphereLight args={['#bcd8ff', '#c98a4d', 0.65]} />
        <Suspense fallback={null}>
          <Scenery />
          <CameraRig />
          <Physics
            key={runId}
            gravity={physicsTuning.gravity}
            timeStep={1 / physicsTuning.timestepHz}
            paused={phase === 'paused'}
          >
            <GameDirector />
            <Terrain />
            <Truck />
            <Rocks />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  )
}
