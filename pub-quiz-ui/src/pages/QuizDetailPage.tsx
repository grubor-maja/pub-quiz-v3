import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Users, Coins, Phone, ExternalLink, ArrowLeft, CalendarPlus } from 'lucide-react'
import { fetchQuiz } from '../api'
import { formatDate, formatPrice, formatTime, teamSizeLong } from '../lib/utils'
import HeartButton from '../components/HeartButton'

export default function QuizDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: ['quiz', slug],
    queryFn: () => fetchQuiz(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 480px) 1fr',
          gap: 24,
        }}>
          <div style={{ aspectRatio: '1/1', background: 'var(--bg-surface)', borderRadius: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 26, background: 'var(--bg-surface)', borderRadius: 6, width: '70%' }} />
            <div style={{ height: 14, background: 'var(--bg-surface)', borderRadius: 4, width: '40%' }} />
            <div style={{ height: 200, background: 'var(--bg-surface)', borderRadius: 10, marginTop: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !quiz) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Kviz nije pronađen.
        <Link to="/" style={{ display: 'block', marginTop: 12, color: 'var(--accent-amber)' }}>
          Nazad na listu
        </Link>
      </div>
    )
  }

  const teamSize = teamSizeLong(quiz.min_team_members, quiz.max_team_members)

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div className="quiz-detail-grid">
        {/* Back link - left rail */}
        <Link
          to="/"
          className="back-rail"
          style={{
            gridArea: 'back',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '6px 8px',
            borderRadius: 7,
            marginTop: 4,
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowLeft size={13} />
          Svi kvizovi
        </Link>

        {/* Title + org badge - aligned above image (left) */}
        <div style={{
          gridArea: 'title',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <h1 style={{
            fontSize: 'clamp(18px, 4.5vw, 24px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            margin: 0,
            textTransform: 'uppercase',
            wordBreak: 'break-word',
          }}>
            {quiz.title}
          </h1>
          <span style={{
            fontSize: 11,
            padding: '4px 9px',
            borderRadius: 6,
            background: 'var(--accent-amber-soft)',
            color: 'var(--accent-amber)',
            border: '0.5px solid rgba(233,184,74,0.25)',
            whiteSpace: 'nowrap',
          }}>
            {quiz.organization.name}
          </span>
          <HeartButton
            quizSlug={quiz.slug}
            isFavorited={quiz.is_favorited ?? false}
            size={16}
          />

          {quiz.status === 'cancelled' && (
            <div style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(220,38,38,0.12)',
              border: '0.5px solid rgba(220,38,38,0.4)',
              color: '#f87171',
              fontSize: 13,
              fontWeight: 600,
            }}>
              Ovaj kviz je otkazan.
            </div>
          )}
        </div>

        {/* Image - 4:5 portrait like Instagram */}
        <div className="quiz-detail-image" style={{
          gridArea: 'image',
          position: 'relative',
          aspectRatio: '4/5',
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border-subtle)',
        }}>
          {quiz.cover_image_url ? (
            <img
              src={quiz.cover_image_url}
              alt={quiz.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              Bez slike
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div style={{ gridArea: 'info', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Info card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 4,
          }}>
            {quiz.quiz_date && (
              <InfoRow icon={<Calendar size={14} />} label="Datum" value={formatDate(quiz.quiz_date)} />
            )}
            {quiz.quiz_time && (
              <InfoRow icon={<Clock size={14} />} label="Vreme" value={`${formatTime(quiz.quiz_time)}h`} />
            )}
            {(quiz.location || quiz.address) && (
              <InfoRow
                icon={<MapPin size={14} />}
                label="Lokacija"
                value={quiz.location ?? quiz.address ?? ''}
                sub={quiz.location && quiz.address ? quiz.address : undefined}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [quiz.location, quiz.address].filter(Boolean).join(', ')
                )}`}
                external
              />
            )}
            <InfoRow
              icon={<Coins size={14} />}
              label="Kotizacija"
              value={`${formatPrice(quiz.entry_fee)} po timu`}
            />
            {teamSize && (
              <InfoRow
                icon={<Users size={14} />}
                label="Tim"
                value={teamSize}
              />
            )}
            {quiz.contact_phone && (
              <InfoRow
                icon={<Phone size={14} />}
                label="Kontakt"
                value={quiz.contact_phone}
                href={`tel:${quiz.contact_phone}`}
              />
            )}
            {quiz.instagram_post_url && (
              <InfoRow
                icon={<ExternalLink size={14} />}
                label="Instagram"
                value="Pogledaj objavu"
                href={quiz.instagram_post_url}
                external
                last
              />
            )}
          </div>

          {quiz.contact_phone && (
            <a
              href={`tel:${quiz.contact_phone}`}
              className="btn-amber"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Phone size={14} />
              Prijavi tim: {quiz.contact_phone}
            </a>
          )}

          {quiz.quiz_date && (
            <a
              href={`/api/quizzes/${quiz.slug}/calendar.ics`}
              target="_blank"
              rel="noopener"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 16px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 500,
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <CalendarPlus size={14} />
              Dodaj u kalendar
            </a>
          )}
        </div>

        {/* Description - inside grid, spans image+info cols so it aligns with image on left */}
        {quiz.description && (
          <div style={{
            gridArea: 'desc',
            marginTop: 14,
            padding: '20px 22px',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            borderRadius: 12,
          }}>
            <Description text={quiz.description} />
          </div>
        )}
      </div>
    </div>
  )
}

function Description({ text }: { text: string }) {
  // Split by single \n - Instagram caption uses single newlines for line breaks
  const lines = text.split('\n')
  const paragraphs: string[][] = [[]]
  for (const line of lines) {
    if (line.trim() === '') {
      if (paragraphs[paragraphs.length - 1].length > 0) paragraphs.push([])
    } else {
      paragraphs[paragraphs.length - 1].push(line)
    }
  }
  const blocks = paragraphs.filter(p => p.length > 0)

  // Separate hashtag block (final paragraph of mostly hashtags)
  const last = blocks[blocks.length - 1]?.join(' ') ?? ''
  const hashtagCount = (last.match(/#\w+/g) ?? []).length
  const isLastHashtags = hashtagCount >= 3 && hashtagCount / Math.max(last.split(/\s+/).length, 1) > 0.5

  const contentBlocks = isLastHashtags ? blocks.slice(0, -1) : blocks
  const hashtagBlock = isLastHashtags ? blocks[blocks.length - 1] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {contentBlocks.map((para, i) => (
        <p
          key={i}
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {para.join('\n')}
        </p>
      ))}
      {hashtagBlock && (
        <div style={{
          marginTop: 6,
          paddingTop: 14,
          borderTop: '0.5px solid var(--border-subtle)',
          fontSize: 11.5,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}>
          {hashtagBlock.join(' ')}
        </div>
      )}
    </div>
  )
}

function InfoRow({
  icon, label, value, sub, href, external, last,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  href?: string
  external?: boolean
  last?: boolean
}) {
  const valueEl = href ? (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{
        fontSize: 13,
        color: 'var(--accent-amber)',
        textDecoration: 'none',
        fontWeight: 500,
      }}
    >
      {value}
    </a>
  ) : (
    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
  )

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '11px 12px',
      borderBottom: last ? 'none' : '0.5px solid var(--border-subtle)',
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-amber)',
        flexShrink: 0,
        marginTop: 1,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 2,
        }}>
          {label}
        </div>
        {valueEl}
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
