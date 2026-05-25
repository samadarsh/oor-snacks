import './style.css'
import { SITE } from './config.js'
import { saveOrderToSupabase } from './orders-api.js'
import { initSupabase, warmSupabase } from './supabase.js'
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import {
  hydrateCart,
  getCart,
  getCartCount,
  getCartSubtotal,
  clearCart,
  onCartChange,
  syncCartBadge,
  renderCartItemsHtml,
  bindCartQtyButtons,
} from './cart.js'

initSiteNav()
warmSupabase()
syncCartBadge()
initScrollReveals()
document.body.classList.add('page-shop')

const itemsList = document.getElementById('shop-cart-items')
const emptyState = document.getElementById('shop-cart-empty')
const summaryBlock = document.getElementById('shop-checkout-block')
const subtotalEl = document.getElementById('shop-subtotal-amount')
const shippingEl = document.getElementById('shop-shipping-amount')
const totalEl = document.getElementById('shop-total-amount')

const getOrderTotals = () => {
  const subtotal = getCartSubtotal()
  const shipping = subtotal >= SITE.freeShippingMin ? 0 : SITE.shippingFee
  return { subtotal, shipping, total: subtotal + shipping }
}

const cartPanel = document.querySelector('.shop-cart-panel')

const setShopCartVisible = (hasItems) => {
  cartPanel?.classList.toggle('shop-cart-panel--has-items', hasItems)
  if (hasItems) {
    emptyState?.setAttribute('hidden', '')
    itemsList?.removeAttribute('hidden')
    summaryBlock?.removeAttribute('hidden')
  } else {
    emptyState?.removeAttribute('hidden')
    itemsList?.setAttribute('hidden', '')
    summaryBlock?.setAttribute('hidden', '')
  }
}

const syncShopUI = () => {
  hydrateCart()
  const count = getCartCount()
  const { subtotal, shipping, total } = getOrderTotals()

  syncCartBadge()
  setShopCartVisible(count > 0)

  if (count === 0) return

  if (itemsList) {
    itemsList.innerHTML = renderCartItemsHtml()
    bindCartQtyButtons(itemsList)
  }

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `₹${shipping}`
  if (totalEl) totalEl.textContent = `₹${total}`
}

onCartChange(syncShopUI)
syncShopUI()

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

const buildCartItemsText = (cartSnapshot) =>
  cartSnapshot
    .map((item) => `- ${item.qty}x ${item.name} (${item.weight}) — ₹${item.price * item.qty}`)
    .join('\n')

const websiteOrderSubmit = document.getElementById('website-order-submit')
const DEFAULT_SUBMIT_LABEL = 'Place order'

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
  orderSuccessClose?.focus()
}

const closeOrderSuccessModal = () => {
  if (!orderSuccessModal) return
  orderSuccessModal.classList.remove('open')
  orderSuccessModal.setAttribute('aria-hidden', 'true')
  setSubmitButtonBusy(false)
}

orderSuccessClose?.addEventListener('click', closeOrderSuccessModal)
orderSuccessModal?.querySelector('.order-modal-overlay')?.addEventListener('click', closeOrderSuccessModal)

if (websiteOrderForm) {
  websiteOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (getCart().length === 0) return

    const name = document.getElementById('cust-name').value.trim()
    const address = document.getElementById('cust-address').value.trim()
    const mobileDigits = normalizeIndianMobile(document.getElementById('cust-mobile').value)

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
    const cartSnapshot = getCart().map((item) => ({ ...item }))

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
            ? 'Checkout is unavailable right now. Please use WhatsApp below.'
            : result.error || 'Could not place your order. Try again or use WhatsApp.'
          websiteOrderError.hidden = false
        }
      } else if (websiteOrderError) {
        websiteOrderError.textContent =
          'Checkout is unavailable right now. Use WhatsApp below or contact us.'
        websiteOrderError.hidden = false
      }

      if (!saved) {
        setSubmitButtonBusy(false)
        return
      }

      clearCart()
      websiteOrderForm.reset()
      setSubmitButtonBusy(false)
      openOrderSuccessModal(mobileDigits)
      syncShopUI()
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

if (whatsappOrderBtn) {
  whatsappOrderBtn.addEventListener('click', () => {
    if (getCart().length === 0) return
    const { subtotal, shipping, total } = getOrderTotals()
    const itemsText = buildCartItemsText(getCart())

    const whatsappMsg = `Hello Oor Snacks! I'd like to order via WhatsApp:

*Order Items*
${itemsText}

*Summary*
Subtotal: ₹${subtotal}
Shipping: ${shipping === 0 ? 'FREE' : `₹${shipping}`}
*Estimated total: ₹${total}*

I will share my name, mobile number, and delivery address here.`

    window.open(
      `https://api.whatsapp.com/send?phone=${SITE.whatsappPhone}&text=${encodeURIComponent(whatsappMsg)}`,
      '_blank'
    )
  })
}
