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
  if (/could not find the function|PGRST202/i.test(msg)) {
    // place_order() is missing — supabase/place-order.sql has not been run on this project.
    return 'Online checkout is temporarily unavailable. Please use Order via WhatsApp below.'
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
 * Place the order through the place_order() database function, which prices every line
 * from product_prices and saves the order + items in one transaction.
 * Only ids and quantities are sent; client-side prices are never trusted.
 * Returns { ok, id?, subtotal?, shipping?, total?, error?, skipped? }.
 */
export async function saveOrderToSupabase({
  orderId,
  customerName,
  customerAddress,
  customerPhone,
  cartItems,
}) {
  const { configured, supabaseStore } = await initSupabase()
  if (!configured || !supabaseStore) {
    return { ok: false, skipped: true }
  }

  try {
    const { data, error } = await withTimeout(
      supabaseStore.rpc('place_order', {
        p_order_id: orderId,
        p_customer_name: customerName.trim(),
        p_customer_address: customerAddress.trim(),
        p_customer_phone: customerPhone?.trim() || '',
        p_items: cartItems.map((item) => ({
          product_id: item.id,
          weight: item.weight,
          qty: item.qty,
        })),
      })
    )

    if (error) {
      console.error('[Oor] place_order failed:', error)
      return { ok: false, error: formatCheckoutError(error) }
    }

    return {
      ok: true,
      id: data.id,
      subtotal: data.subtotal,
      shipping: data.shipping,
      total: data.total,
    }
  } catch (err) {
    console.error('[Oor] order save threw:', err)
    return { ok: false, error: formatCheckoutError(err) }
  }
}
