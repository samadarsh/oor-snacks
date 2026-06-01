const STORAGE_KEY = 'oor_cart'

const normalizeCartItem = (item) => ({
  id: item?.id,
  name: item?.name ?? 'Item',
  weight: item?.weight ?? 'Pack',
  price: Number(item?.price) || 0,
  qty: Number(item?.qty ?? item?.quantity) || 0,
  img: item?.img ?? '',
})

const normalizeCart = (items) => {
  if (!Array.isArray(items)) return []
  return items.map(normalizeCartItem).filter((item) => item.id && item.qty > 0)
}

/** Re-read basket from localStorage (fixes bfcache / stale module state on shop page). */
export const hydrateCart = () => {
  try {
    cart = normalizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  } catch {
    cart = []
  }
  return cart
}

const escapeHtml = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let cart = []
const listeners = new Set()

hydrateCart()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      hydrateCart()
      notify()
    }
  })

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      hydrateCart()
      notify()
    }
  })
}

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

/** Sticky “View cart” bar on small screens (products page). */
export const syncMobileStickyCart = () => {
  const bar = document.getElementById('mobile-sticky-cart')
  if (!bar) return

  const count = getCartCount()
  const subtotal = getCartSubtotal()
  const isMobile = window.matchMedia('(max-width: 768px)').matches

  const countEl = document.getElementById('mobile-cart-item-count')
  const totalEl = document.getElementById('mobile-cart-total-amount')
  if (countEl) countEl.textContent = `${count} item${count === 1 ? '' : 's'}`
  if (totalEl) totalEl.textContent = `₹${subtotal}`

  if (count > 0 && isMobile) {
    bar.classList.add('active')
    bar.removeAttribute('hidden')
    bar.setAttribute('aria-hidden', 'false')
  } else {
    bar.classList.remove('active')
    bar.setAttribute('hidden', '')
    bar.setAttribute('aria-hidden', 'true')
  }
}

export const initMobileStickyCart = () => {
  if (!document.getElementById('mobile-sticky-cart')) return
  const sync = () => {
    syncCartBadge()
    syncMobileStickyCart()
  }
  window.addEventListener('resize', sync, { passive: true })
  onCartChange(sync)
  sync()
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

let toastTimer
export const showAddedToast = () => {
  if (typeof document === 'undefined') return
  let el = document.getElementById('cart-added-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'cart-added-toast'
    el.className = 'cart-added-toast'
    el.setAttribute('role', 'status')
    el.innerHTML = 'Added to basket. <a href="/shop.html">View cart & checkout</a>'
    document.body.appendChild(el)
  }
  el.classList.add('visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200)
}

export const updateProductButtons = () => {
  if (typeof document === 'undefined') return
  const cart = getCart()
  document.querySelectorAll('.product-card').forEach((card) => {
    const id = card.getAttribute('data-id')
    const select = card.querySelector('.weight-select')

    // Bind change listener to variant selector if not already bound
    if (select && !select.dataset.listenerBound) {
      select.dataset.listenerBound = 'true'
      select.addEventListener('change', () => {
        updateProductButtons()
      })
    }

    let weight = 'Pack'
    if (select) {
      weight = select.value
    }

    const cartItem = cart.find((item) => item.id === id && item.weight === weight)
    const qty = cartItem ? cartItem.qty : 0

    const row = card.querySelector('.product-purchase-row')
    if (!row) return

    let addBtn = row.querySelector('.add-to-cart-btn')
    let qtyCtrl = row.querySelector('.product-qty-control')

    if (qty > 0) {
      if (addBtn) addBtn.remove()
      if (!qtyCtrl) {
        qtyCtrl = document.createElement('div')
        qtyCtrl.className = 'qty-control product-qty-control'
        row.appendChild(qtyCtrl)
      }
      qtyCtrl.innerHTML = `
        <button type="button" class="qty-btn dec-product-qty" aria-label="Decrease quantity">&minus;</button>
        <span class="qty-number">${qty}</span>
        <button type="button" class="qty-btn inc-product-qty" aria-label="Increase quantity">+</button>
      `
      qtyCtrl.querySelector('.dec-product-qty').addEventListener('click', (e) => {
        e.stopPropagation()
        updateQty(id, weight, -1)
      })
      qtyCtrl.querySelector('.inc-product-qty').addEventListener('click', (e) => {
        e.stopPropagation()
        const name = card.getAttribute('data-name')
        const basePrice = parseInt(card.getAttribute('data-base-price'), 10)
        const img = card.querySelector('.product-img')?.getAttribute('src') || ''
        let price = basePrice
        if (select) {
          const option = select.options[select.selectedIndex]
          const multiplier = parseFloat(option.getAttribute('data-multiplier') || '1')
          price = Math.round(basePrice * multiplier)
        }
        addToCart(id, name, weight, price, img)
      })
    } else {
      if (qtyCtrl) qtyCtrl.remove()
      if (!addBtn) {
        addBtn = document.createElement('button')
        addBtn.type = 'button'
        addBtn.className = 'btn btn-primary btn-sm add-to-cart-btn'
        addBtn.textContent = 'Add to cart'
        row.appendChild(addBtn)
      }
      
      const newAddBtn = addBtn.cloneNode(true)
      addBtn.parentNode.replaceChild(newAddBtn, addBtn)
      
      newAddBtn.addEventListener('click', (e) => {
        e.preventDefault()
        const name = card.getAttribute('data-name')
        const basePrice = parseInt(card.getAttribute('data-base-price'), 10)
        const img = card.querySelector('.product-img')?.getAttribute('src') || ''
        let price = basePrice
        if (select) {
          const option = select.options[select.selectedIndex]
          const multiplier = parseFloat(option.getAttribute('data-multiplier') || '1')
          price = Math.round(basePrice * multiplier)
        }
        addToCart(id, name, weight, price, img)
        showAddedToast()
      })
    }
  })
}

onCartChange(() => {
  syncCartBadge()
  updateProductButtons()
})
syncCartBadge()
