import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './game/store'
import { cargo, gameRefs, telemetry } from './game/refs'

// Dev-only handle for the Playwright capture/verification scripts in scripts/.
if (import.meta.env.DEV) {
  ;(window as unknown as { __rhr: unknown }).__rhr = { store: useGameStore, telemetry, cargo, gameRefs }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
