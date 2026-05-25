/**
 * Creates -480w and -960w variants for mobile-friendly srcset. Run before `vite build`.
 */
import { readdirSync, existsSync } from 'fs'
import { join, dirname, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(root, 'public/images')
const widths = [480, 960]

const skipPattern = /-\d+w\.(jpg|jpeg|webp|png)$/i

const sources = readdirSync(assetsDir).filter((f) => {
  if (skipPattern.test(f)) return false
  return /\.(jpg|jpeg|webp|png)$/i.test(f)
})

let created = 0

for (const file of sources) {
  const ext = extname(file).toLowerCase()
  const stem = basename(file, ext)
  const input = join(assetsDir, file)

  for (const w of widths) {
    const outExt = ext === '.webp' ? '.jpg' : ext
    const outFile = `${stem}-${w}w${outExt}`
    const outPath = join(assetsDir, outFile)
    if (existsSync(outPath)) continue

    try {
      execSync(
        `sips -Z ${w} "${input}" --out "${outPath}" --setProperty format jpeg --setProperty formatOptions 82`,
        { stdio: 'pipe' }
      )
      created++
      console.log(`[responsive] ${outFile}`)
    } catch (err) {
      console.warn(`[responsive] skip ${outFile}:`, err.message)
    }
  }
}

console.log(`[responsive] done — ${created} new variant(s)`)
