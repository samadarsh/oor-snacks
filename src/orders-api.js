import { supabase, isSupabaseConfigured } from './supabase.js'

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
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, skipped: true }
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: customerName.trim(),
      customer_address: customerAddress.trim(),
      customer_phone: customerPhone?.trim() || null,
      subtotal,
      shipping,
      total,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError) {
    console.error('[Oor] order insert failed:', orderError.message)
    return { ok: false, error: orderError.message }
  }

  const lineRows = cartItems.map((item) => ({
    order_id: orderRow.id,
    product_id: item.id || null,
    product_name: item.name,
    weight: item.weight,
    unit_price: item.price,
    qty: item.qty,
    line_total: item.price * item.qty,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(lineRows)

  if (itemsError) {
    console.error('[Oor] order_items insert failed:', itemsError.message)
    return { ok: false, error: itemsError.message, id: orderRow.id }
  }

  return { ok: true, id: orderRow.id }
}
