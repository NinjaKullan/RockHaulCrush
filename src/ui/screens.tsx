import { useEffect, useState } from 'react'
import { gameplayTuning, scoringTuning } from '../config/gameTuning'
import { initAudio, sfx } from '../game/audio'
import { isTouchMode, requestImmersive } from '../game/device'
import { useGameStore } from '../game/store'

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
          {'☆'.repeat(3 - bestStars)} · {bestDelivered} rocks
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

/** Results for finished (delivered) and failed (timeout) runs. */
export function ResultsScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const bestStars = useGameStore((s) => s.bestStars)
  const startRun = useGameStore((s) => s.startRun)

  // Result fanfare + staggered star chimes on mount.
  useEffect(() => {
    if (!result) return
    if (phase === 'failed' || result.stars === 0) {
      sfx.fail()
      return
    }
    sfx.delivery()
    for (let n = 1; n <= result.stars; n++) {
      setTimeout(() => sfx.star(n), 500 + n * 350)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!result) return null

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
      {!timedOut && (
        <p className="results-time">
          Time remaining: {Math.floor(result.timeLeft / 60)}:
          {String(Math.floor(result.timeLeft % 60)).padStart(2, '0')}
        </p>
      )}
      {bestStars > 0 && (
        <p className="results-best">
          Best: {'★'.repeat(bestStars)}
          {'☆'.repeat(3 - bestStars)}
        </p>
      )}
      <button className="big-button" onClick={startRun} autoFocus>
        ⟲ Play Again
      </button>
    </div>
  )
}
