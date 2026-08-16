import { Link } from 'react-router-dom'
import { Clock, Coins, Users, Calendar } from 'lucide-react'
import { formatTime, formatPrice, teamSizeShort } from '../lib/utils'
import type { Quiz } from '../types'
import HeartButton from './HeartButton'

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #2A1F1F 0%, #3D2A1F 100%)',
  'linear-gradient(135deg, #1F2A2F 0%, #1F3540 100%)',
  'linear-gradient(135deg, #2A1F35 0%, #1F1F3D 100%)',
  'linear-gradient(135deg, #1F2F22 0%, #1F4030 100%)',
  'linear-gradient(135deg, #2F1F2A 0%, #401F35 100%)',
  'linear-gradient(135deg, #2A2A1F 0%, #3D3520 100%)',
]

function formatDateBadge(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  const weekday = d.toLocaleDateString('sr-Latn-RS', { weekday: 'short' })
    .replace('.', '')
    .replace(/^\w/, c => c.toUpperCase())
  const day = d.getDate()
  const month = d.toLocaleDateString('sr-Latn-RS', { month: 'short' }).replace('.', '')
  return `${weekday} · ${day}. ${month}`
}

function cleanTitle(t: string) {
  return t.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim()
}

const badge: React.CSSProperties = {
  position: 'absolute',
  top: 7,
  backdropFilter: 'blur(8px)',
  background: 'rgba(11,11,16,0.85)',
  border: '0.5px solid var(--border-strong)',
  borderRadius: 5,
  padding: '3px 6px',
  fontSize: 9.5,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

interface Props {
  quiz: Quiz
  compact?: boolean
}

export default function QuizCard({ quiz, compact = false }: Props) {
  const gradientIndex = quiz.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length
  const gradient = FALLBACK_GRADIENTS[gradientIndex] ?? FALLBACK_GRADIENTS[0]
  const teamSize = teamSizeShort(quiz.min_team_members, quiz.max_team_members)
  const isCancelled = quiz.status === 'cancelled'

  return (
    <Link
      to={`/kvizovi/${quiz.slug}`}
      className="quiz-card"
      style={{
        display: 'block',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
        textDecoration: 'none',
      }}
    >
      {/* Image */}
      <div style={{
        position: 'relative',
        aspectRatio: compact ? '1/1' : '4/5',
        overflow: 'hidden',
        filter: isCancelled ? 'grayscale(0.85)' : undefined,
      }}>
        {quiz.cover_image_url ? (
          <img
            src={quiz.cover_image_url}
            alt={quiz.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          // No artwork yet - organizers usually publish a quiz's picture only a
          // day or two ahead. Show the organizer's mark so the card reads as
          // "not announced yet" rather than broken; enrichment swaps in the real
          // image as soon as their post appears.
          <div style={{
            width: '100%',
            height: '100%',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {quiz.organization.logo_url ? (
              <img
                src={quiz.organization.logo_url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                style={{
                  width: '46%',
                  maxWidth: 110,
                  aspectRatio: '1',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  opacity: 0.3,
                  filter: 'grayscale(0.4)',
                }}
              />
            ) : (
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: compact ? 22 : 28,
                fontWeight: 600,
                color: 'rgba(237,234,227,0.16)',
                letterSpacing: '0.04em',
              }}>
                {quiz.organization.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {quiz.quiz_date && (
          <span style={{
            ...badge,
            left: 7,
            color: isCancelled ? 'var(--text-muted)' : 'var(--accent-amber)',
            textDecoration: isCancelled ? 'line-through' : undefined,
          }}>
            <Calendar size={9} />
            {formatDateBadge(quiz.quiz_date)}
          </span>
        )}

        {isCancelled && (
          <span style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%) rotate(-8deg)',
            textAlign: 'center',
            background: 'rgba(220,38,38,0.92)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '5px 0',
          }}>
            OTKAZANO
          </span>
        )}

        {!compact && (
          <span className="card-org-tag" style={{ ...badge, right: 7, color: 'rgba(237,234,227,0.7)' }}>
            {quiz.organization.name}
          </span>
        )}

        <div style={{ position: 'absolute', bottom: 7, right: 7 }}>
          <HeartButton
            quizSlug={quiz.slug}
            isFavorited={quiz.is_favorited ?? false}
            size={14}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: compact ? '9px 10px 10px' : '11px 12px 12px' }}>
        <h3 style={{
          fontSize: compact ? 11.5 : 12.5,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: `0 0 ${compact ? 7 : 9}px`,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          lineHeight: 1.25,
          minHeight: compact ? undefined : '2.5em',
        }}>
          {cleanTitle(quiz.title)}
        </h3>

        {/* Meta row */}
        <div style={{
          display: 'flex',
          gap: 10,
          paddingTop: compact ? 7 : 8,
          borderTop: '0.5px solid var(--border-subtle)',
          fontSize: 10,
          color: 'var(--text-secondary)',
          marginBottom: compact ? 0 : 8,
          flexWrap: 'wrap',
        }}>
          {quiz.quiz_time && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} strokeWidth={1.7} />
              {formatTime(quiz.quiz_time)}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent-amber)' }}>
            <Coins size={10} strokeWidth={1.7} />
            {formatPrice(quiz.entry_fee)}
          </span>
          {teamSize && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Users size={10} strokeWidth={1.7} />
              {teamSize}
            </span>
          )}
        </div>

        {/* Info (skipped in compact) */}
        {!compact && (
          <p style={{
            fontSize: 10,
            lineHeight: 1.5,
            margin: 0,
            color: quiz.description ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontStyle: quiz.description ? 'normal' : 'italic',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {quiz.description ?? 'Ne postoji info za ovaj kviz, pogledaj Instagram stranicu za više detalja.'}
          </p>
        )}
      </div>
    </Link>
  )
}
