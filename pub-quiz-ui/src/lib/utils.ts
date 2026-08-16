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
