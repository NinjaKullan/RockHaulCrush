import { useEffect, useRef, useState } from 'react'
import { gameplayTuning, scoreTuning, scoringTuning, weighbridgeTuning } from '../config/gameTuning'
import { initAudio, sfx } from '../game/audio'
import { isTouchMode, requestImmersive } from '../game/device'
import { useGameStore, type RunResult } from '../game/store'
import { formatScore } from '../game/scoring'

/** Describes whichever control scheme this device actually has. */
function ControlsLine() {
  if (isTouchMode()) {
    return (
      <p className="controls-line">
        <b>▲</b> drive · <b>▼</b> brake · <b>◀ ▶</b> steer · <b>🧲</b> cargo magnet ·{' '}
        <b>⟲</b> recover · <b>⏸</b> pause
      </p>
    )
  }
  return (
    <p className="controls-line">
      <b>W/↑</b> drive · <b>S/↓</b> brake/reverse · <b>A/←</b> steer left · <b>D/→</b> steer
      right · <b>Space</b> magnet · <b>R</b> recover · <b>Esc</b> pause
    </p>
  )
}

/** Sound + reduced-motion toggles, shared by title and pause screens. */
function SettingsRow() {
  const soundOn = useGameStore((s) => s.soundOn)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const toggleSound = useGameStore((s) => s.toggleSound)
  const toggleReducedMotion = useGameStore((s) => s.toggleReducedMotion)
  return (
    <div className="settings-row">
      <button
        className="mid-button"
        onClick={() => {
          initAudio()
          toggleSound()
        }}
      >
        {soundOn ? '🔊 Sound on' : '🔇 Sound off'}
      </button>
      <button className="mid-button" onClick={toggleReducedMotion}>
        {reducedMotion ? '🐢 Reduced motion' : '🎢 Full motion'}
      </button>
    </div>
  )
}

/** Title screen with start action, track selection, tutorial, and best result. */
export function TitleScreen() {
  const startRun = useGameStore((s) => s.startRun)
  const bestStars = useGameStore((s) => s.bestStars)
  const bestDelivered = useGameStore((s) => s.bestDelivered)
  const bestScore = useGameStore((s) => s.bestScore)
  const trackKind = useGameStore((s) => s.trackKind)
  const selectTrack = useGameStore((s) => s.selectTrack)
  return (
    <div className="screen screen-title">
      <h1 className="game-title">Rock Haul Rush</h1>
      <p className="game-tagline">Keep the wheels down and the rocks in!</p>
      <div className="track-row">
        <button
          className={`track-button${trackKind === 'standard' ? ' track-active' : ''}`}
          onClick={() => selectTrack('standard')}
        >
          Standard Run
          <span className="track-sub">~380 m · 2:10</span>
        </button>
        <button
          className={`track-button${trackKind === 'long' ? ' track-active' : ''}`}
          onClick={() => selectTrack('long')}
        >
          Long Haul
          <span className="track-sub">~460 m · 3:05</span>
        </button>
      </div>
      <button
        className="big-button"
        onClick={() => {
          initAudio()
          void requestImmersive()
          startRun()
        }}
        autoFocus
      >
        ▶ Start Hauling
      </button>
      <div className="title-tutorial">
        <p>
          Haul <b>20 rocks</b> to the delivery zone before time runs out.
          Deliver <b>{scoringTuning.starThresholds[0]}+</b> to score —{' '}
          <b>{scoringTuning.starThresholds[2]}</b> for three stars.
        </p>
        <p>
          <b>Steer around</b> barrels, barriers, and falling rocks — and time the swinging
          crane. Spilled rocks aren't gone: drive close and use the{' '}
          <b>Cargo Magnet</b> to pull them back aboard (3 charges).
        </p>
        <ControlsLine />
      </div>
      {bestStars > 0 && (
        <div className="title-best">
          Best: {'★'.repeat(bestStars)}
          {'☆'.repeat(3 - bestStars)} · {bestDelivered} rocks · {formatScore(bestScore)} pts
        </div>
      )}
      <CareerLine />
      <SettingsRow />
    </div>
  )
}

/** Lifetime tally — quietly does a lot of "one more run" work. */
function CareerLine() {
  const careerRocks = useGameStore((s) => s.careerRocks)
  const careerRuns = useGameStore((s) => s.careerRuns)
  if (careerRuns === 0) return null
  return (
    <div className="career-line">
      Career: {careerRocks} rocks hauled · {careerRuns} run{careerRuns === 1 ? '' : 's'}
    </div>
  )
}

/** 3-2-1-GO countdown; hands control to the player when it ends. */
export function CountdownOverlay() {
  const beginPlaying = useGameStore((s) => s.beginPlaying)
  const [count, setCount] = useState<number>(gameplayTuning.countdownSeconds)

  useEffect(() => {
    sfx.countdownBeep(count <= 0)
    if (count <= 0) {
      const go = setTimeout(beginPlaying, 450)
      return () => clearTimeout(go)
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [count, beginPlaying])

  return (
    <div className="screen screen-transparent">
      <div className="countdown-number" key={count}>
        {count > 0 ? count : 'GO!'}
      </div>
      <div className="countdown-hint">Reach the delivery zone — don't lose the rocks!</div>
    </div>
  )
}

/** Pause overlay with resume/restart and the controls reference. */
export function PauseMenu() {
  const resume = useGameStore((s) => s.resume)
  const startRun = useGameStore((s) => s.startRun)
  return (
    <div className="screen screen-dim">
      <h2 className="screen-heading">Paused</h2>
      <button className="big-button" onClick={resume} autoFocus>
        ▶ Resume
      </button>
      <button className="mid-button" onClick={startRun}>
        ⟲ Restart Run
      </button>
      <ControlsLine />
      <SettingsRow />
    </div>
  )
}

/** Counts a number up from 0 to `to` over `ms` milliseconds. */
function useCountUp(to: number, ms: number, delayMs: number): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const k = Math.min(1, (now - start) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    const id = setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      clearTimeout(id)
      cancelAnimationFrame(raf)
    }
  }, [to, ms, delayMs])
  return v
}

/** Haul Score breakdown: rows land one by one, the total counts up. */
function ScoreBreakdownView({ result }: { result: RunResult }) {
  const b = result.score
  const rows: { label: string; value: number; hot?: boolean }[] = [
    { label: `Rocks delivered ${result.delivered} × ${scoreTuning.rockValue}`, value: b.rocks },
    { label: 'Time bonus', value: b.timeBonus },
    {
      label: `Driving · ${result.nearMisses} close call${result.nearMisses === 1 ? '' : 's'}, ${result.cleanSections} clean section${result.cleanSections === 1 ? '' : 's'}`,
      value: b.driving,
    },
  ]
  if (b.perfect > 0) rows.push({ label: 'PERFECT HAUL', value: b.perfect, hot: true })
  const total = useCountUp(b.total, 1100, 300 + rows.length * 220)
  return (
    <div className="score-card">
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={`score-row${r.hot ? ' score-row-hot' : ''}`}
          style={{ animationDelay: `${0.25 + i * 0.22}s` }}
        >
          <span>{r.label}</span>
          <span className="score-row-value">+{formatScore(r.value)}</span>
        </div>
      ))}
      <div className="score-total">
        <span>HAUL SCORE</span>
        <span className="score-total-value">{formatScore(total)}</span>
      </div>
      {result.newBest && <div className="score-newbest">NEW BEST!</div>}
    </div>
  )
}

/**
 * Weighbridge moment: the truck sits on the scale while the readout ticks up
 * to the delivered tonnage, then the results land.
 */
function WeighOverlay({ delivered, onDone }: { delivered: number; onDone: () => void }) {
  const target = delivered * weighbridgeTuning.tonnesPerRock
  const ms = weighbridgeTuning.weighSeconds * 1000
  const tonnes = useCountUp(Math.round(target * 10), ms, 250) / 10
  const lastTick = useRef(-1)

  useEffect(() => {
    const t = Math.floor(tonnes)
    if (t !== lastTick.current) {
      lastTick.current = t
      if (t > 0) sfx.weighTick()
    }
  }, [tonnes])

  useEffect(() => {
    const id = setTimeout(() => {
      sfx.weighDone()
      onDone()
    }, ms + 900)
    return () => clearTimeout(id)
  }, [ms, onDone])

  return (
    <div className="screen screen-transparent">
      <div className="weigh-card">
        <div className="weigh-label">WEIGHBRIDGE</div>
        <div className="weigh-value">
          {tonnes.toFixed(1)}
          <span className="weigh-unit"> t</span>
        </div>
        <div className="weigh-sub">
          {delivered} of {scoringTuning.totalRocks} rocks on the scale
        </div>
      </div>
    </div>
  )
}

/** Results for finished (delivered) and failed (timeout) runs. */
export function ResultsScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const bestStars = useGameStore((s) => s.bestStars)
  const bestScore = useGameStore((s) => s.bestScore)
  const startRun = useGameStore((s) => s.startRun)
  const [weighed, setWeighed] = useState(phase !== 'finished')

  // Result fanfare + staggered star chimes once the load has been weighed.
  useEffect(() => {
    if (!result || !weighed) return
    if (phase === 'failed' || result.stars === 0) {
      sfx.fail()
      return
    }
    sfx.delivery()
    for (let n = 1; n <= result.stars; n++) {
      setTimeout(() => sfx.star(n), 500 + n * 350)
    }
    if (result.score.perfect > 0) setTimeout(() => sfx.perfect(), 1700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weighed])

  if (!result) return null
  if (!weighed) return <WeighOverlay delivered={result.delivered} onDone={() => setWeighed(true)} />

  const timedOut = phase === 'failed'
  const failedDelivery = !timedOut && result.stars === 0
  const heading = timedOut
    ? "Time's Up!"
    : failedDelivery
      ? 'Delivery Rejected'
      : 'Delivery Complete!'
  const sub = timedOut
    ? 'The quarry needs those rocks faster.'
    : failedDelivery
      ? `Fewer than ${scoringTuning.starThresholds[0]} rocks made it — the foreman is not impressed.`
      : `${result.delivered} of ${scoringTuning.totalRocks} rocks delivered`

  return (
    <div className="screen screen-dim">
      <h2 className="screen-heading">{heading}</h2>
      <div className={`stars-row${result.stars > 0 ? '' : ' stars-none'}`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={result.stars >= n ? 'star-earned star-pop' : 'star-empty'}
            style={result.stars >= n ? { animationDelay: `${0.5 + n * 0.35}s` } : undefined}
          >
            {result.stars >= n ? '★' : '☆'}
          </span>
        ))}
      </div>
      <p className="results-sub">{sub}</p>
      <ScoreBreakdownView result={result} />
      <p className="results-time">
        {!timedOut && (
          <>
            Time left {Math.floor(result.timeLeft / 60)}:
            {String(Math.floor(result.timeLeft % 60)).padStart(2, '0')} ·{' '}
          </>
        )}
        Top speed {result.topSpeed} km/h
        {result.recoveries > 0 && ` · ${result.recoveries} recover${result.recoveries === 1 ? 'y' : 'ies'}`}
      </p>
      {(bestStars > 0 || bestScore > 0) && (
        <p className="results-best">
          Best: {bestStars > 0 && `${'★'.repeat(bestStars)}${'☆'.repeat(3 - bestStars)} · `}
          {formatScore(bestScore)} pts
        </p>
      )}
      <button className="big-button" onClick={startRun} autoFocus>
        ⟲ Play Again
      </button>
    </div>
  )
}
