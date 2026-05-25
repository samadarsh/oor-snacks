import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { initSiteNav } from './shared/nav.js'
import { syncCartBadge } from './cart.js'

initSiteNav()
syncCartBadge()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion) {
  document.documentElement.classList.add('motion-enhanced')

  const lenis = new Lenis({
    duration: 1,
    smoothWheel: true,
    smoothTouch: false,
  })
  lenis.on('scroll', () => {})
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  window.addEventListener('load', () => {
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from('.hero-bg-image', { scale: 1.03, opacity: 0, duration: 1.2 })
      .from('.text-reveal', { opacity: 0, y: 10, stagger: 0.07, duration: 0.75 }, '-=0.9')
      .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.4')
  })
}

document.body.classList.add('page-hero')
