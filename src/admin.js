import './admin.css'
import { supabase, isSupabaseConfigured } from './supabase.js'

const loginPanel = document.getElementById('admin-login-panel')
const ordersPanel = document.getElementById('admin-orders-panel')
const loginForm = document.getElementById('admin-login-form')
const loginError = document.getElementById('admin-login-error')
const ordersList = document.getElementById('admin-orders-list')
const orderCount = document.getElementById('admin-order-count')
const emptyState = document.getElementById('admin-empty')
const logoutBtn = document.getElementById('admin-logout')
const refreshBtn = document.getElementById('admin-refresh')
const configWarn = document.getElementById('admin-config-warn')

let isLoadingOrders = false
let lastLoadedAt = null

const escapeHtml = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatLastSync = () => {
  if (!lastLoadedAt) return ''
  return `Updated ${lastLoadedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
}

const showLogin = () => {
  loginPanel.hidden = false
  ordersPanel.hidden = true
  logoutBtn.hidden = true
}

const showOrders = () => {
  loginPanel.hidden = true
  ordersPanel.hidden = false
  logoutBtn.hidden = false
}

const setRefreshLoading = (loading) => {
  if (!refreshBtn) return
  refreshBtn.disabled = loading
  refreshBtn.textContent = loading ? 'Refreshing…' : 'Refresh'
  refreshBtn.setAttribute('aria-busy', loading ? 'true' : 'false')
}

/** Fetch orders + line items in two steps (more reliable than nested embed). */
async function fetchOrdersWithItems() {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (ordersError) {
    return { error: ordersError.message }
  }

  const list = orders || []
  if (list.length === 0) {
    return { orders: [] }
  }

  const orderIds = list.map((o) => o.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)

  if (itemsError) {
    return { error: itemsError.message }
  }

  const itemsByOrder = {}
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id].push(item)
  }

  for (const order of list) {
    order.order_items = itemsByOrder[order.id] || []
  }

  return { orders: list }
}

function renderOrders(orders) {
  ordersList.innerHTML = orders
    .map((ord) => {
      const lineItems = ord.order_items || []
      const statusClass = ord.status === 'fulfilled' ? 'fulfilled' : ''
      return `
        <article class="admin-order-card" data-id="${ord.id}">
          <div class="admin-order-head">
            <strong>${escapeHtml(ord.customer_name)}</strong>
            <span class="admin-status ${statusClass}">${escapeHtml(ord.status)}</span>
          </div>
          <p class="admin-order-meta">${formatDate(ord.created_at)}</p>
          <p class="admin-order-meta"><strong>Address:</strong> ${escapeHtml(ord.customer_address)}</p>
          ${
            ord.customer_phone
              ? `<p class="admin-order-meta"><strong>Phone:</strong> ${escapeHtml(ord.customer_phone)}</p>`
              : ''
          }
          <div class="admin-order-items">
            ${
              lineItems.length
                ? lineItems
                    .map(
                      (i) => `
              <div class="admin-order-item">
                <span>${i.qty}× ${escapeHtml(i.product_name)} (${escapeHtml(i.weight)})</span>
                <span>₹${i.line_total}</span>
              </div>`
                    )
                    .join('')
                : '<p class="admin-order-meta">No line items recorded</p>'
            }
          </div>
          <div class="admin-order-total">
            <span>Total (incl. shipping ₹${ord.shipping})</span>
            <span>₹${ord.total}</span>
          </div>
          ${
            ord.status === 'pending'
              ? `<button type="button" class="admin-btn admin-btn-primary admin-fulfill-btn" data-id="${ord.id}">Mark fulfilled</button>`
              : ''
          }
        </article>
      `
    })
    .join('')

  ordersList.querySelectorAll('.admin-fulfill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      btn.disabled = true
      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: 'fulfilled' })
        .eq('id', id)
      if (updErr) alert(updErr.message)
      else await loadOrders({ quiet: false })
    })
  })
}

async function loadOrders({ quiet = false } = {}) {
  if (!supabase) return
  if (isLoadingOrders) return

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    showLogin()
    if (!quiet && loginError) {
      loginError.textContent = 'Session expired. Please sign in again.'
      loginError.hidden = false
    }
    return
  }

  isLoadingOrders = true
  setRefreshLoading(true)

  if (!quiet) {
    ordersList.innerHTML = '<p class="admin-order-meta">Loading orders…</p>'
    emptyState.hidden = true
  }

  try {
    const result = await fetchOrdersWithItems()

    if (result.error) {
      orderCount.textContent = 'Could not load'
      ordersList.innerHTML = `<p class="admin-error">Could not load orders: ${escapeHtml(result.error)}</p>`
      emptyState.hidden = true
      return
    }

    const orders = result.orders
    lastLoadedAt = new Date()

    orderCount.textContent =
      orders.length === 0
        ? `No orders · ${formatLastSync()}`
        : `${orders.length} order${orders.length > 1 ? 's' : ''} · ${formatLastSync()}`

    if (orders.length === 0) {
      ordersList.innerHTML = ''
      emptyState.hidden = false
      return
    }

    emptyState.hidden = true
    renderOrders(orders)
  } finally {
    isLoadingOrders = false
    setRefreshLoading(false)
  }
}

async function init() {
  if (!isSupabaseConfigured() || !supabase) {
    configWarn.hidden = false
    loginForm.querySelector('button').disabled = true
    return
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    showOrders()
    await loadOrders({ quiet: true })
  } else {
    showLogin()
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showOrders()
      loadOrders({ quiet: true })
    } else {
      showLogin()
    }
  })
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginError.hidden = true

  const email = document.getElementById('admin-email').value
  const password = document.getElementById('admin-password').value

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) {
    let msg = error.message
    if (error.message === 'Invalid API key') {
      msg =
        'Invalid API key — check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env, then restart npm run dev.'
    } else if (error.message === 'Invalid login credentials') {
      msg =
        'Invalid email or password — or the user is not confirmed. In Supabase → Authentication → Users, add a user with Auto Confirm User enabled, then try again.'
    }
    loginError.textContent = msg
    loginError.hidden = false
  } else {
    await loadOrders({ quiet: false })
  }
})

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  showLogin()
})

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => loadOrders({ quiet: false }))
} else {
  console.error('[Oor Admin] Refresh button #admin-refresh not found')
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !ordersPanel.hidden) {
    loadOrders({ quiet: true })
  }
})

init()
