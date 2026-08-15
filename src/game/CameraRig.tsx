import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cameraTuning as CAM, truckTuning } from '../config/gameTuning'
import { gameRefs, telemetry } from './refs'
import { useGameStore } from './store'

/**
 * Side-following camera with velocity look-ahead and speed-based FOV,
 * plus the sun light that tracks the truck so shadows stay crisp everywhere.
 */
export default function CameraRig() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const lightTarget = useMemo(() => new THREE.Object3D(), [])
  const runId = useGameStore((s) => s.runId)
  const lastRun = useRef(runId)

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = lightTarget
  }, [lightTarget])

  useFrame((state, delta) => {
    // FPS telemetry (smoothed)
    if (delta > 0) telemetry.fps += (1 / delta - telemetry.fps) * 0.05

    const cam = state.camera as THREE.PerspectiveCamera

    // Snap back to spawn on restart instead of panning across the whole course.
    if (lastRun.current !== runId) {
      lastRun.current = runId
      cam.position.set(truckTuning.spawn[0], truckTuning.spawn[1] + CAM.height, CAM.distance)
    }

    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()
    const v = truck.linvel()

    const kx = 1 - Math.exp(-CAM.followRate * delta)
    const ky = 1 - Math.exp(-CAM.heightRate * delta)
    cam.position.x += (t.x + v.x * CAM.lookAhead - cam.position.x) * kx
    cam.position.y += (Math.max(2.6, t.y + CAM.height) - cam.position.y) * ky
    cam.position.z = CAM.distance
    cam.lookAt(cam.position.x + 1.2, cam.position.y - 2.4, 0)

    const speed = Math.abs(v.x)
    const targetFov = CAM.baseFov + Math.min(CAM.maxFovBoost, speed * CAM.fovPerSpeed)
    cam.fov += (targetFov - cam.fov) * kx
    cam.updateProjectionMatrix()

    const light = lightRef.current
    if (light) {
      light.position.set(t.x + 34, 42, 30)
      lightTarget.position.set(t.x, 0, 0)
      lightTarget.updateMatrixWorld()
    }
  })

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={2.2}
        color="#fff1d6"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={120}
      />
      <primitive object={lightTarget} />
    </>
  )
}
