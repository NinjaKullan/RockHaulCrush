/**
 * Procedural audio via WebAudio — no asset files, no network.
 * The context is created/resumed only from a user gesture (autoplay rules):
 * call initAudio() from click/keydown handlers before expecting sound.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let engineOsc: OscillatorNode | null = null
let engineGain: GainNode | null = null
let engineFilter: BiquadFilterNode | null = null
let enabled = true

const SOUND_KEY = 'rhr-sound'

try {
  const stored = globalThis.localStorage?.getItem(SOUND_KEY)
  if (stored !== null && stored !== undefined) enabled = stored === '1'
} catch {
  /* default on */
}

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    /* non-persistent */
  }
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05)
  }
}

/** Create/resume the context. Safe to call repeatedly; must follow a gesture. */
export function initAudio(): void {
  if (!ctx) {
    const AC = globalThis.AudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = enabled ? 0.9 : 0
    master.connect(ctx.destination)

    // Engine: saw through a lowpass, silent until throttle
    engineOsc = ctx.createOscillator()
    engineOsc.type = 'sawtooth'
    engineOsc.frequency.value = 40
    engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 220
    engineGain = ctx.createGain()
    engineGain.gain.value = 0
    engineOsc.connect(engineFilter).connect(engineGain).connect(master)
    engineOsc.start()
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

/** Drive the engine tone. speed01 in [0,1]; call ~every frame while playing. */
export function setEngine(speed01: number, throttle: boolean): void {
  if (!ctx || !engineOsc || !engineGain || !engineFilter) return
  const t = ctx.currentTime
  const rpm = 38 + speed01 * 85 + (throttle ? 12 : 0)
  engineOsc.frequency.setTargetAtTime(rpm, t, 0.08)
  engineFilter.frequency.setTargetAtTime(180 + speed01 * 500, t, 0.1)
  const target = speed01 > 0.02 || throttle ? 0.05 + speed01 * 0.06 + (throttle ? 0.025 : 0) : 0
  engineGain.gain.setTargetAtTime(target, t, 0.12)
}

export function stopEngine(): void {
  if (ctx && engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
}

/** Short filtered-noise burst; the workhorse for impacts/skids/spills. */
function noiseBurst(opts: {
  duration: number
  volume: number
  filterFrom: number
  filterTo: number
  type?: BiquadFilterType
}): void {
  if (!ctx || !master) return
  const t = ctx.currentTime
  const frames = Math.floor(ctx.sampleRate * opts.duration)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = opts.type ?? 'lowpass'
  filter.frequency.setValueAtTime(opts.filterFrom, t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.filterTo), t + opts.duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(opts.volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + opts.duration)
  src.connect(filter).connect(gain).connect(master)
  src.start()
  src.stop(t + opts.duration)
}

/** Simple tone blip. */
function tone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0): void {
  if (!ctx || !master) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

export const sfx = {
  /** Hard landing / collision. intensity 0..1 */
  impact(intensity: number): void {
    noiseBurst({
      duration: 0.18 + intensity * 0.15,
      volume: 0.12 + intensity * 0.25,
      filterFrom: 400 + intensity * 500,
      filterTo: 60,
    })
  },
  /** Rocks tumbling out. */
  spill(): void {
    noiseBurst({ duration: 0.25, volume: 0.16, filterFrom: 1800, filterTo: 300, type: 'bandpass' })
  },
  skid(): void {
    noiseBurst({ duration: 0.3, volume: 0.08, filterFrom: 2400, filterTo: 900, type: 'highpass' })
  },
  magnet(): void {
    tone(520, 0.5, 0.1, 'sine')
    tone(780, 0.5, 0.07, 'sine', 0.08)
    tone(1040, 0.45, 0.05, 'sine', 0.16)
  },
  rockCaught(): void {
    tone(880, 0.12, 0.08, 'triangle')
  },
  blastWarn(): void {
    tone(940, 0.14, 0.1, 'square')
    tone(940, 0.14, 0.1, 'square', 0.22)
  },
  blast(): void {
    if (!ctx || !master) return
    noiseBurst({ duration: 0.7, volume: 0.4, filterFrom: 300, filterTo: 45 })
    tone(60, 0.6, 0.3, 'sine')
  },
  countdownBeep(final: boolean): void {
    tone(final ? 880 : 440, final ? 0.35 : 0.15, 0.12, 'square')
  },
  delivery(): void {
    tone(523, 0.18, 0.12, 'triangle')
    tone(659, 0.18, 0.12, 'triangle', 0.14)
    tone(784, 0.3, 0.14, 'triangle', 0.28)
  },
  star(n: number): void {
    tone(659 + n * 130, 0.25, 0.14, 'triangle', 0)
  },
  fail(): void {
    tone(220, 0.4, 0.14, 'sawtooth')
    tone(174, 0.5, 0.12, 'sawtooth', 0.25)
  },
}
