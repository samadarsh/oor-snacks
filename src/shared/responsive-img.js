const DEFAULT_WIDTHS = [480, 960]

/**
 * Set srcset/sizes on images with data-responsive="filename_without_ext" and optional data-ext="jpg|webp".
 */
export function initResponsiveImages() {
  document.querySelectorAll('img[data-responsive]').forEach((img) => {
    const stem = img.dataset.responsive
    const ext = img.dataset.ext || 'jpg'
    const variantExt = img.dataset.variantExt || (ext === 'webp' ? 'jpg' : ext)
    const widths = DEFAULT_WIDTHS
    const basePath = `/src/assets/${stem}.${ext}`

    const parts = widths.map((w) => `/src/assets/${stem}-${w}w.${variantExt} ${w}w`)
    parts.push(`${basePath} 1200w`)

    img.src = basePath
    img.srcset = parts.join(', ')
    img.sizes = img.dataset.sizes || '(max-width: 768px) 96vw, (max-width: 1200px) 50vw, 33vw'
    img.decoding = 'async'
  })
}
