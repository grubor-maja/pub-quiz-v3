import { useEffect, useState } from 'react'

/**
 * React hook that returns whether the given CSS media query matches.
 * Safely handles SSR / initial render.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (q: string): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(q).matches
  }

  const [matches, setMatches] = useState<boolean>(() => getMatches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    // sync in case query changed
    handler()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      // Safari < 14 fallback
      mq.addListener(handler)
      return () => mq.removeListener(handler)
    }
  }, [query])

  return matches
}
