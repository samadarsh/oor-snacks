import './style.css'
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import { addToCart, initMobileStickyCart, onCartChange, syncCartBadge, updateProductButtons } from './cart.js'
import { initResponsiveImages } from './shared/responsive-img.js'

initSiteNav()
initResponsiveImages()
initMobileStickyCart()
initScrollReveals()
initCatalogAnchors()

document.body.classList.add('page-products', 'has-mobile-cart-bar')

const CATALOG_SCROLL_OFFSET = 88

const scrollToCatalogTarget = (selector) => {
  const target = document.querySelector(selector)
  if (!target) return
  const top = target.getBoundingClientRect().top + window.scrollY - CATALOG_SCROLL_OFFSET
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/** Smooth in-page jumps for category tiles and intro links (clears fixed header). */
function initCatalogAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute('href')
    if (!href || href === '#') return
    const target = document.querySelector(href)
    if (!target || !target.closest('.catalog-main')) return

    link.addEventListener('click', (e) => {
      e.preventDefault()
      scrollToCatalogTarget(href)
      history.replaceState(null, '', href)
    })
  })

  if (window.location.hash) {
    window.requestAnimationFrame(() => scrollToCatalogTarget(window.location.hash))
  }
}

let toastTimer
const showAddedToast = () => {
  let el = document.getElementById('cart-added-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'cart-added-toast'
    el.className = 'cart-added-toast'
    el.setAttribute('role', 'status')
    el.innerHTML =
      'Added to basket. <a href="/shop.html">View cart & checkout</a>'
    document.body.appendChild(el)
  }
  el.classList.add('visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200)
}

document.querySelectorAll('.product-card').forEach((card) => {
  const addBtn = card.querySelector('.add-to-cart-btn')
  if (!addBtn) return

  const select = card.querySelector('.weight-select')
  if (select) {
    select.addEventListener('change', () => {
      updateProductButtons()
    })
  }

  addBtn.addEventListener('click', () => {
    const id = card.getAttribute('data-id')
    const name = card.getAttribute('data-name')
    const basePrice = parseInt(card.getAttribute('data-base-price'), 10)
    const img = card.querySelector('.product-img')?.getAttribute('src') || ''

    let weight = 'Pack'
    let price = basePrice

    if (select) {
      const option = select.options[select.selectedIndex]
      weight = option.value
      const multiplier = parseFloat(option.getAttribute('data-multiplier') || '1')
      price = Math.round(basePrice * multiplier)
    }

    addToCart(id, name, weight, price, img)
    showAddedToast()
  })
})

onCartChange(() => {
  syncCartBadge()
  updateProductButtons()
})

updateProductButtons()
