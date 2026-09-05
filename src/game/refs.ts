import type { RapierRigidBody } from '@react-three/rapier'
import type { RockState } from './cargoRules'

/**
 * Mutable cross-component channels that change every frame.
 * These deliberately bypass React state — writing them 60×/s must not re-render.
 * UI reads them on a slow interval; game systems read them directly.
 */

/** Player input state, written by KeyboardManager, read by TruckController. */
export const input = {
  throttle: false,
  brake: false,
  steerLeft: false,
  steerRight: false,
}

export function resetInput() {
  input.throttle = false
  input.brake = false
  input.steerLeft = false
  input.steerRight = false
}

/** Live handles to physics objects, set on mount and cleared on unmount. */
export const gameRefs: { truck: RapierRigidBody | null } = { truck: null }

/** Cargo runtime state, owned by Rocks.tsx; read by GameDirector. */
export const cargo = {
  states: [] as RockState[],
  bodies: [] as (RapierRigidBody | null)[],
  /** Truck-local bed offsets used at spawn — reused when recovery re-seats cargo. */
  bedOffsets: [] as [number, number, number][],
}

/** Magnet runtime: remaining active seconds, decremented inside physics steps. */
export const magnet = { remaining: 0 }

/** Per-frame telemetry for HUD and the debug overlay. */
export const telemetry = {
  speed: 0,
  /** Smoothed longitudinal acceleration, m/s² (+ = accelerating, − = braking). */
  accel: 0,
  grounded: false,
  inMud: false,
  inPuddle: false,
  /** Chassis up-vector's world-y: 1 upright, -1 upside down. */
  upY: 1,
  fps: 0,
  bodyCount: 0,
  truckX: 0,
  truckY: 0,
}

/** Floating HUD popups ("CLOSE CALL +75"). Pushed by game systems, drained by the HUD. */
export type PopupKind = 'near' | 'section' | 'perfect' | 'info'
export interface Popup {
  id: number
  text: string
  kind: PopupKind
}
export const popupQueue: Popup[] = []
let popupSeq = 0
export function pushPopup(text: string, kind: PopupKind = 'info'): void {
  popupQueue.push({ id: ++popupSeq, text, kind })
}

/** Per-run statistics shown on the results screen. */
export const runStats = {
  nearMisses: 0,
  cleanSections: 0,
  recoveries: 0,
  bestStreak: 0,
  /** m/s */
  topSpeed: 0,
}
export function resetRunStats(): void {
  runStats.nearMisses = 0
  runStats.cleanSections = 0
  runStats.recoveries = 0
  runStats.bestStreak = 0
  runStats.topSpeed = 0
}

/** Camera shake amplitude (meters); systems add, the camera rig decays it. */
export const cameraShake = { amp: 0 }
export function shakeCamera(amount: number): void {
  cameraShake.amp = Math.min(0.6, cameraShake.amp + amount)
}

/** Player horn: when it was last sounded, so nearby haulers can answer. */
export const horn = { lastAt: -10, answeredAt: -10 }
