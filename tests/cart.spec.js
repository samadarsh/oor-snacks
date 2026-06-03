import { test, expect } from '@playwright/test'
import { waitForBodyClass } from './helpers.js'

const SAMPLE_CART = [
  { id: 'p1', name: 'Kai Murukku', weight: '250g', price: 140, qty: 2, img: '' },
  { id: 'p2', name: 'Madras Mixture', weight: '500g', price: 234, qty: 1, img: '' },
]

test.describe('Cart / Shop page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop.html')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await waitForBodyClass(page, 'page-shop')
    await page.waitForLoadState('networkidle')
  })

  test('shows empty state when cart is empty', async ({ page }) => {
    const emptyMsg = page.locator('#shop-cart-empty')
    await expect(emptyMsg).toBeVisible()
    await expect(page.locator('#shop-cart-items')).toBeHidden()
    await expect(page.locator('#shop-checkout-block')).toBeHidden()
  })

  test('empty state has link back to products', async ({ page }) => {
    const browseLink = page.locator('#shop-cart-empty').getByRole('link', { name: /browse products/i })
    await expect(browseLink).toBeVisible()
    await browseLink.click()
    await page.waitForURL(/products\.html/)
  })

  test.describe('with items in cart', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((cart) => {
        localStorage.setItem('oor_cart', JSON.stringify(cart))
      }, SAMPLE_CART)
      await page.goto('/shop.html')
      await waitForBodyClass(page, 'page-shop')
      await expect(page.locator('#shop-cart-items')).toBeVisible()
    })

    test('cart items panel shows products', async ({ page }) => {
      await expect(page.locator('#shop-cart-empty')).toBeHidden()
      await expect(page.locator('.cart-item')).toHaveCount(2)
    })

    test('checkout panel is visible with cart items', async ({ page }) => {
      await expect(page.locator('#shop-checkout-block')).toBeVisible()
    })

    test('subtotal is calculated correctly', async ({ page }) => {
      const subtotal = page.locator('#shop-subtotal-amount')
      await expect(subtotal).toContainText('514')
    })

    test('free shipping shown when order above ₹500', async ({ page }) => {
      const shipping = page.locator('#shop-shipping-amount')
      await expect(shipping).toHaveText('FREE')
    })

    test('total amount is displayed', async ({ page }) => {
      const total = page.locator('#shop-total-amount')
      await expect(total).toContainText('₹')
    })

    test('each cart item shows name and price', async ({ page }) => {
      const items = page.locator('.cart-item')
      await expect(items).toHaveCount(2)
      await expect(items.first().locator('.cart-item-title')).toContainText('Murukku')
    })

    test('qty increment button works', async ({ page }) => {
      const firstIncBtn = page.locator('.inc-btn').first()
      const qtyDisplay = page.locator('.qty-number').first()
      const initialQty = Number(await qtyDisplay.textContent())
      await firstIncBtn.click()
      await expect(qtyDisplay).toHaveText(String(initialQty + 1))
    })

    test('qty decrement button removes item when qty becomes 0', async ({ page }) => {
      const items = page.locator('.cart-item')
      await expect(items).toHaveCount(2)
      await page.locator('.dec-btn').nth(1).click()
      await expect(items).toHaveCount(1)
    })

    test('checkout form requires name field', async ({ page }) => {
      await page.locator('#website-order-submit').click()
      const validationMessage = await page.locator('#cust-name').evaluate((el) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('checkout form requires mobile field', async ({ page }) => {
      await page.locator('#cust-name').fill('Test User')
      await page.locator('#website-order-submit').click()
      const validationMessage = await page.locator('#cust-mobile').evaluate((el) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('checkout form requires address field', async ({ page }) => {
      await page.locator('#cust-name').fill('Test User')
      await page.locator('#cust-mobile').fill('9876543210')
      await page.locator('#website-order-submit').click()
      const validationMessage = await page.locator('#cust-address').evaluate((el) => el.validationMessage)
      expect(validationMessage).toBeTruthy()
    })

    test('WhatsApp button is visible', async ({ page }) => {
      const waBtn = page.locator('#cart-whatsapp-order')
      await waBtn.scrollIntoViewIfNeeded()
      await expect(waBtn).toBeVisible()
    })
  })
})
