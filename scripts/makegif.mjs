/**
 * Assemble PNG frames into an animated GIF (pure JS, no ffmpeg).
 * Usage: node scripts/makegif.mjs <framesDir> <out.gif> [fps] [scale]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { PNG } from 'pngjs'

const [dir, outPath, fpsArg = '12', scaleArg = '1'] = process.argv.slice(2)
const fps = Number(fpsArg)
const scale = Number(scaleArg)
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
const gif = GIFEncoder()
let w = 0
let h = 0
for (const [i, f] of files.entries()) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`))
  let { width, height, data } = png
  if (scale !== 1) {
    // Nearest-neighbour downscale keeps it dependency-free.
    const nw = Math.round(width * scale)
    const nh = Math.round(height * scale)
    const nd = new Uint8Array(nw * nh * 4)
    for (let y = 0; y < nh; y++) {
      const sy = Math.floor(y / scale)
      for (let x = 0; x < nw; x++) {
        const sx = Math.floor(x / scale)
        const si = (sy * width + sx) * 4
        const di = (y * nw + x) * 4
        nd[di] = data[si]
        nd[di + 1] = data[si + 1]
        nd[di + 2] = data[si + 2]
        nd[di + 3] = 255
      }
    }
    width = nw
    height = nh
    data = nd
  }
  w = width
  h = height
  const rgba = new Uint8Array(data.buffer, data.byteOffset, width * height * 4)
  const palette = quantize(rgba, 256, { format: 'rgb444' })
  const index = applyPalette(rgba, palette, 'rgb444')
  gif.writeFrame(index, width, height, { palette, delay: Math.round(1000 / fps), repeat: 0 })
  if (i % 10 === 0) process.stdout.write(`${i}/${files.length}\r`)
}
gif.finish()
writeFileSync(outPath, gif.bytes())
console.log(`\n${outPath}: ${files.length} frames, ${w}×${h}, ${(gif.bytes().length / 1e6).toFixed(1)} MB`)
