import { useCallback, useSyncExternalStore } from 'react'

export interface Position { lat: number; lng: number }
type Status = 'idle' | 'asking' | 'ok' | 'denied' | 'error'

// One shared position per visit, so the home page and the map ask only once.
let state: { pos: Position | null; status: Status } = { pos: null, status: 'idle' }
const listeners = new Set<() => void>()
const set = (next: typeof state) => { state = next; listeners.forEach(l => l()) }

/** The visitor's position, asked for only when a near-me feature needs it. */
export function useGeo() {
  const snap = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
  )

  const request = useCallback(() => {
    if (state.status === 'asking' || state.status === 'ok') return
    if (!navigator.geolocation) {
      set({ pos: null, status: 'error' })
      return
    }
    set({ ...state, status: 'asking' })
    navigator.geolocation.getCurrentPosition(
      p => set({ pos: { lat: p.coords.latitude, lng: p.coords.longitude }, status: 'ok' }),
      err => set({ pos: null, status: err.code === 1 ? 'denied' : 'error' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  const clear = useCallback(() => set({ pos: null, status: 'idle' }), [])

  const message = snap.status === 'denied'
    ? 'Dozvola za lokaciju je odbijena. Uključi je u podešavanjima browsera.'
    : snap.status === 'error'
      ? 'Ne mogu da dobavim tvoju lokaciju.'
      : null

  return { pos: snap.pos, status: snap.status, request, clear, message }
}
