import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const formatted = date.toLocaleDateString('sr-Latn-RS', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Local calendar date as YYYY-MM-DD, without the UTC shift toISOString adds. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function todayIso(): string {
  return isoLocal(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoLocal(d)
}

/** Sunday of the current week (the week runs Monday to Sunday). */
export function endOfWeekIso(): string {
  const d = new Date()
  const daysToSunday = (7 - d.getDay()) % 7
  d.setDate(d.getDate() + daysToSunday)
  return isoLocal(d)
}

/** Saturday and Sunday of this weekend; on a Sunday, just that Sunday. */
export function weekendIso(): { from: string; to: string } {
  const d = new Date()
  const day = d.getDay()
  if (day === 0) return { from: isoLocal(d), to: isoLocal(d) }
  const sat = new Date(d)
  sat.setDate(d.getDate() + (6 - day))
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  return { from: isoLocal(sat), to: isoLocal(sun) }
}

const WEEKDAYS = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
const WEEKDAYS_LONG = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota']

/** "Pet 13.11." */
export function shortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`
}

/** "Utorak, 10.11." */
export function longDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`
}

/** "Utorak, 10. novembar" for today's heading. */
export function todayHeading(): string {
  const d = new Date()
  const month = d.toLocaleDateString('sr-Latn-RS', { month: 'long' })
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${month}`
}

export function isToday(dateStr: string | null): boolean {
  return !!dateStr && dateStr.slice(0, 10) === todayIso()
}

/** "Večeras", "Sutra" or the short date, for badges. */
export function relativeDay(dateStr: string | null): string {
  if (!dateStr) return ''
  const iso = dateStr.slice(0, 10)
  const today = todayIso()
  if (iso === today) return 'Večeras'
  if (iso === addDays(today, 1)) return 'Sutra'
  return shortDate(iso)
}

export function cleanTitle(t: string): string {
  return t.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim()
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

export function formatPrice(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Besplatno'
  return `${amount.toLocaleString('sr-Latn-RS')} din`
}

/**
 * Serbian plural: kviz / kviza / kvizova
 * Last digit rules, with 11-14 exception.
 *   1 -> singular   (kviz)   [ali ne 11]
 *   2-4 -> paucal   (kviza)  [ali ne 12-14]
 *   ostalo -> plural (kvizova)
 */
export function pluralSr(n: number, singular: string, paucal: string, plural: string): string {
  const abs = Math.abs(n)
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return plural
  if (mod10 === 1) return singular
  if (mod10 >= 2 && mod10 <= 4) return paucal
  return plural
}

export const kvizWord = (n: number) => pluralSr(n, 'kviz', 'kviza', 'kvizova')
export const rezultatWord = (n: number) => pluralSr(n, 'rezultat', 'rezultata', 'rezultata')
export const clanWord = (n: number) => pluralSr(n, 'član', 'člana', 'članova')
export const lokacijaWord = (n: number) => pluralSr(n, 'lokacija', 'lokacije', 'lokacija')

/**
 * Organizers often state only one side of the team size, or neither.
 * Returns null when nothing is known so the caller can omit the field
 * rather than show a made-up range.
 */
export function teamSizeShort(min: number | null, max: number | null): string | null {
  if (min && max) return `${min}-${max}`
  if (min) return `${min}+`
  if (max) return `do ${max}`
  return null
}

export function teamSizeLong(min: number | null, max: number | null): string | null {
  if (min && max) return `${min}-${max} ${clanWord(max)}`
  if (min) return `min. ${min} ${clanWord(min)}`
  if (max) return `do ${max} ${clanWord(max)}`
  return null
}
