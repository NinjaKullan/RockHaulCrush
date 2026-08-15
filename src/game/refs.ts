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
  leanBack: false,
  leanForward: false,
}

export function resetInput() {
  input.throttle = false
  input.brake = false
  input.leanBack = false
  input.leanForward = false
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
  grounded: false,
  inMud: false,
  /** Chassis up-vector's world-y: 1 upright, -1 upside down. */
  upY: 1,
  fps: 0,
  bodyCount: 0,
  truckX: 0,
  truckY: 0,
}
