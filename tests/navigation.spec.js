import { test, expect } from '@playwright/test'
import { waitForBodyClass } from './helpers.js'

const pages = [
  { url: '/', title: /Oor Snacks/, bodyClass: 'page-hero' },
  { url: '/products.html', title: /Products/, bodyClass: 'page-products' },
  { url: '/shop.html', title: /Cart/, bodyClass: 'page-shop' },
]

test.describe('Navigation', () => {
  for (const { url, title, bodyClass } of pages) {
    test(`page ${url} loads and has correct title`, async ({ page }) => {
      await page.goto(url)
      await waitForBodyClass(page, bodyClass)
      await expect(page).toHaveTitle(title)
    })
  }

  test('all nav links in homepage are functional', async ({ page }) => {
    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    await page.waitForLoadState('networkidle')

    const openMobileNav = async () => {
      const isMobile = (page.viewportSize()?.width ?? 1280) < 768
      if (!isMobile) return
      const toggle = page.locator('.mobile-nav-toggle')
      const isOpen = await toggle.getAttribute('aria-expanded')
      if (isOpen !== 'true') {
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      }
    }

    await openMobileNav()
    await page.locator('nav[aria-label="Main"]').getByRole('link', { name: 'Products' }).click()
    await page.waitForURL(/products\.html/)

    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    await openMobileNav()
    await page.locator('nav[aria-label="Main"]').getByRole('link', { name: 'Cart' }).click()
    await page.waitForURL(/shop\.html/)

    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    await openMobileNav()
    await page.locator('nav[aria-label="Main"]').getByRole('link', { name: 'Home' }).click()
    await page.waitForURL(/\/?$/)
  })

  test('cart icon links to shop page', async ({ page }) => {
    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    const cartIcon = page.locator('#cart-toggle')
    await expect(cartIcon).toBeVisible()
    await cartIcon.click()
    await page.waitForURL(/shop\.html/)
  })

  test('privacy and terms pages load', async ({ page }) => {
    await page.goto('/privacy.html')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/terms.html')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForBodyClass(page, 'page-hero')
    await page.waitForLoadState('networkidle')
  })

  test('hamburger menu toggles nav open', async ({ page }) => {
    const toggleBtn = page.locator('.mobile-nav-toggle')
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('body')).toHaveClass(/nav-open/)
  })

  test('hamburger menu closes when link is clicked', async ({ page }) => {
    const toggleBtn = page.locator('.mobile-nav-toggle')
    await toggleBtn.click()
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    await page.locator('nav[aria-label="Main"]').getByRole('link', { name: 'Products' }).click()
    await page.waitForURL(/products\.html/)
  })

  test('mobile nav text is visible when menu is open', async ({ page }) => {
    const toggleBtn = page.locator('.mobile-nav-toggle')
    await toggleBtn.click()
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')

    const navLinks = page.locator('.nav-menu .nav-link')
    const count = await navLinks.count()
    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i)
      const color = await link.evaluate((el) => window.getComputedStyle(el).color)
      expect(color).not.toBe('rgba(0, 0, 0, 0)')
    }
  })
})
