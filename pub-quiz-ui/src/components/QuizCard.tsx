import { Link } from 'react-router-dom'
import { formatTime, formatPrice, teamSizeShort, shortDate, isToday, cleanTitle } from '../lib/utils'
import { accentOf, tint } from '../lib/dragon'
import type { Quiz } from '../types'
import HeartButton from './HeartButton'
import { OrgBadge, OrgDragon } from './OrgBadge'

interface Props {
  quiz: Quiz
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number
  /** Hide the organizer row, on an organizer's own page. */
  hideOrg?: boolean
}

const pill: React.CSSProperties = {
  padding: '4px 9px',
  borderRadius: 8,
  background: 'rgba(169,173,214,0.1)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  whiteSpace: 'nowrap',
}

export default function QuizCard({ quiz, index = 0, hideOrg = false }: Props) {
  const team = teamSizeShort(quiz.min_team_members, quiz.max_team_members)
  const cancelled = quiz.status === 'cancelled'
  const tonight = isToday(quiz.quiz_date) && !cancelled
  const accent = accentOf(quiz.organization)
  const title = cleanTitle(quiz.title)

  return (
    <Link
      to={`/kvizovi/${quiz.slug}`}
      className="quiz-card anim-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        color: 'var(--text-primary)',
        animationDelay: `${Math.min(index, 12) * 0.06}s`,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden', filter: cancelled ? 'grayscale(0.9) brightness(0.6)' : undefined }}>
        {quiz.cover_image_url ? (
          <img className="quiz-card-img" src={quiz.cover_image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          // Organizers announce a quiz weeks ahead and post its artwork a day or
          // two before. Until then the organizer's dragon stands in, so the card
          // still looks deliberate.
          <div className="quiz-card-img" style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: `radial-gradient(circle at 50% 40%, ${tint(accent, 0.35)}, ${tint(accent, 0.06)} 70%), #0D0F2A`,
          }}>
            <OrgDragon org={quiz.organization} size={130} animated={false} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>NAJAVLJENO</span>
          </div>
        )}
        {quiz.quiz_date && (
          <span style={{
            position: 'absolute', left: 10, top: 10, padding: '6px 10px', borderRadius: 10,
            background: 'rgba(7,8,24,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(182,242,62,0.3)',
            fontSize: 13, fontWeight: 600, color: '#E9FFC2', textDecoration: cancelled ? 'line-through' : undefined,
          }}>
            {shortDate(quiz.quiz_date)}
          </span>
        )}
        {tonight && (
          <span style={{
            position: 'absolute', right: 10, top: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10,
            background: 'var(--lime)', color: 'var(--on-lime)', fontSize: 12, fontWeight: 700,
          }}>
            <span className="live-dot dark" />VEČERAS
          </span>
        )}
        {cancelled && (
          <span style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-8deg)',
            padding: '6px 14px', borderRadius: 10, background: 'var(--danger)', color: '#2A0A12', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em',
          }}>
            OTKAZANO
          </span>
        )}
      </div>

      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            {!hideOrg && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
                <OrgBadge org={quiz.organization} size={22} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quiz.organization.name}</span>
              </span>
            )}
            <h3 className="display" style={{
              fontSize: 18, fontWeight: 700, lineHeight: 1.2, margin: 0,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              textDecoration: cancelled ? 'line-through' : undefined, color: cancelled ? 'var(--text-muted)' : undefined,
            }}>
              {title}
            </h3>
          </div>
          <HeartButton quizSlug={quiz.slug} isFavorited={quiz.is_favorited ?? false} size={18} style={{ margin: '-4px -4px 0 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quiz.quiz_time && <span style={pill}>{formatTime(quiz.quiz_time)}</span>}
          {/* No fee means the post did not say, not that the quiz is free. */}
          {quiz.entry_fee != null && (
            <span style={{ ...pill, background: 'rgba(182,242,62,0.12)', color: 'var(--lime)', fontWeight: 600 }}>{formatPrice(quiz.entry_fee)}</span>
          )}
          {team && <span style={pill}>{team}</span>}
        </div>
        {(quiz.location || quiz.address) && (
          <span style={{ fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {quiz.location ?? quiz.address}
          </span>
        )}
      </div>
    </Link>
  )
}
