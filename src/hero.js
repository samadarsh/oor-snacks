import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import { onCartChange, syncCartBadge, updateProductButtons } from './cart.js'
import { initResponsiveImages } from './shared/responsive-img.js'

document.body.classList.add('page-hero')
initSiteNav()
syncCartBadge()
initResponsiveImages()
initHomepageCart()
updateProductButtons()

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
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero-bg-image', { scale: 1.06, opacity: 0, duration: 1.4 })
      .from('.hero-pretitle',    { opacity: 0, y: 8,  duration: 0.65 }, '-=0.9')
      .from('.hero-brand-title', { opacity: 0, y: 28, duration: 0.85 }, '-=0.5')
      .from('.hero-tagline',     { opacity: 0, y: 18, duration: 0.75 }, '-=0.55')
      .from('.hero-subtitle',    { opacity: 0, y: 12, duration: 0.65 }, '-=0.45')
      .from('.hero-ctas',        { opacity: 0, y: 8,  duration: 0.55 }, '-=0.35')
      .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.2')

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
  initCraftCinematicVideo()
} else {
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    el.style.opacity = '1'
    el.style.transform = 'none'
  })
}

/** Play grandma murukku clip only while the craft block is on screen. */
function initCraftCinematicVideo() {
  const video = document.querySelector('.craft-cinematic-video')
  if (!video) return

  const play = () => video.play().catch(() => {})
  const pause = () => {
    if (!video.paused) video.pause()
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) play()
        else pause()
      },
      { threshold: [0, 0.35, 0.6] }
    )
    io.observe(video)
  } else {
    play()
  }
}

/** Homepage featured product cards add-to-cart logic. */
function initHomepageCart() {
  onCartChange(() => {
    syncCartBadge()
    updateProductButtons()
  })
}
