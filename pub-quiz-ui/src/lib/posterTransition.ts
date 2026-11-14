import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'

/**
 * Opening a quiz from its card: the card's poster grows into the big poster on
 * the quiz page (View Transitions API), instead of the page simply swapping.
 *
 * Only the clicked card carries the transition name, and only for the length
 * of the transition: names must be unique on a page, and a list has dozens of
 * cards. The quiz page's poster carries it permanently (see QuizDetailPage).
 *
 * Browsers without the API, a reduced-motion setting, or a click that opens a
 * new tab all get the plain link, unchanged.
 */

export const POSTER_NAME = 'quiz-poster'

export function canMorph(e: MouseEvent): boolean {
  return (
    !e.defaultPrevented &&
    e.button === 0 &&
    !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Runs a navigation inside a view transition, with `poster` as the shared element. */
export function morphTo(poster: HTMLElement, navigate: () => void) {
  poster.style.viewTransitionName = POSTER_NAME
  const transition = document.startViewTransition(() => {
    // The new page has to be in the DOM, scrolled to the top, by the time
    // this returns: that is the state the browser animates towards.
    flushSync(navigate)
    window.scrollTo(0, 0)
  })
  transition.finished.finally(() => {
    poster.style.viewTransitionName = ''
  })
}
