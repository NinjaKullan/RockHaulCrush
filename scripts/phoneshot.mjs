/** Landscape-phone HUD check on two device sizes. Usage: node scripts/phoneshot.mjs <outdir> */
import { chromium, devices } from 'playwright'
const out = process.argv[2] ?? '.'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const SLOW = (scale) => { const real = performance.now.bind(performance); const base = real(); performance.now = () => base + (real() - base) * scale }
// Real Safari landscape on a Pro Max is ~930×430 CSS px once the bars shrink.
const wide = { ...devices['iPhone 14 Pro Max landscape'], viewport: { width: 932, height: 430 } }
{
  // Portrait: the rotate prompt must cover the title screen.
  const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/phone-portrait.png` })
  await ctx.close()
}
for (const [name, dev] of [['wide', wide], ['i13', devices['iPhone 13 landscape']]]) {
  const ctx = await browser.newContext({ ...dev, hasTouch: true })
  const page = await ctx.newPage()
  await page.addInitScript(SLOW, 0.2)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  console.log(name, 'viewport', dev.viewport)
  await page.screenshot({ path: `${out}/phone-${name}-title.png` })
  await page.click('.big-button')
  while ((await page.evaluate(() => window.__rhr.store.getState().phase)) !== 'playing') await page.waitForTimeout(100)
  await page.locator('.touch-throttle').dispatchEvent('pointerdown')
  while ((await page.evaluate(() => window.__rhr.telemetry.truckX)) < 24) await page.waitForTimeout(50)
  await page.waitForTimeout(300)
  console.log(name, 'hint:', await page.locator('.hint-toast').innerText().catch(() => '(none)'))
  await page.screenshot({ path: `${out}/phone-${name}-hint.png` })
  await ctx.close()
}
await browser.close()
