import { useEffect, useRef, useState } from 'react'
import { magnetTuning, scoringTuning } from '../config/gameTuning'
import { telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

const DIAL_MAX = 60 // km/h at the end of the arc
const DIAL_SWEEP = 240 // degrees
const DIAL_START = -210 // needle angle at 0 km/h (degrees, CSS rotation)

/**
 * Analog speedometer: tick ring, redline zone, needle, digital km/h,
 * and a center-zero G-meter bar underneath.
 */
function SpeedDial({ speed, accel }: { speed: number; accel: number }) {
  const frac = Math.min(1, speed / DIAL_MAX)
  const needleDeg = DIAL_START + frac * DIAL_SWEEP
  const ticks = []
  for (let v = 0; v <= DIAL_MAX; v += 10) {
    const a = ((DIAL_START + (v / DIAL_MAX) * DIAL_SWEEP - 90) * Math.PI) / 180
    const isRed = v > 45
    ticks.push(
      <g key={v}>
        <line
          x1={60 + Math.cos(a) * 44}
          y1={60 + Math.sin(a) * 44}
          x2={60 + Math.cos(a) * 52}
          y2={60 + Math.sin(a) * 52}
          stroke={isRed ? '#ff7a5c' : '#d8cfc2'}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <text
          x={60 + Math.cos(a) * 34}
          y={60 + Math.sin(a) * 34 + 3.5}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill={isRed ? '#ff7a5c' : '#b8ab98'}
        >
          {v}
        </text>
      </g>,
    )
  }
  return (
    <div className="hud-dial">
      <svg viewBox="0 0 120 120" className="hud-dial-svg">
        <circle cx={60} cy={60} r={57} fill="rgba(30,24,16,0.85)" stroke="#6b5638" strokeWidth={3} />
        {ticks}
        <g style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: '60px 60px' }} className="hud-dial-needle">
          <line x1={60} y1={60} x2={60} y2={14} stroke="#ffd25e" strokeWidth={4} strokeLinecap="round" />
        </g>
        <circle cx={60} cy={60} r={6} fill="#ffd25e" />
        <text x={60} y={88} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fdf3e3">
          {speed}
        </text>
        <text x={60} y={102} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="#b8ab98">
          km/h
        </text>
      </svg>
      <div className="hud-accel">
        <span className="hud-accel-label">{(accel / 9.81).toFixed(1).replace('-0.0', '0.0')} g</span>
        <div className="hud-accel-bar">
          <div className="hud-accel-center" />
          <div
            className={`hud-accel-fill${accel < -0.5 ? ' hud-accel-brake' : ''}`}
            style={
              accel >= 0
                ? { left: '50%', width: `${Math.min(50, (accel / 16) * 50)}%` }
                : { right: '50%', width: `${Math.min(50, (-accel / 16) * 50)}%` }
            }
          />
        </div>
      </div>
    </div>
  )
}

/** In-game DOM overlay: cargo, timer, speed, magnet, and control hints. */
export default function HUD() {
  const cargo = useGameStore((s) => s.cargo)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const magnetCharges = useGameStore((s) => s.magnetCharges)
  const magnetActive = useGameStore((s) => s.magnetActive)
  const pause = useGameStore((s) => s.pause)
  const [speed, setSpeed] = useState(0)
  const [accel, setAccel] = useState(0)
  const [flash, setFlash] = useState(false)
  const prevInBed = useRef(cargo.inBed)

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed(Math.round(Math.abs(telemetry.speed) * 3.6))
      setAccel(telemetry.accel)
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
      <SpeedDial speed={speed} accel={accel} />
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
