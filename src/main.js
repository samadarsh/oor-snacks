import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from './config.js'
import { saveOrderToSupabase } from './orders-api.js'
import { initSupabase, warmSupabase } from './supabase.js'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const escapeHtml = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Accessibility check
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* -------------------------------------------------------------
 * Smooth Momentum Scrolling (Lenis)
 * ------------------------------------------------------------- */
let lenis
if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.0, // Light and responsive scrolling
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    smoothTouch: false,
  })

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}

/* -------------------------------------------------------------
 * Navigation Header Scroll Transition
 * ------------------------------------------------------------- */
const navbar = document.getElementById('navbar')
const checkNavbarScroll = () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled')
  } else {
    navbar.classList.remove('scrolled')
  }
}
window.addEventListener('scroll', checkNavbarScroll)
checkNavbarScroll()

/* -------------------------------------------------------------
 * Mobile Hamburger Menu Toggle
 * ------------------------------------------------------------- */
const mobileToggle = document.querySelector('.mobile-nav-toggle')
const navMenu = document.querySelector('.nav-menu')
const navLinks = document.querySelectorAll('.nav-link')

mobileToggle.addEventListener('click', () => {
  const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true'
  mobileToggle.setAttribute('aria-expanded', !isExpanded)
  mobileToggle.classList.toggle('open')
  navMenu.classList.toggle('open')
  
  if (lenis) {
    if (!isExpanded) lenis.stop()
    else lenis.start()
  }
})

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const targetId = link.getAttribute('href')
    
    mobileToggle.setAttribute('aria-expanded', 'false')
    mobileToggle.classList.remove('open')
    navMenu.classList.remove('open')
    if (lenis) lenis.start()

    const targetEl = document.querySelector(targetId)
    if (targetEl) {
      if (lenis) {
        lenis.scrollTo(targetEl, { offset: -70 })
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })
})

/* -------------------------------------------------------------
 * E-commerce Shopping Cart Logic (State Management)
 * ------------------------------------------------------------- */
let cart = JSON.parse(localStorage.getItem('oor_cart') || '[]')

const updateCartStorage = () => {
  localStorage.setItem('oor_cart', JSON.stringify(cart))
  syncCartUI()
}

// Add Item to Cart
const addToCart = (id, name, weight, price, img) => {
  const existingItemIndex = cart.findIndex(item => item.id === id && item.weight === weight)
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += 1
  } else {
    cart.push({ id, name, weight, price, qty: 1, img })
  }
  
  updateCartStorage()
  openCartDrawer()
}

// Update quantity
const updateQty = (id, weight, change) => {
  const index = cart.findIndex(item => item.id === id && item.weight === weight)
  if (index === -1) return
  
  cart[index].qty += change
  if (cart[index].qty <= 0) {
    cart.splice(index, 1)
  }
  
  updateCartStorage()
}

// Calculate totals
const getCartCount = () => cart.reduce((total, item) => total + item.qty, 0)
const getCartSubtotal = () => cart.reduce((total, item) => total + (item.price * item.qty), 0)

// Sync UI Elements
const syncCartUI = () => {
  const count = getCartCount()
  const subtotal = getCartSubtotal()
  const isMobile = window.innerWidth <= 768
  
  // 1. Badge count
  document.getElementById('cart-badge-count').textContent = count
  
  // 2. Empty state toggle
  const emptyState = document.getElementById('cart-empty-state')
  const itemsList = document.getElementById('cart-items-list')
  const summarySection = document.getElementById('cart-summary-section')
  
  if (count === 0) {
    emptyState.style.display = 'flex'
    itemsList.setAttribute('hidden', 'true')
    summarySection.setAttribute('hidden', 'true')
  } else {
    emptyState.style.display = 'none'
    itemsList.removeAttribute('hidden')
    summarySection.removeAttribute('hidden')
  }

  // 3. Subtotal
  document.getElementById('cart-subtotal-amount').textContent = `₹${subtotal}`

  // 4. Render Cart Items List
  itemsList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}" class="cart-item-img" />
      <div class="cart-item-info">
        <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
        <span class="cart-item-meta">${escapeHtml(item.weight)} &bull; ₹${item.price}</span>
        <div class="cart-item-qty-row">
          <div class="qty-control">
            <button class="qty-btn dec-btn" data-id="${item.id}" data-weight="${item.weight}">&minus;</button>
            <span class="qty-number">${item.qty}</span>
            <button class="qty-btn inc-btn" data-id="${item.id}" data-weight="${item.weight}">+</button>
          </div>
        </div>
      </div>
      <strong class="cart-item-price">₹${item.price * item.qty}</strong>
    </div>
  `).join('')

  // 5. Quantity adjust listeners
  itemsList.querySelectorAll('.dec-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQty(btn.getAttribute('data-id'), btn.getAttribute('data-weight'), -1)
    })
  })
  
  itemsList.querySelectorAll('.inc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQty(btn.getAttribute('data-id'), btn.getAttribute('data-weight'), 1)
    })
  })

  // 6. Mobile sticky cart bar toggle
  const stickyCartBar = document.getElementById('mobile-sticky-cart')
  if (stickyCartBar) {
    if (count > 0 && isMobile) {
      stickyCartBar.classList.add('active')
      stickyCartBar.removeAttribute('hidden')
      stickyCartBar.setAttribute('aria-hidden', 'false')
      document.getElementById('mobile-cart-item-count').textContent = `${count} Item${count > 1 ? 's' : ''}`
      document.getElementById('mobile-cart-total-amount').textContent = `₹${subtotal}`
    } else {
      stickyCartBar.classList.remove('active')
      stickyCartBar.setAttribute('hidden', 'true')
      stickyCartBar.setAttribute('aria-hidden', 'true')
    }
  }
}

/* -------------------------------------------------------------
 * Shopping Cart Drawer UI Toggle
 * ------------------------------------------------------------- */
const cartDrawer = document.getElementById('cart-drawer')
const cartToggle = document.getElementById('cart-toggle')
const cartClose = document.getElementById('cart-close')
const cartShopNow = document.getElementById('cart-shop-now')
const mobileViewCartBtn = document.getElementById('mobile-view-cart-btn')

const openCartDrawer = () => {
  cartDrawer.classList.add('open')
  cartDrawer.setAttribute('aria-hidden', 'false')
  if (lenis) lenis.stop()
}

const closeCartDrawer = () => {
  cartDrawer.classList.remove('open')
  cartDrawer.setAttribute('aria-hidden', 'true')
  if (lenis) lenis.start()
}

if (cartToggle && cartDrawer) {
  cartToggle.addEventListener('click', openCartDrawer)
  cartClose.addEventListener('click', closeCartDrawer)
  cartDrawer.querySelector('.cart-drawer-overlay').addEventListener('click', closeCartDrawer)
  
  if (cartShopNow) {
    cartShopNow.addEventListener('click', () => {
      closeCartDrawer()
      const shopEl = document.getElementById('best-sellers')
      if (shopEl) {
        if (lenis) lenis.scrollTo(shopEl, { offset: -70 })
        else shopEl.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }

  if (mobileViewCartBtn) {
    mobileViewCartBtn.addEventListener('click', openCartDrawer)
  }
}

// Adjust cart bar visibility on viewport resize
window.addEventListener('resize', syncCartUI)

/* -------------------------------------------------------------
 * Cart triggers on Product Cards (Add to Cart)
 * ------------------------------------------------------------- */
const productCards = document.querySelectorAll('.product-card')
productCards.forEach(card => {
  const addBtn = card.querySelector('.add-to-cart-btn')
  if (!addBtn) return
  
  addBtn.addEventListener('click', () => {
    const id = card.getAttribute('data-id')
    const name = card.getAttribute('data-name')
    const basePrice = parseInt(card.getAttribute('data-base-price'))
    const img = card.querySelector('.product-img').getAttribute('src')
    
    // Check if there's a weight selector, otherwise default to weightless combo price
    const select = card.querySelector('.weight-select')
    let weight = 'Pack'
    let price = basePrice
    
    if (select) {
      const option = select.options[select.selectedIndex]
      weight = option.value
      const multiplier = parseFloat(option.getAttribute('data-multiplier') || '1.0')
      price = Math.round(basePrice * multiplier)
    }
    
    addToCart(id, name, weight, price, img)
  })
})

/* -------------------------------------------------------------
 * Checkout: website order vs WhatsApp (separate flows)
 * ------------------------------------------------------------- */
const websiteOrderForm = document.getElementById('cart-website-order-form')
const whatsappOrderBtn = document.getElementById('cart-whatsapp-order')
const orderSuccessModal = document.getElementById('order-success-modal')
const orderSuccessClose = document.getElementById('order-success-close')
const websiteOrderError = document.getElementById('website-order-error')

const normalizeIndianMobile = (raw) => {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return null
}

const formatMobileDisplay = (digits10) => `+91 ${digits10.slice(0, 5)} ${digits10.slice(5)}`

const getOrderTotals = () => {
  const subtotal = getCartSubtotal()
  const shipping = subtotal >= SITE.freeShippingMin ? 0 : SITE.shippingFee
  return { subtotal, shipping, total: subtotal + shipping }
}

const buildCartItemsText = (cartSnapshot) =>
  cartSnapshot
    .map((item) => `- ${item.qty}x ${item.name} (${item.weight}) — ₹${item.price * item.qty}`)
    .join('\n')

const websiteOrderSubmit = document.getElementById('website-order-submit')
const DEFAULT_SUBMIT_LABEL = 'Place order on website'

const setSubmitButtonBusy = (busy) => {
  if (!websiteOrderSubmit) return
  websiteOrderSubmit.disabled = busy
  const textEl = websiteOrderSubmit.querySelector('.checkout-btn-text')
  if (textEl) textEl.textContent = busy ? 'One moment…' : DEFAULT_SUBMIT_LABEL
  if (busy) websiteOrderSubmit.setAttribute('aria-busy', 'true')
  else websiteOrderSubmit.removeAttribute('aria-busy')
}

const openOrderSuccessModal = (mobileDigits) => {
  if (!orderSuccessModal) return
  const msgEl = document.getElementById('order-success-message')
  if (msgEl) {
    msgEl.textContent = `Thank you. We have received your order and will contact you on ${formatMobileDisplay(mobileDigits)} shortly.`
  }
  orderSuccessModal.classList.add('open')
  orderSuccessModal.setAttribute('aria-hidden', 'false')
  if (lenis) lenis.stop()
  orderSuccessClose?.focus()
}

const closeOrderSuccessModal = () => {
  if (!orderSuccessModal) return
  orderSuccessModal.classList.remove('open')
  orderSuccessModal.setAttribute('aria-hidden', 'true')
  if (lenis) lenis.start()
  setSubmitButtonBusy(false)
}

orderSuccessClose?.addEventListener('click', closeOrderSuccessModal)
orderSuccessModal?.querySelector('.order-modal-overlay')?.addEventListener('click', closeOrderSuccessModal)

/* Flow 1 — Place order on website (name, mobile, address → Supabase → success modal) */
if (websiteOrderForm) {
  websiteOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (cart.length === 0) return

    const name = document.getElementById('cust-name').value.trim()
    const address = document.getElementById('cust-address').value.trim()
    const mobileRaw = document.getElementById('cust-mobile').value
    const mobileDigits = normalizeIndianMobile(mobileRaw)

    if (websiteOrderError) websiteOrderError.hidden = true

    if (!name || !address || !mobileDigits) {
      if (websiteOrderError) {
        websiteOrderError.textContent =
          'Please enter your name, a valid 10-digit mobile number, and delivery address.'
        websiteOrderError.hidden = false
      }
      return
    }

    const { subtotal, shipping, total } = getOrderTotals()
    const cartSnapshot = cart.map((item) => ({ ...item }))

    setSubmitButtonBusy(true)

    let saved = false

    try {
      const { configured } = await initSupabase()
      if (configured) {
        const result = await saveOrderToSupabase({
          customerName: name,
          customerAddress: address,
          customerPhone: mobileDigits,
          subtotal,
          shipping,
          total,
          cartItems: cartSnapshot,
        })
        saved = result.ok
        if (!saved && websiteOrderError) {
          websiteOrderError.textContent = result.skipped
            ? 'Online ordering is not configured yet. Please use Order via WhatsApp.'
            : result.error || 'Could not place order. Try again or use WhatsApp.'
          websiteOrderError.hidden = false
        }
      } else if (websiteOrderError) {
        websiteOrderError.textContent =
          'Online ordering is not set up yet. Open /oor-config.json on this site — if configured is false, add Supabase env vars in Vercel (Production) and redeploy. Or use Order via WhatsApp.'
        websiteOrderError.hidden = false
      }

      if (!saved) {
        setSubmitButtonBusy(false)
        return
      }

      cart = []
      updateCartStorage()
      websiteOrderForm.reset()
      closeCartDrawer()
      setSubmitButtonBusy(false)
      openOrderSuccessModal(mobileDigits)
    } catch (err) {
      console.error('[Oor] checkout failed:', err)
      setSubmitButtonBusy(false)
      if (websiteOrderError) {
        websiteOrderError.textContent =
          'Something went wrong. Please try again or use Order via WhatsApp.'
        websiteOrderError.hidden = false
      }
    }
  })
}

/* Flow 2 — Order via WhatsApp (cart only, no form, does not save to website backend) */
if (whatsappOrderBtn) {
  whatsappOrderBtn.addEventListener('click', () => {
    if (cart.length === 0) return

    const { subtotal, shipping, total } = getOrderTotals()
    const cartSnapshot = cart.map((item) => ({ ...item }))
    const itemsText = buildCartItemsText(cartSnapshot)

    const whatsappMsg = `Hello Oor Snacks! I'd like to order via WhatsApp:

*Order Items*
${itemsText}

*Summary*
Subtotal: ₹${subtotal}
Shipping: ${shipping === 0 ? 'FREE' : `₹${shipping}`}
*Estimated total: ₹${total}*

I will share my name, mobile number, and delivery address here.`

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${SITE.whatsappPhone}&text=${encodeURIComponent(whatsappMsg)}`
    window.open(whatsappUrl, '_blank')
  })
}

/* -------------------------------------------------------------
 * Incoming Orders Dashboard Drawer (Admin FOH Portal)
 * ------------------------------------------------------------- */
const fohTrigger = document.getElementById('foh-portal-trigger')
const fohPortal = document.getElementById('foh-portal')
const fohClose = document.querySelector('.foh-portal-close')
const fohClear = document.querySelector('.foh-clear-all')

const deleteOrder = (id) => {
  let orders = JSON.parse(localStorage.getItem('oor_orders') || '[]')
  orders = orders.filter(o => o.id !== id)
  localStorage.setItem('oor_orders', JSON.stringify(orders))
  renderOrdersLedger()
}

const clearAllOrders = () => {
  localStorage.removeItem('oor_orders')
  renderOrdersLedger()
}

const renderOrdersLedger = () => {
  const listEl = document.getElementById('foh-ledger-list')
  if (!listEl) return
  
  const orders = JSON.parse(localStorage.getItem('oor_orders') || '[]')
  
  if (orders.length === 0) {
    listEl.innerHTML = `
      <div class="foh-empty-state">
        <p>No customer order requests found.</p>
      </div>
    `
    return
  }
  
  // Sort reverse-chronological (newest first)
  orders.sort((a, b) => b.id - a.id)
  
  listEl.innerHTML = orders.map(ord => {
    const timeStr = new Date(ord.id).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const dateStr = new Date(ord.id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    return `
      <div class="foh-ledger-card">
        <div class="foh-card-header">
          <strong>${escapeHtml(ord.name)}</strong>
          <span class="foh-card-tag">Pending Dispatch</span>
        </div>
        <div class="foh-card-details">
          <p><span>Address:</span> ${escapeHtml(ord.address)}</p>
          <p><span>Time:</span> ${escapeHtml(dateStr)} at ${escapeHtml(timeStr)}</p>
          <div class="foh-order-items">
            ${ord.items.map(i => `
              <div class="foh-order-item">
                <span>${i.qty}x ${escapeHtml(i.name)} (${escapeHtml(i.weight)})</span>
                <span>₹${i.total}</span>
              </div>
            `).join('')}
          </div>
          <div class="foh-order-total-row">
            <span>Total Bill:</span>
            <span>₹${ord.total}</span>
          </div>
        </div>
        <button class="foh-delete-btn" data-id="${ord.id}">Fulfill Order</button>
      </div>
    `
  }).join('')

  listEl.querySelectorAll('.foh-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'))
      if (confirm('Mark this customer order as Fulfilled and Dispatch?')) {
        deleteOrder(id)
      }
    })
  })
}

if (fohTrigger && fohPortal) {
  fohTrigger.addEventListener('click', (e) => {
    e.preventDefault()
    fohPortal.classList.add('open')
    fohPortal.setAttribute('aria-hidden', 'false')
    renderOrdersLedger()
    if (lenis) lenis.stop()
  })
  
  const closeFoh = () => {
    fohPortal.classList.remove('open')
    fohPortal.setAttribute('aria-hidden', 'true')
    if (lenis) lenis.start()
  }
  
  fohClose.addEventListener('click', closeFoh)
  fohPortal.querySelector('.foh-portal-overlay').addEventListener('click', closeFoh)
  if (fohClear) {
    fohClear.addEventListener('click', () => {
      if (confirm('Clear the entire incoming orders dashboard queue?')) {
        clearAllOrders()
      }
    })
  }
}

/* -------------------------------------------------------------
 * Cinematic motion (Apple-style: opacity + depth, low frequency)
 * ------------------------------------------------------------- */
const MOTION_EASE = 'power2.out'

if (!prefersReducedMotion) {
  document.documentElement.classList.add('motion-enhanced')

  // Hero: single soft entrance — no aggressive slide
  window.addEventListener('load', () => {
    const tl = gsap.timeline({ defaults: { ease: MOTION_EASE } })

    tl.from('.hero-bg-image', {
      scale: 1.04,
      opacity: 0,
      duration: 1.5,
    })
      .from(
        '.text-reveal',
        {
          opacity: 0,
          y: 12,
          stagger: 0.08,
          duration: 0.85,
        },
        '-=1.1'
      )
      .from('.scroll-indicator', { opacity: 0, duration: 0.6 }, '-=0.5')
  })

  // Hero parallax: subtle depth only (transform-only)
  gsap.to('.hero-bg-image', {
    yPercent: 4,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
    },
  })

  // Batched scroll reveals — one message at a time, gentle fade-up
  const revealTargets = gsap.utils.toArray('.scroll-reveal').filter(
    (el) => !el.closest('#hero')
  )

  if (revealTargets.length) {
    gsap.set(revealTargets, { opacity: 0, y: 14 })

    ScrollTrigger.batch(revealTargets, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: MOTION_EASE,
          stagger: 0.05,
          overwrite: true,
        })
      },
    })
  }
}

// Initial Sync
syncCartUI()
warmSupabase()
