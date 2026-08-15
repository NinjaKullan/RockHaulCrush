import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cameraTuning as CAM, truckTuning } from '../config/gameTuning'
import { gameRefs, telemetry } from './refs'
import { useGameStore } from './store'

/**
 * Chase camera: sits behind and above the truck looking forward along the
 * course, follows lateral dodges with a soft fraction for parallax, widens
 * FOV with speed. Also hosts the sun light that tracks the truck.
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
    if (delta > 0) telemetry.fps += (1 / delta - telemetry.fps) * 0.05

    const cam = state.camera as THREE.PerspectiveCamera

    // Snap behind the spawn point on restart.
    if (lastRun.current !== runId) {
      lastRun.current = runId
      cam.position.set(
        truckTuning.spawn[0] - CAM.back,
        truckTuning.spawn[1] + CAM.height,
        0,
      )
    }

    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()
    const v = truck.linvel()

    const kx = 1 - Math.exp(-CAM.followRate * delta)
    const ky = 1 - Math.exp(-CAM.heightRate * delta)
    cam.position.x += (t.x - CAM.back - cam.position.x) * kx
    cam.position.y += (t.y + CAM.height - cam.position.y) * ky
    cam.position.z += (t.z * CAM.zFollow - cam.position.z) * kx
    cam.lookAt(t.x + CAM.lookAhead, t.y + CAM.lookUp, t.z * CAM.zLook)

    const reduced = useGameStore.getState().reducedMotion
    const speed = Math.abs(v.x)
    const targetFov = reduced
      ? CAM.baseFov
      : CAM.baseFov + Math.min(CAM.maxFovBoost, speed * CAM.fovPerSpeed)
    cam.fov += (targetFov - cam.fov) * kx
    cam.updateProjectionMatrix()

    const light = lightRef.current
    if (light) {
      light.position.set(t.x + 24, 42, 30)
      lightTarget.position.set(t.x + 6, 0, 0)
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
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-far={120}
      />
      <primitive object={lightTarget} />
    </>
  )
}
