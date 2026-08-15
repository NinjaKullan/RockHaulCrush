import { useEffect, useState } from 'react'
import { telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

/** Developer overlay, toggled with backquote (`). Hidden during normal play. */
export default function DebugOverlay() {
  const visible = useGameStore((s) => s.debugVisible)
  const runId = useGameStore((s) => s.runId)
  const cargo = useGameStore((s) => s.cargoInBed)
  const [, force] = useState(0)

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => force((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [visible])

  if (!visible) return null

  return (
    <div className="debug-overlay">
      <div>fps: {telemetry.fps.toFixed(0)}</div>
      <div>speed: {telemetry.speed.toFixed(2)} m/s</div>
      <div>grounded: {String(telemetry.grounded)}</div>
      <div>
        truck: {telemetry.truckX.toFixed(1)}, {telemetry.truckY.toFixed(1)}
      </div>
      <div>cargo in bed: {cargo}</div>
      <div>bodies: {telemetry.bodyCount}</div>
      <div>run: {runId}</div>
    </div>
  )
}
