import { useEffect, useState } from 'react'
import { gameplayTuning, scoringTuning } from '../config/gameTuning'
import { useGameStore } from '../game/store'

/** Title screen with start action, tutorial blurb, and best result. */
export function TitleScreen() {
  const startRun = useGameStore((s) => s.startRun)
  const bestStars = useGameStore((s) => s.bestStars)
  const bestDelivered = useGameStore((s) => s.bestDelivered)
  return (
    <div className="screen screen-title">
      <h1 className="game-title">Rock Haul Rush</h1>
      <p className="game-tagline">Keep the wheels down and the rocks in!</p>
      <button className="big-button" onClick={startRun} autoFocus>
        ▶ Start Hauling
      </button>
      <div className="title-tutorial">
        <p>
          Haul <b>20 rocks</b> to the delivery zone before time runs out.
          Deliver <b>{scoringTuning.starThresholds[0]}+</b> to score —{' '}
          <b>{scoringTuning.starThresholds[2]}</b> for three stars.
        </p>
        <p className="controls-line">
          <b>W/↑</b> drive · <b>S/↓</b> brake/reverse · <b>A/←</b> lean back ·{' '}
          <b>D/→</b> lean forward · <b>Space</b> cargo magnet · <b>R</b> recover ·{' '}
          <b>Esc</b> pause
        </p>
      </div>
      {bestStars > 0 && (
        <div className="title-best">
          Best: {'★'.repeat(bestStars)}
          {'☆'.repeat(3 - bestStars)} · {bestDelivered} rocks
        </div>
      )}
    </div>
  )
}

/** 3-2-1-GO countdown; hands control to the player when it ends. */
export function CountdownOverlay() {
  const beginPlaying = useGameStore((s) => s.beginPlaying)
  const [count, setCount] = useState<number>(gameplayTuning.countdownSeconds)

  useEffect(() => {
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
      <p className="controls-line">
        <b>W/↑</b> drive · <b>S/↓</b> brake/reverse · <b>A/←</b> lean back · <b>D/→</b> lean
        forward · <b>Space</b> magnet · <b>R</b> recover · <b>Esc</b> resume
      </p>
    </div>
  )
}

/** Results for finished (delivered) and failed (timeout) runs. */
export function ResultsScreen() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.result)
  const bestStars = useGameStore((s) => s.bestStars)
  const startRun = useGameStore((s) => s.startRun)
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
          <span key={n} className={result.stars >= n ? 'star-earned' : 'star-empty'}>
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
