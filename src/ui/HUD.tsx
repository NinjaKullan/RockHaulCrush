import { useEffect, useRef, useState } from 'react'
import { magnetTuning, scoringTuning } from '../config/gameTuning'
import { telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

/** In-game DOM overlay: cargo, timer, speed, magnet, and control hints. */
export default function HUD() {
  const cargo = useGameStore((s) => s.cargo)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const magnetCharges = useGameStore((s) => s.magnetCharges)
  const magnetActive = useGameStore((s) => s.magnetActive)
  const pause = useGameStore((s) => s.pause)
  const [speed, setSpeed] = useState(0)
  const [flash, setFlash] = useState(false)
  const prevInBed = useRef(cargo.inBed)

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed(Math.round(Math.abs(telemetry.speed) * 3.6))
    }, 100)
    return () => clearInterval(id)
  }, [])

  // Flash the cargo chip red when rocks are lost from the bed.
  useEffect(() => {
    if (cargo.inBed < prevInBed.current) {
      setFlash(true)
      const id = setTimeout(() => setFlash(false), 600)
      prevInBed.current = cargo.inBed
      return () => clearTimeout(id)
    }
    prevInBed.current = cargo.inBed
  }, [cargo.inBed])

  const low = cargo.inBed < scoringTuning.starThresholds[0]
  const minutes = Math.floor(timeLeft / 60)
  const seconds = Math.floor(timeLeft % 60)
  const timeCritical = timeLeft < 15

  // Star progress from the rocks currently in the bed
  const potentialStars =
    cargo.inBed >= scoringTuning.starThresholds[2]
      ? 3
      : cargo.inBed >= scoringTuning.starThresholds[1]
        ? 2
        : cargo.inBed >= scoringTuning.starThresholds[0]
          ? 1
          : 0

  return (
    <div className="hud">
      <div className="hud-brand">
        <span className="hud-title">Rock Haul Rush</span>
      </div>
      <div className={`hud-cargo${low ? ' hud-cargo-low' : ''}${flash ? ' hud-cargo-flash' : ''}`}>
        ROCKS {cargo.inBed}/{scoringTuning.totalRocks}
        <span className="hud-stars">
          {'★'.repeat(potentialStars)}
          {'☆'.repeat(3 - potentialStars)}
        </span>
      </div>
      <div className={`hud-timer${timeCritical ? ' hud-timer-critical' : ''}`}>
        {minutes}:{String(seconds).padStart(2, '0')}
      </div>
      <div
        className={`hud-magnet${
          magnetActive
            ? ' hud-magnet-active'
            : cargo.recoverable > 0 && magnetCharges > 0
              ? ' hud-magnet-ready'
              : ''
        }`}
      >
        MAGNET {'⚡'.repeat(magnetCharges)}
        {magnetCharges === 0 && !magnetActive ? '—' : ''}
        <span className="hud-magnet-key"> [SPACE]</span>
      </div>
      <div className="hud-speed">
        {speed}
        <span className="hud-speed-unit"> km/h</span>
      </div>
      <div className="hud-hints">
        <b>W/↑</b> drive&ensp;<b>S/↓</b> brake&ensp;<b>A/←</b>·<b>D/→</b> steer&ensp;
        <b>Space</b> magnet&ensp;<b>R</b> recover&ensp;<b>Esc</b> pause
      </div>
      <button className="hud-restart" onClick={pause}>
        ⏸ Pause
      </button>
      {magnetTuning.charges > 0 && null}
    </div>
  )
}
