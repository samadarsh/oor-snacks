/** Wait until page-specific JS has bootstrapped. */
export async function waitForBodyClass(page, className) {
  await page.waitForFunction(
    (cls) => document.body.classList.contains(cls),
    className,
    { timeout: 15_000 }
  )
}

/** Ignore transient Vite dev-server noise in console-error tests. */
export function isIgnorableConsoleError(text) {
  return /Outdated Optimize Dep|504 \(Outdated Optimize Dep\)|Failed to load resource.*favicon/i.test(
    text
  )
}
