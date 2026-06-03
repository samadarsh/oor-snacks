import { test, expect } from '@playwright/test'
import { isIgnorableConsoleError, waitForBodyClass } from './helpers.js'

test.describe('Products page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products.html')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await waitForBodyClass(page, 'page-products')
    await page.waitForLoadState('networkidle')
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Products.*Oor Snacks/)
  })

  test('products grid renders with at least 4 items', async ({ page }) => {
    const cards = page.locator('.product-card')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('each product card has name, price, and add to cart button', async ({ page }) => {
    const cards = page.locator('.product-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 4); i++) {
      const card = cards.nth(i)
      await expect(card.locator('.product-name')).toBeVisible()
      await expect(card.locator('.product-price')).toContainText('₹')
      await expect(card.locator('.add-to-cart-btn')).toBeVisible()
    }
  })

  test('weight selector changes option correctly', async ({ page }) => {
    const firstCard = page.locator('.product-card').first()
    const select = firstCard.locator('.weight-select')
    const options = await select.locator('option').count()
    expect(options).toBeGreaterThanOrEqual(2)
    await select.selectOption({ index: 1 })
    const selected = await select.inputValue()
    expect(selected).toBeTruthy()
  })

  test('add to cart increments badge count', async ({ page }) => {
    const badge = page.locator('#cart-badge-count')
    await expect(badge).toHaveText('0')

    const firstAddBtn = page.locator('.add-to-cart-btn').first()
    await firstAddBtn.click()
    await expect(badge).toHaveText('1')
  })

  test('adding same product again increments count to 2', async ({ page }) => {
    const badge = page.locator('#cart-badge-count')
    const firstCard = page.locator('.product-card').first()
    await firstCard.locator('.add-to-cart-btn').click()
    await firstCard.locator('.inc-product-qty').click()
    await expect(badge).toHaveText('2')
  })

  test('adding 3 different products accumulates count', async ({ page }) => {
    const badge = page.locator('#cart-badge-count')
    const addBtns = page.locator('.add-to-cart-btn')
    await addBtns.nth(0).click()
    await addBtns.nth(1).click()
    await addBtns.nth(2).click()
    await expect(badge).toHaveText('3')
  })

  test('cart count persists after page reload', async ({ page }) => {
    await page.locator('.add-to-cart-btn').first().click()
    await expect(page.locator('#cart-badge-count')).toHaveText('1')
    await page.reload()
    await waitForBodyClass(page, 'page-products')
    await expect(page.locator('#cart-badge-count')).toHaveText('1')
  })

  test('category jump links scroll page smoothly', async ({ page }) => {
    const savouriesLink = page.getByRole('link', { name: 'Savouries' })
    await expect(savouriesLink).toBeVisible()
    await savouriesLink.click()
    await expect(page.locator('#best-sellers')).toBeInViewport({ timeout: 10_000 })
  })

  test('sweets section is present with at least 3 items', async ({ page }) => {
    const sweetsSection = page.locator('#sweets')
    await expect(sweetsSection).toBeVisible()
    const sweetCards = sweetsSection.locator('.product-card')
    const count = await sweetCards.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('no console errors on products page', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnorableConsoleError(msg.text())) {
        errors.push(msg.text())
      }
    })
    await page.reload()
    await waitForBodyClass(page, 'page-products')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('gift boxes section is present', async ({ page }) => {
    const combosSection = page.locator('#combos')
    await combosSection.scrollIntoViewIfNeeded()
    await expect(combosSection).toBeVisible()
  })
})
