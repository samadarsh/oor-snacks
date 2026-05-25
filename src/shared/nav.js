/** Shared header: scroll state + mobile menu (real page links, no hash scroll). */
export function initSiteNav() {
  const navbar = document.getElementById('navbar')
  const mobileToggle = document.querySelector('.mobile-nav-toggle')
  const navMenu = document.querySelector('.nav-menu')

  const checkNavbarScroll = () => {
    if (!navbar) return
    if (window.scrollY > 50) navbar.classList.add('scrolled')
    else navbar.classList.remove('scrolled')
  }

  window.addEventListener('scroll', checkNavbarScroll, { passive: true })
  checkNavbarScroll()

  if (!mobileToggle || !navMenu) return

  mobileToggle.addEventListener('click', () => {
    const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true'
    mobileToggle.setAttribute('aria-expanded', String(!isExpanded))
    mobileToggle.classList.toggle('open')
    navMenu.classList.toggle('open')
    document.body.classList.toggle('nav-open', !isExpanded)
  })

  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (!link.classList.contains('nav-anchor')) {
        mobileToggle.setAttribute('aria-expanded', 'false')
        mobileToggle.classList.remove('open')
        navMenu.classList.remove('open')
        document.body.classList.remove('nav-open')
      }
    })
  })
}
