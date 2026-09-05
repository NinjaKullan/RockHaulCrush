import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { useRef } from 'react'
import { course } from './levels/quarryRun'
import { countStates, deliverSnapshot } from './cargoRules'
import { cargo, gameRefs, magnet, pushPopup } from './refs'
import { emitParticles } from './Particles'
import { scoringTuning } from '../config/gameTuning'
import { useGameStore } from './store'

/**
 * Run orchestration that must observe physics state:
 * timer ticking, checkpoint progression, delivery detection,
 * recovery execution, and magnet expiry.
 */
export default function GameDirector() {
  const processedRecoveries = useRef(0)
  const timerAcc = useRef(0)

  // Timer ticks on render frames (coarse 100 ms steps to limit re-renders).
  useFrame((_, delta) => {
    const s = useGameStore.getState()
    if (s.phase !== 'playing') return
    timerAcc.current += delta
    if (timerAcc.current >= 0.1) {
      s.tickTimer(timerAcc.current)
      timerAcc.current = 0
    }
  })

  useBeforePhysicsStep(() => {
    const store = useGameStore.getState()
    const truck = gameRefs.truck
    if (!truck) return
    const t = truck.translation()

    // --- Checkpoint progression
    for (let i = course.checkpoints.length - 1; i > store.checkpointIndex; i--) {
      if (t.x >= course.checkpoints[i].x) {
        store.reachCheckpoint(i)
        break
      }
    }

    // --- Delivery: crossing the finish line snapshots in-bed cargo
    if (store.phase === 'playing' && t.x >= course.deliveryZone.finishX) {
      const snapshot = deliverSnapshot(cargo.states)
      cargo.states = snapshot.states
      store.setCargo(countStates(cargo.states))
      store.finish(snapshot.delivered)
      if (snapshot.delivered >= scoringTuning.totalRocks) {
        pushPopup('PERFECT HAUL!', 'perfect')
        emitParticles({
          x: t.x,
          y: t.y + 1.2,
          z: t.z,
          count: 60,
          color: 0xffd25e,
          speed: 5,
          spread: 2.2,
          up: 6,
          life: 1.6,
          size: 0.16,
          gravity: 4,
        })
      } else if (snapshot.delivered >= scoringTuning.starThresholds[0]) {
        pushPopup('LOAD DELIVERED', 'section')
      }
      return
    }

    // --- Magnet expiry (decremented in Rocks while it applies forces)
    if (store.magnetActive && magnet.remaining <= 0) {
      store.setMagnetActive(false)
    }

    // --- Recovery execution
    if (processedRecoveries.current < store.recoverRequests) {
      processedRecoveries.current = store.recoverRequests
      const cp = course.checkpoints[store.checkpointIndex]
      truck.setTranslation({ x: cp.x, y: cp.y, z: 0 }, true)
      truck.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      truck.setLinvel({ x: 0, y: 0, z: 0 }, true)
      truck.setAngvel({ x: 0, y: 0, z: 0 }, true)
      // Re-seat only the in-bed cargo at the checkpoint; recoverable rocks on
      // the ground and lost rocks are deliberately left where they are.
      for (let i = 0; i < cargo.states.length; i++) {
        if (cargo.states[i] !== 'inBed') continue
        const body = cargo.bodies[i]
        const off = cargo.bedOffsets[i]
        if (!body || !off) continue
        body.setTranslation({ x: cp.x + off[0], y: cp.y + off[1], z: off[2] }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }
  })

  return null
}
