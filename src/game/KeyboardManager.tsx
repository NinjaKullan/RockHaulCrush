import { useEffect } from 'react'
import { input, resetInput } from './refs'
import { useGameStore } from './store'

/** Codes we own — their browser defaults (scrolling etc.) are suppressed. */
const HANDLED = new Set([
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyR',
  'Backquote',
])

/** Installs global keyboard handlers. Renders nothing. */
export default function KeyboardManager() {
  useEffect(() => {
    const setKey = (code: string, pressed: boolean): void => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          input.throttle = pressed
          break
        case 'KeyS':
        case 'ArrowDown':
          input.brake = pressed
          break
        case 'KeyA':
        case 'ArrowLeft':
          input.leanBack = pressed
          break
        case 'KeyD':
        case 'ArrowRight':
          input.leanForward = pressed
          break
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (HANDLED.has(e.code)) e.preventDefault()
      if (e.repeat) return
      setKey(e.code, true)
      if (e.code === 'KeyR') useGameStore.getState().restart()
      if (e.code === 'Backquote') useGameStore.getState().toggleDebug()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (HANDLED.has(e.code)) e.preventDefault()
      setKey(e.code, false)
    }
    const onBlur = () => resetInput()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      resetInput()
    }
  }, [])

  return null
}
