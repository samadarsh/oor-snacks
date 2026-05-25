import { initSupabase } from './supabase.js'

const CHECKOUT_TIMEOUT_MS = 12_000

/** User-facing message for browser/network failures (Safari: "Load failed", Chrome: "Failed to fetch"). */
export function formatCheckoutError(err) {
  const msg = err?.message || String(err)
  if (/load failed|failed to fetch|networkerror|network error|aborted|timeout/i.test(msg)) {
    return (
      'Could not reach our order server. Check your internet, try disabling ad blockers for this site, ' +
      'or use Order via WhatsApp below.'
    )
  }
  if (/row-level security|42501/i.test(msg)) {
    return 'Order could not be saved (database permissions). Run supabase/fix-rls.sql in Supabase, then try again.'
  }
  return msg
}

function withTimeout(promise, ms = CHECKOUT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), ms)
    }),
  ])
}

/**
 * Persist checkout to Supabase. Returns { ok, id?, error?, skipped? }.
 */
export async function saveOrderToSupabase({
  customerName,
  customerAddress,
  customerPhone,
  subtotal,
  shipping,
  total,
  cartItems,
}) {
  const { configured, supabaseStore } = await initSupabase()
  if (!configured || !supabaseStore) {
    return { ok: false, skipped: true }
  }

  const orderId = crypto.randomUUID()

  try {
    const { error: orderError } = await withTimeout(
      supabaseStore.from('orders').insert({
        id: orderId,
        customer_name: customerName.trim(),
        customer_address: customerAddress.trim(),
        customer_phone: customerPhone?.trim() || null,
        subtotal,
        shipping,
        total,
        status: 'pending',
      })
    )

    if (orderError) {
      console.error('[Oor] order insert failed:', orderError)
      return { ok: false, error: formatCheckoutError(orderError) }
    }

    const lineRows = cartItems.map((item) => ({
      order_id: orderId,
      product_id: item.id || null,
      product_name: item.name,
      weight: item.weight,
      unit_price: item.price,
      qty: item.qty,
      line_total: item.price * item.qty,
    }))

    const { error: itemsError } = await withTimeout(
      supabaseStore.from('order_items').insert(lineRows)
    )

    if (itemsError) {
      console.error('[Oor] order_items insert failed:', itemsError)
      return { ok: false, error: formatCheckoutError(itemsError), id: orderId }
    }

    return { ok: true, id: orderId }
  } catch (err) {
    console.error('[Oor] order save threw:', err)
    return { ok: false, error: formatCheckoutError(err) }
  }
}
