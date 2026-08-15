import { useEffect, useState } from 'react'
import { cargoTuning } from '../config/gameTuning'
import { telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

/** DOM overlay: cargo count, speed, and control hints. */
export default function HUD() {
  const cargo = useGameStore((s) => s.cargoInBed)
  const restart = useGameStore((s) => s.restart)
  const [speed, setSpeed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed(Math.round(Math.abs(telemetry.speed) * 3.6))
    }, 100)
    return () => clearInterval(id)
  }, [])

  const low = cargo < 12

  return (
    <div className="hud">
      <div className="hud-brand">
        <span className="hud-title">Rock Haul Rush</span>
        <span className="hud-sub">Checkpoint 1 — graybox</span>
      </div>
      <div className={`hud-cargo${low ? ' hud-cargo-low' : ''}`}>
        ROCKS {cargo}/{cargoTuning.rockCount}
      </div>
      <div className="hud-speed">
        {speed}
        <span className="hud-speed-unit"> km/h</span>
      </div>
      <div className="hud-hints">
        <b>W/↑</b> drive&ensp;<b>S/↓</b> brake/reverse&ensp;<b>A/←</b> lean back&ensp;
        <b>D/→</b> lean forward&ensp;<b>R</b> restart
      </div>
      <button className="hud-restart" onClick={restart}>
        ⟲ Restart
      </button>
    </div>
  )
}
