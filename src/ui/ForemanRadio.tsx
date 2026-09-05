import { useEffect, useRef, useState } from 'react'
import { sfx } from '../game/audio'
import { blastZone, course, trainCrossing } from '../game/levels/quarryRun'
import { runStats, telemetry } from '../game/refs'
import { useGameStore } from '../game/store'

/**
 * The foreman on the radio. Personality, not tutorial: short lines that react
 * to what the driver just did. Each fires once per run; a global cooldown
 * keeps him from talking over himself.
 */

interface RadioCtx {
  x: number
  elapsed: number
  inBed: number
  recoverable: number
  streak: number
  nearMisses: number
  recoveries: number
  timeLeft: number
  finishX: number
}

interface RadioLine {
  id: string
  text: string
  test: (c: RadioCtx) => boolean
}

const LINES: RadioLine[] = [
  {
    id: 'start',
    text: "Shift's on. Twenty rocks to the plant — keep 'em in the bed.",
    test: (c) => c.elapsed > 1.2,
  },
  {
    id: 'spill',
    text: 'Rocks over the side! Magnet’s on the dash if you want them back.',
    test: (c) => c.recoverable >= 2,
  },
  {
    id: 'streak2',
    text: 'Two clean sections. That’s how a pro hauls.',
    test: (c) => c.streak >= 2,
  },
  {
    id: 'streak4',
    text: 'Four clean. Are your wheels even touching the road?',
    test: (c) => c.streak >= 4,
  },
  {
    id: 'near3',
    text: 'Three close calls. My heart can’t take this, driver.',
    test: (c) => c.nearMisses >= 3,
  },
  {
    id: 'blast',
    text: 'Shot firing on the face ahead! Keep your head down.',
    test: (c) => c.x > blastZone.x - 34 && c.x < blastZone.x - 10,
  },
  {
    id: 'train',
    text: 'Crossing’s live — don’t race the train. Or do. I’m not your mother.',
    test: (c) => c.x > trainCrossing.x - 48 && c.x < trainCrossing.x - 20,
  },
  {
    id: 'traffic',
    text: 'Empty haulers coming out. Hold your lane and don’t blink.',
    test: (c) => c.x > course.trafficZone.x0 - 36 && c.x < course.trafficZone.x0 - 10,
  },
  {
    id: 'recovery',
    text: 'Recovery crew’s out. That costs us minutes, you know.',
    test: (c) => c.recoveries >= 1,
  },
  {
    id: 'half',
    text: 'Halfway there. The crusher’s hungry.',
    test: (c) => c.x > c.finishX * 0.5,
  },
  {
    id: 'plant',
    text: 'There’s the plant. Ease it onto the weighbridge.',
    test: (c) => c.x > c.finishX - 42,
  },
  {
    id: 'time',
    text: 'Twenty seconds! Foot down, driver!',
    test: (c) => c.timeLeft < 20 && c.timeLeft > 0,
  },
  {
    id: 'empty',
    text: 'Bed’s empty. The plant can’t weigh good intentions.',
    test: (c) => c.inBed === 0 && c.elapsed > 5,
  },
]

const SHOW_SECONDS = 4.2
const COOLDOWN_SECONDS = 7

export default function ForemanRadio() {
  const phase = useGameStore((s) => s.phase)
  const runId = useGameStore((s) => s.runId)
  const [active, setActive] = useState<RadioLine | null>(null)
  const said = useRef<Set<string>>(new Set())
  const startedAt = useRef(0)
  const hideAt = useRef(0)
  const nextAllowedAt = useRef(0)

  useEffect(() => {
    said.current = new Set()
    startedAt.current = 0
    nextAllowedAt.current = 0
    setActive(null)
  }, [runId])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const now = performance.now()
      if (!startedAt.current) startedAt.current = now
      if (active && now < hideAt.current) return
      if (active) setActive(null)
      if (now < nextAllowedAt.current) return

      const s = useGameStore.getState()
      const ctx: RadioCtx = {
        x: telemetry.truckX,
        elapsed: (now - startedAt.current) / 1000,
        inBed: s.cargo.inBed,
        recoverable: s.cargo.recoverable,
        streak: s.streak,
        nearMisses: runStats.nearMisses,
        recoveries: runStats.recoveries,
        timeLeft: s.timeLeft,
        finishX: course.deliveryZone.finishX,
      }
      const line = LINES.find((l) => !said.current.has(l.id) && l.test(ctx))
      if (!line) return
      said.current.add(line.id)
      hideAt.current = now + SHOW_SECONDS * 1000
      nextAllowedAt.current = hideAt.current + COOLDOWN_SECONDS * 1000
      sfx.radio()
      setActive(line)
    }, 250)
    return () => clearInterval(id)
  }, [phase, active])

  if (!active || phase !== 'playing') return null
  return (
    <div className="radio-toast" key={active.id}>
      <span className="radio-tag">📻 FOREMAN</span>
      <span className="radio-text">{active.text}</span>
    </div>
  )
}
