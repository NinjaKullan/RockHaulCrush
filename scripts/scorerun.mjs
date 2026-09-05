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

await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
await page.addInitScript(() => {
  // Veteran career so paint unlocks and promotion logic get exercised.
  localStorage.setItem('rhr-career-rocks', '290')
  localStorage.setItem('rhr-career-runs', '9')
})
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
console.log('career:', (await text('.career-block')).replace(/\n/g, ' | '))
console.log('paints:', await page.locator('.paint-swatch').count(), 'locked:', await page.locator('.paint-locked').count())
await page.locator('.paint-swatch').nth(2).click() // Fire Red (Hauler rank)
await page.locator('.paint-swatch').nth(5).click() // Onyx — locked, should not take
console.log('active paint label:', await page.locator('.paint-active').getAttribute('aria-label'))
await shot('score-0-title')
await page.click('.big-button')
await page.waitForTimeout(700)
console.log('objective chip:', (await text('.objective-chip')).replace(/\n/g, ' | '))
await shot('score-0b-countdown')
await page.waitForTimeout(3500)

// Weave lanes every ~1.6 s at full throttle; collect popups.
if (mobile) await page.locator('.touch-throttle').dispatchEvent('pointerdown')
else await page.keyboard.down('KeyW')
const popups = new Map()
const radio = new Set()
let honks = 0
let shotTaken = false
let weighShot = false
const start = Date.now()
let side = 0
while (Date.now() - start < 150000) {
  const phase = await page.evaluate(() =>
    document.querySelector('.results-sub') ? 'done' : document.querySelector('.weigh-card') ? 'weigh' : 'play',
  )
  if (phase === 'done') break
  if (phase === 'weigh' && !weighShot) {
    weighShot = true
    await page.waitForTimeout(900)
    console.log('weigh card:', (await text('.weigh-card')).replace(/\n/g, ' | '))
    await shot('score-1b-weigh')
    continue
  }
  const seen = await page.locator('.hud-popup').allInnerTexts()
  for (const r of await page.locator('.radio-text').allInnerTexts()) radio.add(r)
  if (honks < 3 && Date.now() - start > 20000 + honks * 15000) {
    honks++
    if (mobile) await page.locator('.touch-small').nth(2).dispatchEvent('pointerdown')
    else await page.keyboard.press('KeyH')
  }
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
console.log('radio lines:', [...radio])
console.log('hud score at end:', await text('.hud-score'))
await page.waitForTimeout(2600)
await shot('score-2-results')
console.log('heading:', await text('.screen-heading'))
console.log('sub:', await text('.results-sub'))
console.log('card:', (await text('.score-card')).replace(/\n/g, ' | '))
console.log('time line:', await text('.results-time'))
console.log('best:', await text('.results-best'))
console.log('promotion:', await text('.promotion'))
await page.locator('.results-actions .mid-button').click()
await page.waitForTimeout(300)
console.log('share label:', await text('.results-actions .mid-button'))
console.log('clipboard:', await page.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e)))
await shot('score-3-results-final')
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
