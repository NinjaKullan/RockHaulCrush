/**
 * Fun-pass verification: full-throttle run with a lane weave, collecting every
 * HUD popup seen, then the results breakdown.
 * Usage: dev server running, then `node scripts/scorerun.mjs <outdir> [mobile]`
 */
import { chromium, devices } from 'playwright'

const outdir = process.argv[2] ?? '.'
const mobile = process.argv[3] === 'mobile'
const errors = []
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH

const browser = await chromium.launch(launchOptions)
const context = mobile
  ? await browser.newContext({ ...devices['iPhone 13 landscape'], hasTouch: true })
  : await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await context.newPage()
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const shot = (name) => page.screenshot({ path: `${outdir}/${name}.png` })
const text = async (sel) =>
  (await page.locator(sel).count()) ? page.locator(sel).first().innerText() : '(absent)'

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.click('.big-button')
await page.waitForTimeout(4200)

// Weave lanes every ~1.6 s at full throttle; collect popups.
await page.keyboard.down('KeyW')
const popups = new Map()
let shotTaken = false
const start = Date.now()
let side = 0
while (Date.now() - start < 150000) {
  const phase = await page.evaluate(() => document.querySelector('.results-sub') ? 'done' : 'play')
  if (phase === 'done') break
  const seen = await page.locator('.hud-popup').allInnerTexts()
  for (const s of seen) {
    popups.set(s, (popups.get(s) ?? 0) + 1)
    if (!shotTaken) {
      shotTaken = true
      await shot('score-1-popup')
    }
  }
  if ((Date.now() - start) % 1600 < 200) {
    side = (side + 1) % 3
    await page.keyboard.up('KeyA')
    await page.keyboard.up('KeyD')
    if (side === 1) await page.keyboard.down('KeyA')
    if (side === 2) await page.keyboard.down('KeyD')
  }
  await page.waitForTimeout(180)
}
await page.keyboard.up('KeyW')
await page.keyboard.up('KeyA')
await page.keyboard.up('KeyD')
console.log('popups seen:', [...popups.keys()])
console.log('hud score at end:', await text('.hud-score'))
await page.waitForTimeout(2600)
await shot('score-2-results')
console.log('heading:', await text('.screen-heading'))
console.log('sub:', await text('.results-sub'))
console.log('card:', (await text('.score-card')).replace(/\n/g, ' | '))
console.log('time line:', await text('.results-time'))
console.log('best:', await text('.results-best'))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
