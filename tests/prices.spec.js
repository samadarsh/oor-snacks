import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

/**
 * Checkout prices come from public.product_prices (supabase/place-order.sql), while the
 * storefront shows prices from the HTML. This keeps the two lists from drifting apart.
 */
const read = (file) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8')

/** Same rule as updateProductButtons() in src/cart.js: base price × option multiplier, rounded. */
function htmlPrices(html) {
  const prices = new Map()
  const cards = html.split('class="product-card').slice(1)
  for (const card of cards) {
    const id = card.match(/data-id="([^"]+)"/)?.[1]
    const base = Number(card.match(/data-base-price="([^"]+)"/)?.[1])
    if (!id || !base) continue
    const options = [...card.matchAll(/<option value="([^"]+)" data-multiplier="([^"]+)"/g)]
    if (options.length === 0) {
      prices.set(`${id}|Pack`, base)
    } else {
      for (const [, weight, multiplier] of options) {
        prices.set(`${id}|${weight}`, Math.round(base * parseFloat(multiplier)))
      }
    }
  }
  return prices
}

function sqlPrices(sql) {
  const prices = new Map()
  for (const [, id, weight, price] of sql.matchAll(/\('([^']+)',\s*'([^']+)',\s*'[^']+',\s*(\d+)\)/g)) {
    prices.set(`${id}|${weight}`, Number(price))
  }
  return prices
}

test.describe('Checkout price list', () => {
  test('every storefront price matches supabase/place-order.sql', () => {
    const db = sqlPrices(read('supabase/place-order.sql'))
    expect(db.size).toBeGreaterThan(0)

    for (const page of ['products.html', 'index.html']) {
      for (const [key, price] of htmlPrices(read(page))) {
        expect(db.get(key), `${page} ${key}`).toBe(price)
      }
    }
  })

  test('every priced product is on the products page', () => {
    const db = sqlPrices(read('supabase/place-order.sql'))
    const html = htmlPrices(read('products.html'))
    expect([...db.keys()].sort()).toEqual([...html.keys()].sort())
  })
})
