import './style.css'
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import { addToCart, onCartChange, syncCartBadge } from './cart.js'

initSiteNav()
syncCartBadge()
initScrollReveals()

document.body.classList.add('page-products')

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

  addBtn.addEventListener('click', () => {
    const id = card.getAttribute('data-id')
    const name = card.getAttribute('data-name')
    const basePrice = parseInt(card.getAttribute('data-base-price'), 10)
    const img = card.querySelector('.product-img')?.getAttribute('src') || ''

    const select = card.querySelector('.weight-select')
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

onCartChange(() => syncCartBadge())
