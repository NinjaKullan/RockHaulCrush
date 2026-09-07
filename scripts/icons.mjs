/** Rasterize public/favicon.svg into the PNG icons and an Open Graph card. */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage()
const svg = readFileSync('public/favicon.svg', 'utf8')
for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`)
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
}
// OG card: 1200×630, title over the quarry palette with the icon.
await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(`<style>
  html,body{margin:0;width:1200px;height:630px;font-family:system-ui,Helvetica,Arial,sans-serif}
  .bg{width:100%;height:100%;background:linear-gradient(160deg,#c98a4e 0%,#8e887e 45%,#3a2e20 100%);display:flex;align-items:center;justify-content:center;gap:56px}
  h1{margin:0;font-size:96px;font-weight:900;letter-spacing:.04em;color:#ffd25e;text-shadow:0 6px 0 #8a4a1f,0 12px 30px rgba(0,0,0,.4)}
  p{margin:14px 0 0;font-size:34px;color:#fdf3e3;font-weight:600}
</style><div class="bg">${svg.replace('<svg ', '<svg width="300" height="300" ')}<div><h1>ROCK HAUL RUSH</h1><p>20 rocks. 2 minutes. One angry quarry.</p><p style="font-size:26px;opacity:.85">Free browser game · phone or laptop</p></div></div>`)
await page.screenshot({ path: 'public/og-image.png' })
await browser.close()
console.log('icons written')
