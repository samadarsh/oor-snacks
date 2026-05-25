import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import { syncCartBadge } from './cart.js'

document.body.classList.add('page-hero')
initSiteNav()
syncCartBadge()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let lenis = null

const scrollToSection = (selector) => {
  const el = document.querySelector(selector)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.1 })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

document.querySelectorAll('.nav-anchor').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href')
    if (href?.startsWith('#') && href.length > 1) {
      e.preventDefault()
      scrollToSection(href)
      document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false')
      document.querySelector('.mobile-nav-toggle')?.classList.remove('open')
      document.querySelector('.nav-menu')?.classList.remove('open')
      document.body.classList.remove('nav-open')
    }
  })
})

if (!prefersReducedMotion) {
  document.documentElement.classList.add('motion-enhanced')

  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    smoothTouch: false,
  })

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  window.addEventListener('load', () => {
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from('.hero-bg-image', { scale: 1.03, opacity: 0, duration: 1.2 })
      .from('.text-reveal', { opacity: 0, y: 10, stagger: 0.07, duration: 0.75 }, '-=0.9')
      .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.4')

    gsap.to('.hero-bg-image', {
      yPercent: 3,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    })
  })

  initScrollReveals()
} else {
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    el.style.opacity = '1'
    el.style.transform = 'none'
  })
}
