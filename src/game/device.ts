/**
 * Touch/mobile detection and the quality tier that follows from it.
 *
 * Detection is deliberately two-stage: an initial guess from the pointer media
 * query, then a hard confirmation on the first real touch event. That way a
 * desktop browser never shows touch controls, and a device the media query
 * misreads still gets them the moment the player taps.
 */

let touchMode = false
try {
  touchMode = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
} catch {
  touchMode = false
}

const listeners = new Set<(on: boolean) => void>()

export function isTouchMode(): boolean {
  return touchMode
}

export function onTouchModeChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function enableTouchMode() {
  if (touchMode) return
  touchMode = true
  for (const fn of listeners) fn(true)
}

/** Confirm touch mode on the first real touch, whatever the media query said. */
export function installTouchProbe(): () => void {
  const onTouch = () => enableTouchMode()
  window.addEventListener('touchstart', onTouch, { passive: true, once: true })
  return () => window.removeEventListener('touchstart', onTouch)
}

/** Quality tier — mobile GPUs get a cheaper frame; desktop is unchanged. */
export const quality = {
  get maxPixelRatio(): number {
    return touchMode ? 1.5 : 2
  },
  get shadowMapSize(): number {
    return touchMode ? 1024 : 2048
  },
  get particleScale(): number {
    return touchMode ? 0.6 : 1
  },
}

/** Best-effort immersive mode on Start: fullscreen, then landscape lock. */
export async function requestImmersive(): Promise<void> {
  if (!touchMode) return
  try {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>
    }
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    }
  } catch {
    /* iOS Safari refuses fullscreen on non-video elements — fine, carry on */
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>
    }
    await orientation?.lock?.('landscape')
  } catch {
    /* unsupported (iOS) or refused — the rotate prompt covers this case */
  }
}
