import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { QuizFilters, QuizSort } from '../types'
import { addDays, endOfWeekIso, shortDate, todayIso, weekendIso } from './utils'
import type { Position } from './useGeo'

export type Kada = '' | 'danas' | 'sutra' | 'vikend' | 'nedelja' | 'datumi'
export type Tab = 'predstojeci' | 'pratim' | 'arhiva'

export const KADA_LABELS: Record<Exclude<Kada, ''>, string> = {
  danas: 'Danas', sutra: 'Sutra', vikend: 'Ovaj vikend', nedelja: 'Ova nedelja', datumi: 'Izabrani datumi',
}
export const SORT_LABELS: Record<QuizSort, string> = {
  datum: 'Po datumu', blizu: 'Najbliže meni', cena: 'Najjeftinije', novo: 'Najnovije objavljeno',
}
export const RADII = [2, 5, 10] as const

export interface FilterState {
  tab: Tab
  search: string
  kada: Kada
  od: string
  do: string
  org: string[]
  udaljenost: number | null
  sort: QuizSort
}

/**
 * The home page filters, kept in the address so a filtered list can be sent
 * to friends: /?kada=vikend&org=pab-kviz-8x8. "search" matches the site search
 * Google is told about in index.html.
 */
export function useQuizFilters() {
  const [params, setParams] = useSearchParams()

  const state: FilterState = useMemo(() => {
    const tab = params.get('tab')
    const kada = params.get('kada') as Kada | null
    const sort = params.get('sort') as QuizSort | null
    const radius = Number(params.get('udaljenost'))
    return {
      tab: tab === 'pratim' || tab === 'arhiva' ? tab : 'predstojeci',
      search: params.get('search') ?? '',
      kada: kada && kada in KADA_LABELS ? kada : '',
      od: params.get('od') ?? '',
      do: params.get('do') ?? '',
      org: (params.get('org') ?? '').split(',').filter(Boolean),
      udaljenost: RADII.includes(radius as typeof RADII[number]) ? radius : null,
      sort: sort && sort in SORT_LABELS ? sort : 'datum',
    }
  }, [params])

  const update = useCallback((patch: Partial<FilterState>) => {
    const next = { ...state, ...patch }
    const p = new URLSearchParams()
    if (next.tab !== 'predstojeci') p.set('tab', next.tab)
    if (next.search) p.set('search', next.search)
    if (next.kada) p.set('kada', next.kada)
    if (next.kada === 'datumi') {
      if (next.od) p.set('od', next.od)
      if (next.do) p.set('do', next.do)
    }
    if (next.org.length) p.set('org', next.org.join(','))
    if (next.udaljenost) p.set('udaljenost', String(next.udaljenost))
    if (next.sort !== 'datum') p.set('sort', next.sort)
    setParams(p, { replace: true })
  }, [state, setParams])

  const clear = useCallback(() => update({ kada: '', od: '', do: '', org: [], udaljenost: null, search: '' }), [update])

  return { state, update, clear }
}

export function dateRange(s: Pick<FilterState, 'kada' | 'od' | 'do'>): { from?: string; to?: string } {
  const today = todayIso()
  switch (s.kada) {
    case 'danas': return { from: today, to: today }
    case 'sutra': return { from: addDays(today, 1), to: addDays(today, 1) }
    case 'vikend': return weekendIso()
    case 'nedelja': return { from: today, to: endOfWeekIso() }
    case 'datumi': return { from: s.od || undefined, to: s.do || undefined }
    default: return {}
  }
}

export function kadaLabel(s: Pick<FilterState, 'kada' | 'od' | 'do'>): string {
  if (!s.kada) return 'Bilo kad'
  if (s.kada === 'datumi') {
    if (s.od && s.do) return `${shortDate(s.od)} – ${shortDate(s.do)}`
    if (s.od) return `od ${shortDate(s.od)}`
    if (s.do) return `do ${shortDate(s.do)}`
  }
  return KADA_LABELS[s.kada]
}

/** The API query for a filter state. Distance only applies once a position is known. */
export function toApiFilters(s: FilterState, pos: Position | null): QuizFilters {
  const range = s.tab === 'arhiva' ? {} : dateRange(s)
  const needsPos = !!s.udaljenost || s.sort === 'blizu'
  return {
    search: s.search || undefined,
    org: s.tab !== 'pratim' && s.org.length ? s.org.join(',') : undefined,
    date_from: range.from,
    date_to: range.to,
    subscribed: s.tab === 'pratim' || undefined,
    archive: s.tab === 'arhiva' || undefined,
    sort: s.sort,
    lat: needsPos && pos ? Number(pos.lat.toFixed(4)) : undefined,
    lng: needsPos && pos ? Number(pos.lng.toFixed(4)) : undefined,
    radius: s.udaljenost && pos ? s.udaljenost : undefined,
  }
}
