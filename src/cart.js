const STORAGE_KEY = 'oor_cart'

const escapeHtml = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
const listeners = new Set()

export const onCartChange = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const notify = () => listeners.forEach((fn) => fn(cart))

export const getCart = () => cart

export const getCartCount = () => cart.reduce((total, item) => total + item.qty, 0)

export const getCartSubtotal = () =>
  cart.reduce((total, item) => total + item.price * item.qty, 0)

export const updateCartStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  notify()
}

export const addToCart = (id, name, weight, price, img) => {
  const existingItemIndex = cart.findIndex((item) => item.id === id && item.weight === weight)

  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += 1
  } else {
    cart.push({ id, name, weight, price, qty: 1, img })
  }

  updateCartStorage()
}

export const updateQty = (id, weight, change) => {
  const index = cart.findIndex((item) => item.id === id && item.weight === weight)
  if (index === -1) return

  cart[index].qty += change
  if (cart[index].qty <= 0) {
    cart.splice(index, 1)
  }

  updateCartStorage()
}

export const clearCart = () => {
  cart = []
  updateCartStorage()
}

export const syncCartBadge = () => {
  const badge = document.getElementById('cart-badge-count')
  if (badge) badge.textContent = String(getCartCount())
}

export const renderCartItemsHtml = () =>
  cart
    .map(
      (item) => `
    <div class="cart-item">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}" class="cart-item-img" />
      <div class="cart-item-info">
        <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
        <span class="cart-item-meta">${escapeHtml(item.weight)} &bull; ₹${item.price}</span>
        <div class="cart-item-qty-row">
          <div class="qty-control">
            <button type="button" class="qty-btn dec-btn" data-id="${item.id}" data-weight="${escapeHtml(item.weight)}">&minus;</button>
            <span class="qty-number">${item.qty}</span>
            <button type="button" class="qty-btn inc-btn" data-id="${item.id}" data-weight="${escapeHtml(item.weight)}">+</button>
          </div>
        </div>
      </div>
      <strong class="cart-item-price">₹${item.price * item.qty}</strong>
    </div>
  `
    )
    .join('')

export const bindCartQtyButtons = (container) => {
  if (!container) return
  container.querySelectorAll('.dec-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateQty(btn.getAttribute('data-id'), btn.getAttribute('data-weight'), -1)
    })
  })
  container.querySelectorAll('.inc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateQty(btn.getAttribute('data-id'), btn.getAttribute('data-weight'), 1)
    })
  })
}

onCartChange(() => syncCartBadge())
syncCartBadge()
