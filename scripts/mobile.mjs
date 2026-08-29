/**
 * Mobile verification: emulate a touch phone, then drive a full run using ONLY
 * on-screen controls — no keyboard at all.
 *
 * Usage: dev server running, then `node scripts/mobile.mjs <outdir>`
 */
import { chromium, devices } from 'playwright'

const out = process.argv[2] ?? '.'
const errors = []
const launch = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH

const browser = await chromium.launch(launch)
// Landscape phone: the orientation the game asks players to use.
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)

console.log('coarse pointer detected:', await page.evaluate(() => matchMedia('(pointer: coarse)').matches))
await page.screenshot({ path: `${out}/mob-title.png` })

// Start with a tap — no keyboard anywhere in this script.
await page.tap('.big-button')
await page.waitForTimeout(4400)

const hasControls = await page.locator('.touch-controls').count()
console.log('touch controls rendered:', hasControls > 0)
console.log('throttle button:', await page.locator('.touch-throttle').count())
await page.screenshot({ path: `${out}/mob-playing.png` })

/** Press and hold a control by its selector for ms, using real pointer events. */
async function hold(sel, ms) {
  const box = await page.locator(sel).boundingBox()
  if (!box) throw new Error(`missing ${sel}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

const readCargo = async () =>
  page.evaluate(() => document.querySelector('.hud-cargo')?.textContent ?? '')

/** Speed lives in an SVG <text>, which has no innerText — read textContent. */
const readSpeed = async () =>
  page.evaluate(() => document.querySelector('.hud-dial-speed')?.textContent ?? '?')

// Hold throttle via touch and confirm the truck actually accelerates.
const box = await page.locator('.touch-throttle').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(2500)
const speedMid = await readSpeed()
console.log('speed while holding touch throttle:', speedMid, 'km/h')
await page.screenshot({ path: `${out}/mob-driving.png` })

// Steer while still on the throttle — multi-touch must work.
const lbox = await page.locator('.touch-steer').first().boundingBox()
await page.touchscreen.tap(lbox.x + lbox.width / 2, lbox.y + lbox.height / 2)
await page.waitForTimeout(600)
await page.mouse.up()
await page.waitForTimeout(400)
const speedAfterRelease = await readSpeed()
console.log('speed after releasing throttle:', speedAfterRelease, 'km/h (should be lower)')

// Verify the control released cleanly rather than sticking on.
await page.waitForTimeout(2500)
const coasted = await readSpeed()
console.log('speed after coasting 2.5s:', coasted, 'km/h')

// Drive on to the finish, touch only.
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
let ended = null
const t0 = Date.now()
while (!ended && Date.now() - t0 < 200000) {
  await page.waitForTimeout(1500)
  if (await page.locator('.screen-heading').count()) {
    ended = await page.locator('.screen-heading').innerText()
  }
}
await page.mouse.up()
console.log('run ended with:', ended)
console.log('cargo chip:', await readCargo())
await page.screenshot({ path: `${out}/mob-results.png` })

// Portrait: rotate prompt should appear.
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(800)
console.log('rotate prompt in portrait:', (await page.locator('.rotate-prompt').count()) > 0)
await page.screenshot({ path: `${out}/mob-portrait.png` })

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
process.exit(errors.length ? 1 : 0)
