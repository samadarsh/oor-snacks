import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MOTION_EASE = 'power2.out'

/** Light scroll reveals for catalog / shop trust sections only. */
export function initScrollReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  document.documentElement.classList.add('motion-enhanced')

  const revealTargets = gsap.utils.toArray('.scroll-reveal')
  if (!revealTargets.length) return

  gsap.set(revealTargets, { opacity: 0, y: 12 })

  ScrollTrigger.batch(revealTargets, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: MOTION_EASE,
        stagger: 0.04,
        overwrite: true,
      })
    },
  })
}
