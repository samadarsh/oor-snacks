import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { initSiteNav } from './shared/nav.js'
import { initScrollReveals } from './shared/motion.js'
import { onCartChange, syncCartBadge, updateProductButtons } from './cart.js'
import { initResponsiveImages } from './shared/responsive-img.js'

const HERO_INTRO_KEY = 'oor-hero-intro-seen'

document.body.classList.add('page-hero')
initSiteNav()
syncCartBadge()
initResponsiveImages()
initHomepageCart()
updateProductButtons()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const mobileMq = window.matchMedia('(max-width: 768px)')
const canHeroIntro = !prefersReducedMotion
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
    smoothTouch: mobileMq.matches,
  })

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true })
      }
      return lenis.scroll
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }
    },
  })

  lenis.on('scroll', ScrollTrigger.update)
  ScrollTrigger.addEventListener('refresh', () => lenis.resize())

  window.addEventListener('load', () => {
    if (canHeroIntro) {
      initHeroIntroVideo()
    } else {
      revealHeroContentStatic()
    }
  })

  initScrollReveals()
  initCraftCinematicVideo()
  initCraftSection()
  initPouchSection()
} else {
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    el.style.opacity = '1'
    el.style.transform = 'none'
  })
}

const heroRevealTargets = [
  '.hero-pretitle',
  '.hero-brand-title',
  '.hero-tagline',
  '.hero-subtitle',
  '.hero-ctas',
  '.scroll-indicator',
]

function revealHeroContentAnimated() {
  document.documentElement.classList.remove('hero-intro-playing')
  document.documentElement.classList.add('hero-intro-complete')

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to('.hero-pretitle',    { opacity: 1, y: 0, duration: 0.65 })
    .to('.hero-brand-title', { opacity: 1, y: 0, duration: 0.85 }, '-=0.45')
    .to('.hero-tagline',     { opacity: 1, y: 0, duration: 0.75 }, '-=0.55')
    .to('.hero-subtitle',    { opacity: 1, y: 0, duration: 0.65 }, '-=0.45')
    .to('.hero-ctas',        { opacity: 1, y: 0, duration: 0.55 }, '-=0.35')
    .to('.scroll-indicator', { opacity: 0.85, duration: 0.5 }, '-=0.2')
}

function revealHeroContentStatic() {
  document.documentElement.classList.add('hero-intro-complete')
  gsap.set(heroRevealTargets, { opacity: 1, y: 0 })
  gsap.set('.scroll-indicator', { opacity: 0.85 })
}

function hideHeroContentForIntro() {
  gsap.set(heroRevealTargets, { opacity: 0, y: 18 })
}

/** Autoplay halwa intro on first visit; final frame becomes the hero background. */
function initHeroIntroVideo() {
  const video = document.querySelector('.hero-intro-video')
  if (!video) return

  const isMobile = mobileMq.matches
  const src = isMobile
    ? video.dataset.mobileSrc || video.dataset.desktopSrc
    : video.dataset.desktopSrc || video.dataset.mobileSrc
  const poster = isMobile
    ? video.dataset.mobilePoster || video.getAttribute('poster')
    : video.getAttribute('poster')
  const hasSeenIntro = localStorage.getItem(HERO_INTRO_KEY) === '1'

  const settleOnFinalFrame = () => {
    const duration = video.duration
    if (duration && Number.isFinite(duration)) {
      video.currentTime = Math.max(0, duration - 0.05)
    }
    video.pause()
  }

  const finishIntro = () => {
    settleOnFinalFrame()
    localStorage.setItem(HERO_INTRO_KEY, '1')
    revealHeroContentAnimated()
  }

  const showFinalHero = () => {
    settleOnFinalFrame()
    document.documentElement.classList.add('hero-intro-complete')
    revealHeroContentStatic()
  }

  const failIntro = () => {
    document.documentElement.classList.remove('hero-intro-active', 'hero-intro-playing')
    revealHeroContentStatic()
  }

  if (!src) {
    failIntro()
    return
  }

  if (video.getAttribute('src') !== src) {
    video.setAttribute('src', src)
  }
  if (poster && video.getAttribute('poster') !== poster) {
    video.setAttribute('poster', poster)
  }

  document.documentElement.classList.add('hero-intro-active')
  video.preload = 'auto'
  video.load()

  const playIntro = async () => {
    if (hasSeenIntro) {
      showFinalHero()
      return
    }

    hideHeroContentForIntro()
    document.documentElement.classList.add('hero-intro-playing')

    try {
      video.currentTime = 0
      await video.play()
    } catch {
      finishIntro()
      return
    }

    video.addEventListener('ended', finishIntro, { once: true })
  }

  const onReady = () => {
    if (video.readyState >= 3) {
      playIntro()
      return
    }
    video.addEventListener('canplay', () => playIntro(), { once: true })
  }

  video.addEventListener('error', failIntro, { once: true })

  if (video.readyState >= 1) {
    onReady()
  } else {
    video.addEventListener('loadedmetadata', onReady, { once: true })
  }
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

/** Craft section — sequential copy reveal + video/image scale entrance. */
function initCraftSection() {
  const section = document.querySelector('#craft')
  if (!section) return

  const copyChildren = [
    section.querySelector('.section-tag'),
    section.querySelector('.story-tamil-line'),
    section.querySelector('.section-title'),
    section.querySelector('.craft-moment-lead'),
  ].filter(Boolean)

  const figure = section.querySelector('.craft-animate-figure')

  gsap.set(copyChildren, { opacity: 0, x: -22 })

  ScrollTrigger.create({
    trigger: section,
    start: 'top 75%',
    once: true,
    onEnter: () => {
      gsap.to(copyChildren, {
        opacity: 1,
        x: 0,
        duration: 0.72,
        ease: 'power3.out',
        stagger: 0.1,
      })
    },
  })

  if (figure) {
    gsap.set(figure, { opacity: 0, scale: 0.94, y: 20 })

    ScrollTrigger.create({
      trigger: section,
      start: 'top 70%',
      once: true,
      onEnter: () => {
        gsap.to(figure, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.0,
          ease: 'power3.out',
        })
      },
    })
  }
}

/** Packaging section — sequential content reveal + floating pouch entrance. */
function initPouchSection() {
  const section = document.querySelector('#freshness')
  if (!section) return

  const img = section.querySelector('.pouch-static-img')
  const features = section.querySelectorAll('.pouch-feature-item')

  const contentChildren = [
    section.querySelector('.section-tag'),
    section.querySelector('.story-tamil-line'),
    section.querySelector('.section-title'),
    section.querySelector('.pouch-lead'),
    ...features,
  ].filter(Boolean)

  gsap.set(contentChildren, { opacity: 0, x: -22 })

  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    once: true,
    onEnter: () => {
      gsap.to(contentChildren, {
        opacity: 1,
        x: 0,
        duration: 0.72,
        ease: 'power3.out',
        stagger: 0.1,
        onComplete: () => {
          section.querySelectorAll('.pouch-feature-icon').forEach((icon) => {
            icon.classList.add('icon-lit')
          })
        },
      })
    },
  })

  if (img) {
    gsap.set(img, { opacity: 0, scale: 0.86 })

    ScrollTrigger.create({
      trigger: section,
      start: 'top 68%',
      once: true,
      onEnter: () => {
        gsap.to(img, {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: 'power3.out',
          onComplete: () => {
            gsap.to(img, {
              y: -12,
              duration: 2.8,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
            })
          },
        })
      },
    })
  }
}

/** Homepage featured product cards add-to-cart logic. */
function initHomepageCart() {
  onCartChange(() => {
    syncCartBadge()
    updateProductButtons()
  })
}
