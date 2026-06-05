import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { initSiteNav, initHeroPageNavScroll } from './shared/nav.js'
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

const mobileScrubMq = window.matchMedia('(max-width: 768px)')
const canHeroScrub = !prefersReducedMotion

if (!prefersReducedMotion) {
  document.documentElement.classList.add('motion-enhanced')

  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    smoothTouch: mobileScrubMq.matches,
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
    const heroVisual = canHeroScrub ? '.hero-scrub-video' : '.hero-bg-image'

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(heroVisual, { scale: 1.06, opacity: 0, duration: 1.4 })
      .from('.hero-pretitle',    { opacity: 0, y: 8,  duration: 0.65 }, '-=0.9')
      .from('.hero-brand-title', { opacity: 0, y: 28, duration: 0.85 }, '-=0.5')
      .from('.hero-tagline',     { opacity: 0, y: 18, duration: 0.75 }, '-=0.55')
      .from('.hero-subtitle',    { opacity: 0, y: 12, duration: 0.65 }, '-=0.45')
      .from('.hero-ctas',        { opacity: 0, y: 8,  duration: 0.55 }, '-=0.35')

    if (canHeroScrub) {
      initHeroScrollScrub()
    }

    initHeroPageNavScroll()
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

  window.addEventListener('load', () => {
    initHeroPageNavScroll()
  })
}

/** Pin hero and scrub halwa video to scroll position on motion-capable devices. */
function initHeroScrollScrub() {
  const hero = document.querySelector('#hero')
  const video = document.querySelector('.hero-scrub-video')
  if (!hero || !video) return

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  let heroScrubTrigger = null
  let seekThreshold = mobileScrubMq.matches ? 0.06 : 0.034
  let pendingProgress = 0
  let seekScheduled = false

  const getScrubSettings = () => {
    const isMobile = mobileScrubMq.matches
    return {
      isMobile,
      pinEnd: isMobile ? '+=200%' : '+=300%',
      scrub: isMobile ? 0.8 : true,
      seekThreshold: isMobile ? 0.06 : 0.034,
      src: isMobile
        ? video.dataset.mobileSrc || video.dataset.desktopSrc
        : video.dataset.desktopSrc || video.dataset.mobileSrc,
      poster: isMobile
        ? video.dataset.mobilePoster || video.getAttribute('poster')
        : video.getAttribute('poster'),
      readyState: isIOS ? 3 : 2,
      readyEvent: isIOS ? 'canplay' : 'loadeddata',
    }
  }

  const seekToProgress = (progress) => {
    const duration = video.duration
    if (!duration || !Number.isFinite(duration)) return
    const targetTime = progress * duration
    if (Math.abs(video.currentTime - targetTime) > seekThreshold) {
      video.currentTime = targetTime
      video.pause()
    }
  }

  const scheduleSeek = (progress) => {
    pendingProgress = progress
    if (seekScheduled) return

    seekScheduled = true
    requestAnimationFrame(() => {
      seekToProgress(pendingProgress)
      seekScheduled = false
    })
  }

  const killHeroScrub = () => {
    if (heroScrubTrigger) {
      heroScrubTrigger.kill()
      heroScrubTrigger = null
    }
  }

  const disableScrub = () => {
    killHeroScrub()
    document.documentElement.classList.remove('hero-scrub-active')
    ScrollTrigger.refresh()
  }

  const enableScrub = () => {
    if (heroScrubTrigger) return

    const settings = getScrubSettings()
    seekThreshold = settings.seekThreshold
    video.pause()
    seekToProgress(0)

    heroScrubTrigger = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: settings.pinEnd,
      pin: true,
      pinSpacing: true,
      scrub: settings.scrub,
      invalidateOnRefresh: true,
      onUpdate: (self) => scheduleSeek(self.progress),
    })

    ScrollTrigger.refresh()
  }

  const loadVideoForViewport = () => {
    const settings = getScrubSettings()
    seekThreshold = settings.seekThreshold

    if (!settings.src) {
      disableScrub()
      return
    }

    if (video.getAttribute('src') !== settings.src) {
      video.setAttribute('src', settings.src)
    }

    if (settings.poster && video.getAttribute('poster') !== settings.poster) {
      video.setAttribute('poster', settings.poster)
    }

    document.documentElement.classList.add('hero-scrub-active')
    video.preload = 'auto'
    video.load()

    if (video.readyState >= 1) {
      onVideoReady()
    } else {
      video.addEventListener('loadedmetadata', onVideoReady, { once: true })
    }
  }

  const onVideoReady = () => {
    const settings = getScrubSettings()
    seekThreshold = settings.seekThreshold

    if (video.readyState >= settings.readyState) {
      enableScrub()
    } else {
      video.addEventListener(settings.readyEvent, enableScrub, { once: true })
    }
  }

  loadVideoForViewport()

  video.addEventListener('error', () => {
    disableScrub()
  })

  let resizeTimer
  let wasMobile = mobileScrubMq.matches
  const refreshHeroScrub = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const isMobile = mobileScrubMq.matches

      if (isMobile !== wasMobile) {
        wasMobile = isMobile
        killHeroScrub()
        loadVideoForViewport()
        return
      }

      ScrollTrigger.refresh()
    }, 180)
  }

  window.addEventListener('resize', refreshHeroScrub, { passive: true })
  window.addEventListener('orientationchange', refreshHeroScrub, { passive: true })
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

  // Set initial hidden state for content children
  gsap.set(contentChildren, { opacity: 0, x: -22 })

  // Stagger content in from the left as section enters viewport
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
          // Light up feature icons after they've slid in
          section.querySelectorAll('.pouch-feature-icon').forEach((icon) => {
            icon.classList.add('icon-lit')
          })
        },
      })
    },
  })

  // Pouch image: scale up from slightly small, then float
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
            // Continuous gentle float after entrance
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
