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
