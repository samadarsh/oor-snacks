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

document.querySelectorAll('.product-card').forEach((card) => {
  const select = card.querySelector('.weight-select')
  if (select) {
    select.addEventListener('change', () => {
      updateProductButtons()
    })
  }
})

onCartChange(() => {
  syncCartBadge()
  updateProductButtons()
})

updateProductButtons()
