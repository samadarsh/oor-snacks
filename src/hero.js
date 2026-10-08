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
const saveData = Boolean(navigator.connection?.saveData)
const canHeroScrub = !prefersReducedMotion && !saveData

if (!prefersReducedMotion) {
  document.documentElement.classList.add('motion-enhanced')

  // Lenis scrolls the window itself, so ScrollTrigger only needs to be told when it moves.
  // Touch keeps native scrolling (Lenis default) — it is already smooth on phones.
  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)
  ScrollTrigger.addEventListener('refresh', () => lenis.resize())

  // Pin first so the page height is final before anything else measures it.
  if (canHeroScrub) initHeroScrollScrub()
  else showHeroFallback()
  initHeroPageNavScroll()

  initScrollReveals()
  initCraftCinematicVideo()
  initCraftSection()
  initPouchSection()
} else {
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    el.style.opacity = '1'
    el.style.transform = 'none'
  })

  showHeroFallback()
  initHeroPageNavScroll()
}

/** The still hero image sits behind the scrub video, so it is only fetched when it will be shown. */
function showHeroFallback() {
  const img = document.querySelector('.hero-bg-fallback[data-fallback-responsive]')
  if (!img) return
  img.dataset.responsive = img.dataset.fallbackResponsive
  delete img.dataset.fallbackResponsive
  initResponsiveImages()
}

/**
 * Pin hero and scrub the halwa video with scroll.
 * The clips are encoded all-intra (every frame a keyframe, no B-frames) so any seek decodes a single
 * frame, and each clip is fetched whole into a blob so seeks never wait on the network.
 */
function initHeroScrollScrub() {
  const hero = document.querySelector('#hero')
  const video = document.querySelector('.hero-scrub-video')
  if (!hero || !video) {
    showHeroFallback()
    return
  }

  const root = document.documentElement
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Posters live in data attributes so phones never fetch the landscape one.
  const desktopPoster = video.dataset.desktopPoster
  const blobUrls = new Map()
  let progress = 0
  let ready = false
  let loadId = 0

  const getSource = () => {
    const isMobile = mobileScrubMq.matches
    const { desktopSrc, mobileSrc, mobilePoster } = video.dataset
    return {
      src: isMobile ? mobileSrc || desktopSrc : desktopSrc || mobileSrc,
      poster: isMobile ? mobilePoster || desktopPoster : desktopPoster,
    }
  }

  // One seek in flight at a time: setting currentTime mid-seek aborts the pending decode, so during
  // continuous scroll no frame would ever paint. 'seeked' re-runs this with the latest progress.
  const seekToProgress = () => {
    if (!ready || video.seeking) return
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) return

    if (!video.paused) video.pause()
    const target = Math.min(progress * duration, duration - 0.04)
    if (Math.abs(video.currentTime - target) > 0.02) {
      video.currentTime = target
    }
  }

  video.addEventListener('seeked', seekToProgress)

  const scrubTrigger = ScrollTrigger.create({
    id: 'hero-scrub',
    trigger: hero,
    start: 'top top',
    end: () => (mobileScrubMq.matches ? '+=200%' : '+=300%'),
    pin: true,
    pinSpacing: true,
    pinSpacer: '.hero-pin-spacer',
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      progress = self.progress
      seekToProgress()
    },
  })

  const disableScrub = () => {
    loadId += 1
    ready = false
    scrubTrigger.kill()
    root.classList.remove('hero-scrub-active')
    showHeroFallback()
    ScrollTrigger.refresh()
  }

  const waitForFirstFrame = () =>
    new Promise((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve()
        return
      }
      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.removeEventListener('error', onError)
      }
      const onLoaded = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(video.error || new Error('Hero video failed to decode'))
      }
      video.addEventListener('loadeddata', onLoaded)
      video.addEventListener('error', onError)
      // iOS won't paint seeked frames until the element has played once.
      if (isIOS) video.play().then(() => video.pause()).catch(() => {})
    })

  const loadSource = async () => {
    const id = ++loadId
    ready = false

    const { src, poster } = getSource()
    if (poster && video.getAttribute('poster') !== poster) video.setAttribute('poster', poster)
    if (!src) {
      disableScrub()
      return
    }

    try {
      let url = blobUrls.get(src)
      if (!url) {
        // Low priority so the poster and page images win the bandwidth race.
        const res = await fetch(src, { priority: 'low' })
        if (!res.ok) throw new Error(`Hero video request failed (${res.status})`)
        url = URL.createObjectURL(await res.blob())
        blobUrls.set(src, url)
      }
      if (id !== loadId) return

      video.dataset.loadedSrc = src
      video.src = url
      await waitForFirstFrame()
      if (id !== loadId) return

      ready = true
      seekToProgress()
    } catch (err) {
      if (id !== loadId) return
      console.warn('[Oor] Hero scroll video unavailable, showing still image.', err)
      disableScrub()
    }
  }

  // Poster shows while the clip downloads; the pin is already in place so nothing shifts later.
  root.classList.add('hero-scrub-active')
  video.preload = 'auto'
  loadSource()

  // ScrollTrigger refreshes on resize by itself (ignoring mobile address-bar height changes) and the
  // function-based end follows the breakpoint, so only the source swap needs handling here.
  const onBreakpointChange = () => {
    if (root.classList.contains('hero-scrub-active')) loadSource()
  }
  if (mobileScrubMq.addEventListener) mobileScrubMq.addEventListener('change', onBreakpointChange)
  else mobileScrubMq.addListener(onBreakpointChange)
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
