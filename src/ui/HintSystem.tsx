import { useEffect, useRef, useState } from 'react'
import { isTouchMode } from '../game/device'
import { course } from '../game/levels/quarryRun'
import { telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

/**
 * Contextual tutorial toasts: each fires once per run, at the moment the
 * mechanic matters. Priority: emergencies (flipped, spill) over zone intros.
 */

interface Hint {
  id: string
  text: string
  /** Shown instead of `text` on touch devices, where key names mean nothing. */
  touchText?: string
  /** Higher wins when several are eligible in the same tick. */
  priority: number
  test: (ctx: HintContext) => boolean
}

interface HintContext {
  x: number
  recoverable: number
  magnetCharges: number
  inMud: boolean
  inPuddle: boolean
  flippedFor: number
  /** Distance to the traffic zone start (negative once inside/past). */
  trafficDist: number
}

const HINTS: Hint[] = [
  {
    id: 'flip',
    priority: 3,
    text: '🔄 Flipped! Press R to recover at the last checkpoint (−5 s).',
    touchText: '🔄 Flipped! Tap ⟲ to recover at the last checkpoint (−5 s).',
    test: (c) => c.flippedFor > 1.2,
  },
  {
    id: 'spill',
    priority: 2,
    text: '🧲 Rocks spilled! Drive close and press SPACE — the magnet pulls them back into the bed.',
    touchText: '🧲 Rocks spilled! Drive close and tap 🧲 — the magnet pulls them back into the bed.',
    test: (c) => c.recoverable >= 3 && c.magnetCharges > 0,
  },
  {
    id: 'barrels',
    priority: 1,
    text: '⚠ Barrels incoming — steer left/right (A/D) to dodge them!',
    touchText: '⚠ Barrels incoming — tap ◀ ▶ to dodge them!',
    test: (c) => c.x > 22 && c.x < 30,
  },
  {
    id: 'barriers',
    priority: 1,
    text: '🚧 Barriers ahead — steer through the gap, or push through slowly.',
    test: (c) => c.x > 72 && c.x < 77,
  },
  {
    id: 'mud',
    priority: 1,
    text: '💦 Mud! Keep the throttle pinned and grind through.',
    test: (c) => c.inMud,
  },
  {
    id: 'puddle',
    priority: 1,
    text: '💧 Waterlogged! You’ll hydroplane — line up your steering BEFORE the splash.',
    test: (c) => c.inPuddle,
  },
  {
    id: 'train',
    priority: 1,
    text: '🚂 Rail crossing! Bell and flashing lights mean a train is coming — stop short of the rails.',
    test: (c) => c.x > 103 && c.x < 109,
  },
  {
    id: 'rockfall',
    priority: 1,
    text: '⚠ Falling rocks — the amber rings mark where they land. Steer around them!',
    test: (c) => c.x > 114 && c.x < 121,
  },
  {
    id: 'blast',
    priority: 1,
    text: '💥 Blasting zone! When the red beacon flashes, rubble flies — keep right or hang back.',
    test: (c) => c.x > 140 && c.x < 148,
  },
  {
    id: 'crane',
    priority: 1,
    text: '⚠ Swinging crane load — time your pass or hug the road edge.',
    test: (c) => c.x > 230 && c.x < 237,
  },
  {
    id: 'traffic',
    priority: 1,
    text: '🚚 Two-way traffic! Oncoming haulers hold their lane — read it early and keep clear.',
    test: (c) => c.trafficDist < 42 && c.trafficDist > 0,
  },
]

const TOAST_SECONDS = 4.5

export default function HintSystem() {
  const phase = useGameStore((s) => s.phase)
  const runId = useGameStore((s) => s.runId)
  const [active, setActive] = useState<Hint | null>(null)
  const shown = useRef<Set<string>>(new Set())
  const flipStart = useRef<number | null>(null)
  const hideAt = useRef(0)

  // Fresh hints each run.
  useEffect(() => {
    shown.current = new Set()
    flipStart.current = null
    setActive(null)
  }, [runId])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const s = useGameStore.getState()
      const now = performance.now()

      // Track how long the truck has been upside-down and slow.
      if (telemetry.upY < -0.2 && Math.abs(telemetry.speed) < 2) {
        if (flipStart.current === null) flipStart.current = now
      } else {
        flipStart.current = null
      }

      if (active && now < hideAt.current) return
      if (active) setActive(null)

      const ctx: HintContext = {
        x: telemetry.truckX,
        recoverable: s.cargo.recoverable,
        magnetCharges: s.magnetCharges,
        inMud: telemetry.inMud,
        inPuddle: telemetry.inPuddle,
        flippedFor: flipStart.current === null ? 0 : (now - flipStart.current) / 1000,
        trafficDist: course.trafficZone.x0 - telemetry.truckX,
      }
      const eligible = HINTS.filter((h) => !shown.current.has(h.id) && h.test(ctx)).sort(
        (a, b) => b.priority - a.priority,
      )
      if (eligible.length > 0) {
        shown.current.add(eligible[0].id)
        hideAt.current = now + TOAST_SECONDS * 1000
        setActive(eligible[0])
      }
    }, 250)
    return () => clearInterval(id)
  }, [phase, active])

  if (!active || phase !== 'playing') return null
  return (
    <div className="hint-toast">
      {isTouchMode() && active.touchText ? active.touchText : active.text}
    </div>
  )
}
