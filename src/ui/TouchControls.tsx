import { useEffect, useState } from 'react'
import { isTouchMode, onTouchModeChange } from '../game/device'
import { initAudio, sfx } from '../game/audio'
import { input, resetInput } from '../game/refs'
import { useGameStore } from '../game/store'

/**
 * On-screen controls for touch devices.
 *
 * These write the SAME `input` refs the keyboard handler writes, so the truck
 * physics, hazards and game systems are completely unaware of the input source.
 *
 * Each button captures its pointer, so sliding a thumb off the button releases
 * it cleanly instead of leaving a control stuck on — and because every button
 * tracks its own pointer, steering and throttle work simultaneously.
 */

type HoldKey = 'throttle' | 'brake' | 'steerLeft' | 'steerRight'

function HoldButton({
  label,
  hint,
  control,
  className,
}: {
  label: string
  hint?: string
  control: HoldKey
  className: string
}) {
  const [held, setHeld] = useState(false)
  return (
    <button
      className={`touch-btn ${className}${held ? ' touch-btn-held' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        try {
          // Capture keeps the release event coming to this button even if the
          // thumb slides off it. Some synthetic/stale pointers reject capture —
          // the control still works, so never let it break input.
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* capture unavailable — pointerup still lands via the global fallback */
        }
        input[control] = true
        setHeld(true)
        initAudio()
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        input[control] = false
        setHeld(false)
      }}
      onPointerCancel={() => {
        input[control] = false
        setHeld(false)
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="touch-btn-label">{label}</span>
      {hint && <span className="touch-btn-hint">{hint}</span>}
    </button>
  )
}

export default function TouchControls() {
  const [touch, setTouch] = useState(isTouchMode())
  const phase = useGameStore((s) => s.phase)

  useEffect(() => onTouchModeChange(setTouch), [])

  // Never leave a control stuck on when control is taken away.
  useEffect(() => {
    if (phase !== 'playing') resetInput()
  }, [phase])

  if (!touch || (phase !== 'playing' && phase !== 'countdown')) return null

  const store = useGameStore.getState()
  return (
    <div className="touch-controls">
      <div className="touch-cluster touch-left">
        <HoldButton label="◀" control="steerLeft" className="touch-steer" />
        <HoldButton label="▶" control="steerRight" className="touch-steer" />
      </div>
      <div className="touch-cluster touch-right">
        <div className="touch-utility">
          <button
            className="touch-btn touch-small"
            onPointerDown={(e) => {
              e.preventDefault()
              const before = useGameStore.getState().magnetCharges
              store.activateMagnet()
              if (useGameStore.getState().magnetCharges < before) sfx.magnet()
            }}
          >
            🧲
          </button>
          <button
            className="touch-btn touch-small"
            onPointerDown={(e) => {
              e.preventDefault()
              useGameStore.getState().requestRecovery()
            }}
          >
            ⟲
          </button>
        </div>
        <HoldButton label="▼" hint="BRAKE" control="brake" className="touch-brake" />
        <HoldButton label="▲" hint="GO" control="throttle" className="touch-throttle" />
      </div>
    </div>
  )
}

/**
 * Portrait is a poor shape for a chase-camera driving game — you can barely see
 * the road ahead. Prompt for landscape, but stay dismissible: some players have
 * rotation locked and should not be walled out of the game.
 */
export function RotatePrompt() {
  const [touch, setTouch] = useState(isTouchMode())
  const [portrait, setPortrait] = useState(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth,
  )
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => onTouchModeChange(setTouch), [])
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  if (!touch || !portrait || dismissed) return null
  return (
    <div className="screen screen-dim rotate-prompt">
      <div className="rotate-icon">📱</div>
      <h2 className="screen-heading">Rotate your phone</h2>
      <p className="results-sub">Rock Haul Rush plays best in landscape.</p>
      <button className="mid-button" onClick={() => setDismissed(true)}>
        Play anyway
      </button>
    </div>
  )
}
