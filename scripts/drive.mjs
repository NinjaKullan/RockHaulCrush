/**
 * Headless drive test for Checkpoint 1: loads the game, verifies the rocks
 * settle in the bed, drives the course with held keys, screenshots along the
 * way, restarts, and fails on console errors.
 *
 * Usage: dev server running, then `node scripts/drive.mjs <outdir>`
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
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500) // let rocks settle into the bed

const hudCargo = () => page.locator('.hud-cargo').innerText()
console.log('cargo at spawn:', await hudCargo())
await page.screenshot({ path: `${outdir}/drive-0-spawn.png` })

// Drive forward across the rough section
await page.keyboard.down('KeyW')
await page.waitForTimeout(2600)
await page.screenshot({ path: `${outdir}/drive-1-rough.png` })
console.log('cargo after rough:', await hudCargo())

// Keep driving up the hill
await page.waitForTimeout(2600)
await page.screenshot({ path: `${outdir}/drive-2-hill.png` })
console.log('cargo after hill:', await hudCargo())

// Continue toward the ramp
await page.waitForTimeout(3200)
await page.screenshot({ path: `${outdir}/drive-3-ramp.png` })
console.log('cargo near ramp:', await hudCargo())

await page.waitForTimeout(2500)
await page.keyboard.up('KeyW')
await page.screenshot({ path: `${outdir}/drive-4-end.png` })
console.log('cargo at end:', await hudCargo())

// Restart and verify recovery
await page.keyboard.press('KeyR')
await page.waitForTimeout(2000)
await page.screenshot({ path: `${outdir}/drive-5-restart.png` })
console.log('cargo after restart:', await hudCargo())

// Restart 3 more times quickly to check for duplication/corruption
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('KeyR')
  await page.waitForTimeout(700)
}
await page.screenshot({ path: `${outdir}/drive-6-multi-restart.png` })
console.log('cargo after 4x restart:', await hudCargo())

// Debug overlay
await page.keyboard.press('Backquote')
await page.waitForTimeout(500)
await page.screenshot({ path: `${outdir}/drive-7-debug.png` })
const debugText = await page.locator('.debug-overlay').innerText()
console.log('debug overlay:\n' + debugText)

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
if (errors.length) process.exit(1)
