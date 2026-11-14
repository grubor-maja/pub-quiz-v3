import { useEffect, type RefObject } from 'react'

/**
 * Makes a <Zmaj> look around: its pupils follow the mouse, and it blinks at
 * irregular intervals. Without a mouse (phones), or when the mouse has been
 * still for a while, it glances around on its own.
 *
 * Nothing here re-renders React. The hook writes two CSS variables (--lx, --ly,
 * in SVG units) on the <svg>, and index.css turns them into transforms with a
 * short transition, so a fast mouse still reads as smooth eye movement.
 */

/** How far a pupil may move inside its lens, in SVG units. */
const MAX_X = 5
const MAX_Y = 3.5
/** Pupil centre in the dragon's own coordinates (between the two eyes). */
const EYE_X = 100
const EYE_Y = 79
/** Beyond this distance (px) the dragon looks as far as it can. */
const FULL_LOOK_PX = 220
/** After this long without mouse movement the dragon starts glancing on its own. */
const IDLE_MS = 3000

const GLANCES: Array<[number, number]> = [
  [0, 0], [-1, 0], [1, 0], [-0.7, -0.7], [0.7, -0.6], [0.5, 0.6], [0, 0],
]

// One window listener for every dragon on the page, throttled to a frame.
let pointer: { x: number; y: number; t: number } | null = null
const subscribers = new Set<() => void>()
let frame = 0

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  pointer = { x: e.clientX, y: e.clientY, t: performance.now() }
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0
      subscribers.forEach((fn) => fn())
    })
  }
}

function subscribe(fn: () => void): () => void {
  if (subscribers.size === 0) window.addEventListener('pointermove', onMove, { passive: true })
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) window.removeEventListener('pointermove', onMove)
  }
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export function useDragonEyes(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const svg = ref.current
    if (!enabled || !svg) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn() }, ms)
      timers.add(id)
    }

    const look = (x: number, y: number) => {
      svg.style.setProperty('--lx', x.toFixed(2))
      svg.style.setProperty('--ly', y.toFixed(2))
    }

    const follow = () => {
      if (!pointer) return
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0) return
      const vb = svg.viewBox.baseVal
      const cx = rect.left + ((EYE_X - vb.x) / vb.width) * rect.width
      const cy = rect.top + ((EYE_Y - vb.y) / vb.height) * rect.height
      const dx = pointer.x - cx
      const dy = pointer.y - cy
      const dist = Math.hypot(dx, dy)
      if (dist < 1) return look(0, 0)
      const reach = Math.min(1, dist / FULL_LOOK_PX)
      look((dx / dist) * MAX_X * reach, (dy / dist) * MAX_Y * reach)
    }

    const glance = () => {
      const mouseIsActive = pointer && performance.now() - pointer.t < IDLE_MS
      if (!mouseIsActive) {
        const [gx, gy] = GLANCES[Math.floor(Math.random() * GLANCES.length)]
        look(gx * MAX_X, gy * MAX_Y)
      }
      later(glance, rand(1400, 3800))
    }

    const blinkOnce = () => {
      svg.classList.add('z-blinking')
      later(() => svg.classList.remove('z-blinking'), 170)
    }
    const blink = () => {
      blinkOnce()
      // Now and then a quick double blink, which is what makes it look alive.
      if (Math.random() < 0.25) later(blinkOnce, 300)
      later(blink, rand(2200, 6000))
    }

    const unsubscribe = subscribe(follow)
    follow()
    later(glance, rand(800, 2000))
    later(blink, rand(1000, 3500))

    return () => {
      unsubscribe()
      timers.forEach((id) => window.clearTimeout(id))
      svg.classList.remove('z-blinking')
      look(0, 0)
    }
  }, [ref, enabled])
}
