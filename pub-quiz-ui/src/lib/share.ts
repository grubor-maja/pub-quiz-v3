import type { Quiz } from '../types'
import { cleanTitle, formatTime, longDate } from './utils'

/**
 * The message a quiz is forwarded with, written for a team's group chat:
 *
 *   Kviz na slovo
 *   Subota, 14.11. u 20:30h
 *   Old London Pub
 *   Kotizacija 300 din
 *   https://www.instagram.com/p/...
 *
 * Lines the quiz has no data for are left out. The link is the organizer's
 * Instagram post, which is what people in the chat will open; failing that the
 * organizer's profile, failing that the quiz on this site.
 */
export function shareText(quiz: Quiz): string {
  const time = formatTime(quiz.quiz_time)
  const day = longDate(quiz.quiz_date)
  const when = day && time ? `${day} u ${time}h` : day || (time ? `${time}h` : '')
  const fee = quiz.entry_fee == null ? null : quiz.entry_fee === 0 ? 'Besplatno' : `Kotizacija ${quiz.entry_fee.toLocaleString('sr-Latn-RS')} din`

  return [cleanTitle(quiz.title), when, quiz.location || quiz.address, fee, shareLink(quiz)]
    .filter(Boolean)
    .join('\n')
}

function shareLink(quiz: Quiz): string {
  if (quiz.instagram_post_url) return quiz.instagram_post_url
  const handle = quiz.organization.instagram_handle?.replace(/^@/, '')
  if (handle) return `https://www.instagram.com/${handle}/`
  return `${window.location.origin}/kvizovi/${quiz.slug}`
}

/**
 * Opens the phone's share sheet (WhatsApp, Viber, Messenger…). Where there is
 * none, as on most desktops, copies the message instead. Resolves to what
 * happened so the caller can say so.
 */
export async function shareQuiz(quiz: Quiz): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const text = shareText(quiz)
  // The link goes inside the text rather than in `url`: apps place `url`
  // wherever they like, and the message should read in this order.
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Anything else (no permission, nothing to share to): fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
