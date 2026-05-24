import './style.css'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// Check accessibility settings (Reduced Motion)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* -------------------------------------------------------------
 * Smooth Momentum Scrolling (Lenis)
 * ------------------------------------------------------------- */
let lenis;
if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom physics easing
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    smoothTouch: false,
  })

  // Synchronize ScrollTrigger with Lenis
  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}

/* -------------------------------------------------------------
 * Navigation Header Scroll Transition
 * ------------------------------------------------------------- */
const navbar = document.getElementById('navbar')
const checkNavbarScroll = () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled')
  } else {
    navbar.classList.remove('scrolled')
  }
}
window.addEventListener('scroll', checkNavbarScroll)
checkNavbarScroll() // Run once on startup

/* -------------------------------------------------------------
 * Mobile Hamburger Menu Toggle
 * ------------------------------------------------------------- */
const mobileToggle = document.querySelector('.mobile-nav-toggle')
const navMenu = document.querySelector('.nav-menu')
const navLinks = document.querySelectorAll('.nav-link')

mobileToggle.addEventListener('click', () => {
  const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true'
  mobileToggle.setAttribute('aria-expanded', !isExpanded)
  mobileToggle.classList.toggle('open')
  navMenu.classList.toggle('open')
  
  // Prevent scrolling when mobile nav is open
  if (lenis) {
    if (!isExpanded) {
      lenis.stop()
    } else {
      lenis.start()
    }
  }
})

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const targetId = link.getAttribute('href')
    
    // Close mobile nav if open
    mobileToggle.setAttribute('aria-expanded', 'false')
    mobileToggle.classList.remove('open')
    navMenu.classList.remove('open')
    if (lenis) lenis.start()

    // Smooth scroll to element
    const targetEl = document.querySelector(targetId)
    if (targetEl) {
      if (lenis) {
        lenis.scrollTo(targetEl, { offset: -70 })
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })
})

/* -------------------------------------------------------------
 * Menu Category Navigation (Tabs & Accordions)
 * ------------------------------------------------------------- */
const tabs = document.querySelectorAll('.menu-tab')
const panels = document.querySelectorAll('.menu-panel')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const isMobile = window.innerWidth <= 768
    const targetPanelId = tab.getAttribute('aria-controls')
    const targetPanel = document.getElementById(targetPanelId)
    
    if (isMobile) {
      // Toggle accordion panel on mobile
      const isActive = tab.classList.contains('active')
      
      if (isActive) {
        tab.classList.remove('active')
        tab.setAttribute('aria-selected', 'false')
        targetPanel.classList.remove('active')
      } else {
        // Close other panels
        tabs.forEach(t => {
          t.classList.remove('active')
          t.setAttribute('aria-selected', 'false')
        })
        panels.forEach(p => p.classList.remove('active'))
        
        tab.classList.add('active')
        tab.setAttribute('aria-selected', 'true')
        targetPanel.classList.add('active')
        
        // Scroll into view on mobile accordion opening
        setTimeout(() => {
          tab.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 300)
      }
    } else {
      // Desktop Tab styling
      tabs.forEach(t => {
        t.classList.remove('active')
        t.setAttribute('aria-selected', 'false')
      })
      panels.forEach(p => p.classList.remove('active'))

      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')
      targetPanel.classList.add('active')
    }
  })
})

// Correct menu layout states on screen width resize
window.addEventListener('resize', () => {
  const isMobile = window.innerWidth <= 768
  const activeTab = document.querySelector('.menu-tab.active')
  
  if (!isMobile) {
    if (!activeTab) {
      tabs[0].classList.add('active')
      tabs[0].setAttribute('aria-selected', 'true')
      panels[0].classList.add('active')
    } else {
      const targetPanelId = activeTab.getAttribute('aria-controls')
      panels.forEach(p => {
        if (p.id === targetPanelId) {
          p.classList.add('active')
        } else {
          p.classList.remove('active')
        }
      })
    }
  }
})

/* -------------------------------------------------------------
 * GSAP ScrollTrigger Animations
 * ------------------------------------------------------------- */
if (!prefersReducedMotion) {
  // 1. Hero Load Entry Animation
  window.addEventListener('load', () => {
    const tl = gsap.timeline()
    tl.from('.hero-bg-image', {
      scale: 1.15,
      duration: 2.2,
      ease: 'power3.out'
    })
    .from('.text-reveal', {
      y: 30,
      opacity: 0,
      stagger: 0.15,
      duration: 1.2,
      ease: 'power3.out'
    }, '-=1.8')
    .from('.scroll-indicator', {
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    }, '-=0.5')
  })

  // 2. Signature Dish Zoom & Reveal
  gsap.to('.signature-image', {
    scale: 1.0,
    filter: 'blur(0px)',
    scrollTrigger: {
      trigger: '.signature-section',
      start: 'top bottom', // Start animating as soon as section bottom enters viewport
      end: 'center center',  // Stop animating when section is centered
      scrub: 1,            // Smooth animation linked to scroll
    }
  })

  // 3. Viewport Scroll Reveals (General fade-in-up)
  const reveals = document.querySelectorAll('.scroll-reveal')
  reveals.forEach(element => {
    gsap.from(element, {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%', // Trigger when top of element hits 85% of viewport height
        toggleActions: 'play none none none', // Play once, don't reverse
      }
    })
  })
}

/* -------------------------------------------------------------
 * Reservation Form Client Validation & Interaction
 * ------------------------------------------------------------- */
const reservationForm = document.getElementById('reservation-form')
const formSuccess = document.getElementById('form-success')
const resetBtn = document.querySelector('.success-reset')
const dateInput = document.getElementById('res-date')

// Restrict reservation date to today or later
if (dateInput) {
  const today = new Date().toISOString().split('T')[0]
  dateInput.min = today
}

const validateField = (input) => {
  const group = input.parentElement
  let isValid = true

  // Standard checks
  if (!input.value || (input.tagName === 'SELECT' && input.value === '')) {
    isValid = false
  }

  // Custom phone format check
  if (input.id === 'res-phone' && input.value) {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im
    if (!phoneRegex.test(input.value)) {
      isValid = false
    }
  }

  // Custom date validation (must be today or in the future)
  if (input.id === 'res-date' && input.value) {
    const selectedDate = new Date(input.value)
    const today = new Date()
    today.setHours(0,0,0,0)
    selectedDate.setHours(0,0,0,0)
    
    if (selectedDate < today) {
      isValid = false
    }
  }

  if (isValid) {
    group.classList.remove('invalid')
    input.setAttribute('aria-invalid', 'false')
  } else {
    group.classList.add('invalid')
    input.setAttribute('aria-invalid', 'true')
  }

  return isValid
}

// Attach real-time blur/change check for inputs
const inputsToValidate = reservationForm.querySelectorAll('input, select')
inputsToValidate.forEach(input => {
  input.addEventListener('blur', () => validateField(input))
  input.addEventListener('change', () => validateField(input))
})

// Handle Form Submission
reservationForm.addEventListener('submit', (e) => {
  e.preventDefault()

  let isFormValid = true

  inputsToValidate.forEach(input => {
    const isThisFieldValid = validateField(input)
    if (!isThisFieldValid) {
      isFormValid = false
    }
  })

  if (isFormValid) {
    // Elegant transition overlay effect
    reservationForm.style.opacity = '0'
    
    setTimeout(() => {
      reservationForm.style.display = 'none'
      formSuccess.removeAttribute('hidden')
      formSuccess.setAttribute('aria-hidden', 'false')
      
      // Focus on the success dialog for accessibility
      formSuccess.focus()
      
      // Smooth scroll if needed
      if (lenis) {
        lenis.scrollTo(formSuccess, { offset: -100 })
      } else {
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 400)
  }
})

// Reset form
resetBtn.addEventListener('click', () => {
  formSuccess.setAttribute('hidden', 'true')
  formSuccess.setAttribute('aria-hidden', 'true')
  reservationForm.reset()
  
  // Clear any validation visual elements
  inputsToValidate.forEach(input => {
    input.parentElement.classList.remove('invalid')
    input.setAttribute('aria-invalid', 'false')
  })
  
  reservationForm.style.display = 'block'
  setTimeout(() => {
    reservationForm.style.opacity = '1'
  }, 50)
})
