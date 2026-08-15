/**
 * Headless browser smoke test: loads the dev server, verifies a live WebGL
 * canvas, captures early + settled screenshots, and fails on console errors.
 *
 * Usage: start `npm run dev`, then `node scripts/smoke.mjs [early.png] [settled.png]`
 * CHROMIUM_PATH overrides the browser binary (defaults to Playwright's own).
 */
import { chromium } from 'playwright'

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
await page.waitForTimeout(1500)
await page.screenshot({ path: process.argv[2] ?? 'smoke-early.png' })
// Let physics settle, then capture again
await page.waitForTimeout(3500)
await page.screenshot({ path: process.argv[3] ?? 'smoke-settled.png' })

const hasCanvas = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return !!c && c.width > 0 && c.height > 0
})

console.log('canvas present:', hasCanvas)
console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
if (!hasCanvas || errors.length) process.exit(1)
