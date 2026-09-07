/**
 * Marketing capture: staged screenshots of the best moments plus a frame
 * sequence for a GIF. Dev server must be running (uses the dev-only
 * window.__rhr handle). Usage: node scripts/capture.mjs <outdir>
 */
import { mkdirSync } from 'node:fs'
import { chromium, devices } from 'playwright'

const out = process.argv[2] ?? 'capture'
mkdirSync(`${out}/frames`, { recursive: true })
const launch = {
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}
const browser = await chromium.launch(launch)

const CAREER = () => {
  localStorage.setItem('rhr-career-rocks', '310')
  localStorage.setItem('rhr-career-runs', '14')
  localStorage.setItem('rhr-best-score', '5240')
  localStorage.setItem('rhr-best-stars', '3')
  localStorage.setItem('rhr-best-delivered', '20')
  localStorage.setItem('rhr-paint', 'fire')
}

async function newPage(opts) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  await page.addInitScript(CAREER)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return page
}
const truckX = (page) => page.evaluate(() => window.__rhr.telemetry.truckX)
const speed = (page) => page.evaluate(() => Math.abs(window.__rhr.telemetry.speed))
const startRun = async (page) => {
  await page.click('.big-button')
  await page.waitForTimeout(4300)
}
/** Full throttle until the truck passes x, then release. */
async function driveTo(page, x) {
  await page.keyboard.down('KeyW')
  while ((await truckX(page)) < x) await page.waitForTimeout(60)
  await page.keyboard.up('KeyW')
}
async function brakeToStop(page) {
  await page.keyboard.down('KeyS')
  while ((await speed(page)) > 0.6) await page.waitForTimeout(60)
  await page.keyboard.up('KeyS')
}
const shot = (page, name, opts = {}) => page.screenshot({ path: `${out}/${name}.png`, ...opts })

// ---------- Desktop hero shots (1280×720 @2x → 2560×1440)
{
  const page = await newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
  await shot(page, '01-title')

  await startRun(page)
  // Barrel gauntlet: a few frames, keep the best-looking later.
  await page.keyboard.down('KeyW')
  for (let i = 0; i < 6; i++) {
    while ((await truckX(page)) < 14 + i * 5) await page.waitForTimeout(50)
    await shot(page, `02-barrels-${i}`)
  }
  await page.keyboard.up('KeyW')

  // Train: arm at x=70, coast, brake before the gate, catch the train passing.
  await driveTo(page, 84)
  await brakeToStop(page)
  await page.waitForTimeout(2200)
  for (let i = 0; i < 4; i++) {
    await shot(page, `03-train-${i}`)
    await page.waitForTimeout(700)
  }
  await page.waitForTimeout(2500)

  // Blast: arm at x=123, stop short of the face, catch detonation.
  await driveTo(page, 128)
  await brakeToStop(page)
  await page.waitForTimeout(600)
  for (let i = 0; i < 5; i++) {
    await shot(page, `04-blast-${i}`)
    await page.waitForTimeout(450)
  }

  // Traffic: arm at x=254; stop inside the zone and let a hauler come at us.
  await driveTo(page, 296)
  await brakeToStop(page)
  for (let i = 0; i < 6; i++) {
    await shot(page, `05-traffic-${i}`)
    await page.waitForTimeout(600)
  }

  // Weighbridge + results: park on the pad, then stage a perfect delivery.
  await driveTo(page, 340)
  await brakeToStop(page)
  await page.evaluate(() => window.__rhr.store.getState().finish(20))
  await page.waitForTimeout(1300)
  await shot(page, '06-weighbridge')
  await page.locator('.screen-heading').waitFor({ timeout: 8000 })
  await page.waitForTimeout(2600)
  await shot(page, '07-results')
  await page.context().close()
}

// ---------- Phone shot (iPhone 13 landscape, touch controls)
{
  const page = await newPage({ ...devices['iPhone 13 landscape'], hasTouch: true })
  await startRun(page)
  await page.locator('.touch-throttle').dispatchEvent('pointerdown')
  while ((await truckX(page)) < 24) await page.waitForTimeout(50)
  await shot(page, '08-phone')
  await page.context().close()
}

// ---------- GIF frames (960×540): start through the barrel gauntlet and first climb
{
  const page = await newPage({ viewport: { width: 960, height: 540 } })
  await page.click('.big-button')
  await page.waitForTimeout(3400) // last beat of the countdown in frame
  await page.keyboard.down('KeyW')
  let i = 0
  const t0 = Date.now()
  while (Date.now() - t0 < 26000 && (await truckX(page)) < 92) {
    await page.screenshot({ path: `${out}/frames/f${String(i++).padStart(3, '0')}.png` })
    // A gentle weave keeps the truck threading barrels instead of eating them.
    const phase = Math.floor((Date.now() - t0) / 1800) % 3
    await page.keyboard.up('KeyA')
    await page.keyboard.up('KeyD')
    if (phase === 1) await page.keyboard.down('KeyA')
    if (phase === 2) await page.keyboard.down('KeyD')
  }
  console.log('gif frames:', i)
  await page.context().close()
}

await browser.close()
console.log('done')
