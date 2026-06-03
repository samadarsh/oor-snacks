import { test, expect } from '@playwright/test'
import { isIgnorableConsoleError, waitForBodyClass } from './helpers.js'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    await page.waitForLoadState('networkidle')
  })

  test('page title and meta', async ({ page }) => {
    await expect(page).toHaveTitle(/Oor Snacks/)
    const desc = page.locator('meta[name="description"]')
    await expect(desc).toHaveAttribute('content', /Tamil Nadu/)
  })

  test('navbar renders with logo and all links', async ({ page }) => {
    await expect(page.locator('.logo')).toHaveText('OOR')
    const nav = page.locator('nav[aria-label="Main"]')
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Story' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Cart' })).toBeVisible()
  })

  test('cart badge starts at 0', async ({ page }) => {
    const badge = page.locator('#cart-badge-count')
    await expect(badge).toHaveText('0')
  })

  test('hero section is visible with image', async ({ page }) => {
    const hero = page.locator('.hero-section')
    await expect(hero).toBeVisible()
    const heroImg = page.locator('.hero-bg-image')
    await expect(heroImg).toBeVisible()
  })

  test('hero has CTA button linking to products', async ({ page }) => {
    const cta = page.locator('.hero-ctas a').first()
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('products')
  })

  test('Story / origin section is reachable via anchor', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768
    if (isMobile) {
      await page.locator('.mobile-nav-toggle').click()
      await expect(page.locator('.mobile-nav-toggle')).toHaveAttribute('aria-expanded', 'true')
    }
    const storyLink = page.locator('nav[aria-label="Main"]').getByRole('link', { name: 'Story' })
    await storyLink.click()
    await expect(page.locator('#origin')).toBeInViewport({ timeout: 10_000 })
  })

  test('no console errors on load', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnorableConsoleError(msg.text())) {
        errors.push(msg.text())
      }
    })
    await page.reload()
    await waitForBodyClass(page, 'page-hero')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('footer has copyright and key links', async ({ page }) => {
    const footer = page.locator('.main-footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer.locator('.copyright')).toContainText('Oor Snacks')
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible()
  })

  test('Products nav link navigates to products page', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768
    if (isMobile) {
      await page.locator('.mobile-nav-toggle').click()
      await expect(page.locator('.mobile-nav-toggle')).toHaveAttribute('aria-expanded', 'true')
    }
    const nav = page.locator('nav[aria-label="Main"]')
    await nav.getByRole('link', { name: 'Products' }).click()
    await page.waitForURL(/products\.html/)
    await expect(page).toHaveURL(/products\.html/)
  })

  test('WhatsApp CTA is in hero', async ({ page }) => {
    const waBtn = page.locator('.hero-ctas a[href*="whatsapp"]')
    await expect(waBtn).toBeVisible()
  })
})
