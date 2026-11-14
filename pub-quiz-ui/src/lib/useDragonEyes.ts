import { useEffect, type RefObject } from 'react'

/**
 * Makes a <Zmaj> look around: its pupils follow the mouse, or the text being
 * typed into a focused field, and it blinks at irregular intervals. Without
 * a mouse (phones), or when the mouse has been still for a while, it glances
 * around on its own.
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

/** A mouse that moved this recently wins over a focused field. */
const MOUSE_WINS_MS = 800
/** Field types whose text the dragon reads along. Never password. */
const READABLE = new Set(['text', 'email', 'search', 'tel', 'url'])

// One set of listeners for every dragon on the page, throttled to a frame.
let pointer: { x: number; y: number; t: number } | null = null
const subscribers = new Set<() => void>()
let frame = 0

function notify() {
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0
      subscribers.forEach((fn) => fn())
    })
  }
}

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  pointer = { x: e.clientX, y: e.clientY, t: performance.now() }
  notify()
}

const FIELD_EVENTS = ['input', 'focusin', 'focusout', 'keyup'] as const

function subscribe(fn: () => void): () => void {
  if (subscribers.size === 0) {
    window.addEventListener('pointermove', onMove, { passive: true })
    FIELD_EVENTS.forEach((ev) => document.addEventListener(ev, notify))
  }
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) {
      window.removeEventListener('pointermove', onMove)
      FIELD_EVENTS.forEach((ev) => document.removeEventListener(ev, notify))
    }
  }
}

/**
 * Roughly where the caret is in the focused text field, so the dragon reads
 * along as you type. Null when no readable field has focus.
 */
function caretPoint(): { x: number; y: number } | null {
  const el = document.activeElement
  if (!(el instanceof HTMLInputElement) || !READABLE.has(el.type)) return null
  const r = el.getBoundingClientRect()
  const upTo = el.selectionStart ?? el.value.length
  const x = Math.min(r.right - 12, r.left + 14 + upTo * 8)
  return { x, y: r.top + r.height / 2 }
}

/** What the dragon should look at right now, or null to glance around. */
function target(): { x: number; y: number } | null {
  const now = performance.now()
  if (pointer && now - pointer.t < MOUSE_WINS_MS) return pointer
  return caretPoint() ?? (pointer && now - pointer.t < IDLE_MS ? pointer : null)
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
      const t = target()
      if (!t) return
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0) return
      const vb = svg.viewBox.baseVal
      const cx = rect.left + ((EYE_X - vb.x) / vb.width) * rect.width
      const cy = rect.top + ((EYE_Y - vb.y) / vb.height) * rect.height
      const dx = t.x - cx
      const dy = t.y - cy
      const dist = Math.hypot(dx, dy)
      if (dist < 1) return look(0, 0)
      const reach = Math.min(1, dist / FULL_LOOK_PX)
      look((dx / dist) * MAX_X * reach, (dy / dist) * MAX_Y * reach)
    }

    const glance = () => {
      if (target()) {
        follow()
      } else {
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
