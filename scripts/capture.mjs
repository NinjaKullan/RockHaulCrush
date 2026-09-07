/**
 * Marketing capture: staged screenshots of the best moments plus a frame
 * sequence for a GIF/MP4. Dev server must be running (uses the dev-only
 * window.__rhr handle). Usage: node scripts/capture.mjs <outdir>
 *
 * Software rendering manages roughly one screenshot per second, so the page's
 * clock is slowed (performance.now scaled) — the game then advances only a
 * fraction of a second between frames and hero moments can be timed exactly.
 */
import { mkdirSync } from 'node:fs'
import { chromium, devices } from 'playwright'

const out = process.argv[2] ?? 'capture'
const segments = new Set((process.argv[3] ?? 'hero,phone,gif').split(','))
mkdirSync(`${out}/frames`, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const CAREER = () => {
  localStorage.setItem('rhr-career-rocks', '310')
  localStorage.setItem('rhr-career-runs', '14')
  localStorage.setItem('rhr-best-score', '5240')
  localStorage.setItem('rhr-best-stars', '3')
  localStorage.setItem('rhr-best-delivered', '20')
  localStorage.setItem('rhr-paint', 'fire')
}
/** Slow the page clock: game time = wall time × scale. */
const SLOW = (scale) => {
  const real = performance.now.bind(performance)
  const base = real()
  performance.now = () => base + (real() - base) * scale
}

async function newPage(opts, scale) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  await page.addInitScript(CAREER)
  if (scale) await page.addInitScript(SLOW, scale)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return page
}
const truckX = (page) => page.evaluate(() => window.__rhr.telemetry.truckX)
const speed = (page) => page.evaluate(() => Math.abs(window.__rhr.telemetry.speed))
const phase = (page) => page.evaluate(() => window.__rhr.store.getState().phase)
const topUpClock = (page) => page.evaluate(() => window.__rhr.store.setState({ timeLeft: 118 }))
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` })
/** Wait for `sec` of GAME time under the given clock scale. */
const gameWait = (page, sec, scale) => page.waitForTimeout((sec * 1000) / scale)

const startRun = async (page) => {
  await page.click('.big-button')
  // The countdown runs on real timers; under load it can take longer than 4 s.
  while ((await phase(page)) !== 'playing') await page.waitForTimeout(100)
  await page.waitForTimeout(300)
}
/**
 * Full throttle until the truck passes x; keeps the run clock topped up and
 * hops the truck forward if it wedges on a barrier or rubble.
 */
async function driveTo(page, x) {
  await page.keyboard.down('KeyW')
  let lastX = -1e9
  let lastMove = Date.now()
  while ((await truckX(page)) < x && (await phase(page)) === 'playing') {
    await topUpClock(page)
    const cur = await truckX(page)
    if (cur > lastX + 0.5) {
      lastX = cur
      lastMove = Date.now()
    } else if (Date.now() - lastMove > 6000) {
      await page.evaluate(() => {
        const b = window.__rhr.gameRefs.truck
        const t = b.translation()
        b.setTranslation({ x: t.x + 5, y: t.y + 1.2, z: 0 }, true)
        b.setLinvel({ x: 4, y: 0, z: 0 }, true)
      })
      lastMove = Date.now()
    }
    await page.waitForTimeout(60)
  }
  await page.keyboard.up('KeyW')
}
async function brakeToStop(page) {
  await page.keyboard.down('KeyS')
  while ((await speed(page)) > 0.6) await page.waitForTimeout(60)
  await page.keyboard.up('KeyS')
}
/** Re-seat every rock in the bed (truck stopped and level) and top up the clock. */
const stage = (page) =>
  page.evaluate(() => {
    const { store, cargo, gameRefs } = window.__rhr
    store.setState({ timeLeft: 118 })
    const t = gameRefs.truck.translation()
    for (let i = 0; i < cargo.states.length; i++) {
      const b = cargo.bodies[i]
      const o = cargo.bedOffsets[i]
      if (!b || !o) continue
      cargo.states[i] = 'inBed'
      b.setTranslation({ x: t.x + o[0], y: t.y + o[1], z: t.z + o[2] }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    store.getState().setCargo({ inBed: cargo.states.length, recoverable: 0, lost: 0, delivered: 0 })
  })

// ---------- Desktop hero shots (1280×720 @2x → 2560×1440)
if (segments.has('hero')) {
  const S = 0.15
  const page = await newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }, S)
  await shot(page, '01-title')
  await startRun(page)

  // Barrel gauntlet: three frames while threading the drums.
  await page.keyboard.down('KeyW')
  for (const [i, x] of [17, 24, 31].entries()) {
    while ((await truckX(page)) < x) await page.waitForTimeout(40)
    await shot(page, `02-barrels-${i}`)
  }
  await page.keyboard.up('KeyW')

  // Train: arms at x=70; stop on the flat before the gate (past the ramp
  // crest, so the truck is in view); the train crosses about 5-8 s after arming.
  await driveTo(page, 100)
  await brakeToStop(page)
  await stage(page)
  await gameWait(page, 1.4, S)
  for (let i = 0; i < 5; i++) {
    await shot(page, `03-train-${i}`)
    await gameWait(page, 0.8, S)
  }
  await gameWait(page, 2, S)

  // Blast: arms at x=123, detonates 2.2 s later; stop short and catch it.
  await driveTo(page, 128)
  await brakeToStop(page)
  await stage(page)
  for (let i = 0; i < 6; i++) {
    await shot(page, `04-blast-${i}`)
    await gameWait(page, 0.35, S)
  }

  // Traffic: arms at x=254; stop inside the zone and let a hauler come at us.
  await driveTo(page, 296)
  await brakeToStop(page)
  await stage(page)
  await gameWait(page, 1.2, S)
  for (let i = 0; i < 6; i++) {
    await shot(page, `05-traffic-${i}`)
    await gameWait(page, 0.6, S)
  }

  // Weighbridge + results: park on the pad, stage a perfect delivery.
  await driveTo(page, 341)
  await brakeToStop(page)
  await stage(page)
  await page.evaluate(() => window.__rhr.store.getState().finish(20))
  await page.waitForTimeout(1300) // the weigh ticker runs on real timers
  await shot(page, '06-weighbridge')
  await page.locator('.screen-heading').waitFor({ timeout: 8000 })
  await page.waitForTimeout(2800)
  await shot(page, '07-results')
  await page.context().close()
}

// ---------- Train burst: stop before the gate and fire a dozen frames
if (segments.has('train')) {
  const S = 0.15
  const page = await newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }, S)
  await startRun(page)
  // The train crosses the road roughly 2.4–3.5 s after arming (x = 70), so
  // shoot on the move from x ≈ 90 as the truck closes in on the gate.
  await page.keyboard.down('KeyW')
  while ((await truckX(page)) < 90) {
    await topUpClock(page)
    await page.waitForTimeout(40)
  }
  for (let i = 0; i < 10; i++) {
    await shot(page, `03-train-${String(i).padStart(2, '0')}`)
  }
  await page.keyboard.up('KeyW')
  await page.context().close()
}

// ---------- Phone shot (iPhone 13 landscape, touch controls)
if (segments.has('phone')) {
  const page = await newPage({ ...devices['iPhone 13 landscape'], hasTouch: true }, 0.15)
  await startRun(page)
  await page.locator('.touch-throttle').dispatchEvent('pointerdown')
  while ((await truckX(page)) < 21) await page.waitForTimeout(40)
  await shot(page, '08-phone')
  await page.context().close()
}

// ---------- GIF/MP4 frames (960×540): the barrel gauntlet and first climb
if (segments.has('gif')) {
  const S = 0.06
  const page = await newPage({ viewport: { width: 960, height: 540 } }, S)
  await page.click('.big-button')
  await page.waitForTimeout(3600) // catch the "GO!" beat
  await page.keyboard.down('KeyW')
  let i = 0
  let side = 0
  let last = 0
  while (i < 140 && (await truckX(page)) < 78) {
    await topUpClock(page)
    await page.screenshot({ path: `${out}/frames/f${String(i++).padStart(3, '0')}.png` })
    // Weave lanes every ~1.3 game-seconds so the truck threads the drums.
    const x = await truckX(page)
    if (x - last > 12) {
      last = x
      side = (side + 1) % 3
      await page.keyboard.up('KeyA')
      await page.keyboard.up('KeyD')
      if (side === 1) await page.keyboard.down('KeyA')
      if (side === 2) await page.keyboard.down('KeyD')
    }
  }
  console.log('gif frames:', i)
  await page.context().close()
}

await browser.close()
console.log('done')
