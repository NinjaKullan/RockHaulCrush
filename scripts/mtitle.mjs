import { chromium, devices } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], hasTouch: true })
const page = await ctx.newPage()
await page.addInitScript(() => { localStorage.setItem('rhr-career-rocks', '130'); localStorage.setItem('rhr-career-runs', '4'); localStorage.setItem('rhr-best-score', '4210'); localStorage.setItem('rhr-best-stars','2') })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/m-title.png` })
console.log('scrollHeight vs client:', await page.evaluate(() => [document.querySelector('.screen').scrollHeight, document.querySelector('.screen').clientHeight]))
// jump straight to a results screen by finishing via store: drive for ~2s then use debug? Simpler: render results by faking a finish.
await page.click('.big-button'); await page.waitForTimeout(4200)
await page.evaluate(() => { const b = document.querySelector('.hud'); return !!b })
await page.locator('.touch-throttle').dispatchEvent('pointerdown'); await page.waitForTimeout(2500)
await page.screenshot({ path: `${out}/m-driving.png` })
await browser.close()
