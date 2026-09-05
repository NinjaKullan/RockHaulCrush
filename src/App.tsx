import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Suspense, useEffect } from 'react'
import { physicsTuning, cameraTuning, truckTuning } from './config/gameTuning'
import { installTouchProbe, quality } from './game/device'
import KeyboardManager from './game/KeyboardManager'
import CameraRig from './game/CameraRig'
import GameDirector from './game/GameDirector'
import ScoreSystem from './game/ScoreSystem'
import Rocks from './game/Rocks'
import DistantActivity from './game/DistantActivity'
import QuarryWalls from './game/QuarryWalls'
import Scenery from './game/Scenery'
import Terrain from './game/Terrain'
import Truck from './game/Truck'
import Barrels from './game/hazards/Barrels'
import Barriers from './game/hazards/Barriers'
import BlastZone from './game/hazards/BlastZone'
import Crane from './game/hazards/Crane'
import FallingRocks from './game/hazards/FallingRocks'
import OncomingHauler from './game/hazards/OncomingHauler'
import TrainCrossing from './game/hazards/TrainCrossing'
import Particles from './game/Particles'
import { useGameStore } from './game/store'
import DebugOverlay from './ui/DebugOverlay'
import HintSystem from './ui/HintSystem'
import HUD from './ui/HUD'
import TouchControls, { RotatePrompt } from './ui/TouchControls'
import { CountdownOverlay, PauseMenu, ResultsScreen, TitleScreen } from './ui/screens'

export default function App() {
  const runId = useGameStore((s) => s.runId)
  const phase = useGameStore((s) => s.phase)

  // Confirm touch mode on the first real touch, whatever the media query said.
  useEffect(installTouchProbe, [])

  return (
    <>
      <KeyboardManager />
      {phase !== 'title' && <HUD />}
      <HintSystem />
      <TouchControls />
      <RotatePrompt />
      {phase === 'title' && <TitleScreen />}
      {phase === 'countdown' && <CountdownOverlay />}
      {phase === 'paused' && <PauseMenu />}
      {(phase === 'finished' || phase === 'failed') && <ResultsScreen />}
      <DebugOverlay />
      <Canvas
        shadows
        dpr={[1, quality.maxPixelRatio]}
        camera={{
          position: [
            truckTuning.spawn[0] - cameraTuning.back,
            truckTuning.spawn[1] + cameraTuning.height,
            0,
          ],
          fov: cameraTuning.baseFov,
        }}
      >
        <Sky sunPosition={[-70, 11, 30]} turbidity={6} rayleigh={2.6} mieCoefficient={0.01} />
        <fog attach="fog" args={['#e2c49c', 55, 210]} />
        <hemisphereLight args={['#a8c0e0', '#b89260', 0.62]} />
        <Suspense fallback={null}>
          <Scenery />
          <QuarryWalls />
          <DistantActivity />
          <CameraRig />
          <Physics
            key={runId}
            gravity={physicsTuning.gravity}
            timeStep={1 / physicsTuning.timestepHz}
            paused={phase === 'paused'}
          >
            <GameDirector />
            <ScoreSystem />
            <Terrain />
            <Truck />
            <Rocks />
            <Barrels />
            <Barriers />
            <FallingRocks />
            <Crane />
            <BlastZone />
            <TrainCrossing />
            <OncomingHauler />
          </Physics>
          <Particles />
        </Suspense>
      </Canvas>
    </>
  )
}
