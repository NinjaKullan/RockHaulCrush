/**
 * Checkpoint 2 end-to-end: title → countdown → drive the course with
 * magnet/recovery/pause along the way → delivery → results → replay.
 *
 * Usage: dev server running, then `node scripts/fullrun.mjs <outdir>`
 */
import { chromium } from 'playwright'

const outdir = process.argv[2] ?? '.'
const errors = []
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH

const browser = await chromium.launch(launchOptions)
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const shot = (name) => page.screenshot({ path: `${outdir}/${name}.png` })
const text = async (sel) => (await page.locator(sel).count()) ? page.locator(sel).first().innerText() : '(absent)'

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 1. Title
console.log('title heading:', await text('.game-title'))
await shot('e2e-1-title')

// 2. Start → countdown
await page.click('.big-button')
await page.waitForTimeout(800)
console.log('countdown shows:', await text('.countdown-number'))
await shot('e2e-2-countdown')
await page.waitForTimeout(3200) // through GO

// 3. Drive; enable debug overlay for position tracking
await page.keyboard.press('Backquote')
await page.keyboard.down('KeyW')
await page.waitForTimeout(6000)
console.log('--- after 6s driving')
console.log(await text('.debug-overlay'))
console.log('hud cargo:', await text('.hud-cargo'), '| timer:', await text('.hud-timer'))
await shot('e2e-3-driving')

// 4. First jump happens around x≈86; keep driving through it
await page.waitForTimeout(5000)
console.log('--- after first jump zone')
console.log('hud cargo:', await text('.hud-cargo'))

// 5. Stop, then magnet (may recover jump-spilled rocks nearby)
await page.keyboard.up('KeyW')
await page.waitForTimeout(1200)
await page.keyboard.press('Space')
await page.waitForTimeout(600)
console.log('magnet indicator:', await text('.hud-magnet'))
await shot('e2e-4-magnet')
await page.waitForTimeout(2500)
console.log('cargo after magnet:', await text('.hud-cargo'))

// 6. Recovery: teleports back to latest checkpoint with time penalty
console.log('--- before recovery:', (await text('.debug-overlay')).split('\n')[4])
await page.keyboard.press('KeyR')
await page.waitForTimeout(600)
console.log('--- after recovery:', (await text('.debug-overlay')).split('\n')[4])
console.log('timer after penalty:', await text('.hud-timer'))
await shot('e2e-5-recovered')

// 7. Pause / resume
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
console.log('pause heading:', await text('.screen-heading'))
await shot('e2e-6-paused')
const pausedTimer = await text('.hud-timer')
await page.waitForTimeout(1500)
console.log('timer frozen while paused:', pausedTimer === (await text('.hud-timer')))
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// 8. Drive to the finish (long haul), snapshotting the late-course hazards
await page.keyboard.down('KeyW')
const lateShots = [
  { x: 238, name: 'e2e-late-crane', done: false },
  { x: 249, name: 'e2e-late-mud', done: false },
]
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000)
  const dbg = await text('.debug-overlay')
  const line = dbg.split('\n').find((l) => l.startsWith('truck:')) ?? '?'
  const phase = dbg.split('\n').find((l) => l.startsWith('phase:')) ?? '?'
  console.log(`t+${(i + 1) * 5}s  ${line}  ${phase}`)
  const x = parseFloat(line.replace('truck: ', ''))
  for (const s of lateShots) {
    if (!s.done && x >= s.x) {
      s.done = true
      await shot(s.name)
    }
  }
  if (phase.includes('finished') || phase.includes('failed')) break
}
await page.keyboard.up('KeyW')
await page.waitForTimeout(800)
console.log('results heading:', await text('.screen-heading'))
console.log('results sub:', await text('.results-sub'))
console.log('stars row:', await text('.stars-row'))
await shot('e2e-7-results')

// 9. Replay → clean new run
await page.click('.big-button')
await page.waitForTimeout(4500) // countdown
console.log('--- after replay start')
console.log('hud cargo:', await text('.hud-cargo'))
console.log(await text('.debug-overlay'))
await shot('e2e-8-replay')

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
if (errors.length) process.exit(1)
