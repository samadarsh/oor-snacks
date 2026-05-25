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

async function loadOrders() {
  if (!supabase) return

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })

  if (error) {
    ordersList.innerHTML = `<p class="admin-error">Could not load orders: ${escapeHtml(error.message)}</p>`
    return
  }

  const orders = data || []
  orderCount.textContent =
    orders.length === 0 ? 'No orders' : `${orders.length} order${orders.length > 1 ? 's' : ''}`

  if (orders.length === 0) {
    ordersList.innerHTML = ''
    emptyState.hidden = false
    return
  }

  emptyState.hidden = true
  ordersList.innerHTML = orders
    .map((ord) => {
      const items = ord.order_items || []
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
            ${items
              .map(
                (i) => `
              <div class="admin-order-item">
                <span>${i.qty}× ${escapeHtml(i.product_name)} (${escapeHtml(i.weight)})</span>
                <span>₹${i.line_total}</span>
              </div>`
              )
              .join('')}
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
      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: 'fulfilled' })
        .eq('id', id)
      if (updErr) alert(updErr.message)
      else loadOrders()
    })
  })
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
    loadOrders()
  } else {
    showLogin()
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showOrders()
      loadOrders()
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
  }
})

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  showLogin()
})

refreshBtn.addEventListener('click', loadOrders)

init()
