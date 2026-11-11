import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Clock, Coins, MapPin, Phone, Users, Calendar } from 'lucide-react'
import { Instagram } from '../components/icons'
import { fetchOrganization, fetchQuiz } from '../api'
import { cleanTitle, formatDate, formatPrice, formatTime, longDate, relativeDay, shortDate, teamSizeLong, todayIso } from '../lib/utils'
import { accentOf, tint } from '../lib/dragon'
import { useSeo, BASE_URL } from '../lib/useSeo'
import HeartButton from '../components/HeartButton'
import SubscribeButton from '../components/SubscribeButton'
import { OrgBadge, OrgDragon } from '../components/OrgBadge'
import EmptyState from '../components/EmptyState'
import type { Quiz } from '../types'

/**
 * Event markup, which is what lets a listing show the date and venue straight
 * in the search result rather than just a blue link.
 */
function buildEventJsonLd(quiz: Quiz) {
  const start = quiz.quiz_date
    ? `${quiz.quiz_date.slice(0, 10)}T${(quiz.quiz_time ?? '20:00').slice(0, 5)}:00+02:00`
    : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: cleanTitle(quiz.title),
    description: quiz.description?.slice(0, 500) ?? `Pab kviz u organizaciji ${quiz.organization.name}.`,
    startDate: start,
    eventStatus: quiz.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${BASE_URL}/kvizovi/${quiz.slug}`,
    image: quiz.cover_image_url ? [quiz.cover_image_url] : undefined,
    location: {
      '@type': 'Place',
      name: quiz.location ?? quiz.organization.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: quiz.address ?? undefined,
        addressCountry: 'RS',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: quiz.organization.name,
      url: `${BASE_URL}/organizacije/${quiz.organization.slug}`,
    },
    offers: quiz.entry_fee !== null && quiz.entry_fee !== undefined
      ? {
          '@type': 'Offer',
          price: String(quiz.entry_fee),
          priceCurrency: 'RSD',
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/kvizovi/${quiz.slug}`,
        }
      : undefined,
  }
}

const MiniMap = lazy(() => import('../components/MiniMap'))

export default function QuizDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: ['quiz', slug],
    queryFn: () => fetchQuiz(slug!),
    enabled: !!slug,
  })

  const orgSlug = quiz?.organization.slug
  const { data: orgData } = useQuery({
    queryKey: ['organization', orgSlug],
    queryFn: () => fetchOrganization(orgSlug!),
    enabled: !!orgSlug,
    staleTime: 60 * 1000,
  })

  // Hooks cannot sit behind the loading and error returns below, so the values
  // fall back until the quiz arrives.
  const jsonLd = useMemo(() => (quiz ? buildEventJsonLd(quiz) : undefined), [quiz])

  useSeo({
    title: quiz ? `${cleanTitle(quiz.title)}, ${quiz.organization.name}` : 'Kviz',
    description: quiz
      ? [
          cleanTitle(quiz.title),
          quiz.quiz_date ? formatDate(quiz.quiz_date) : null,
          quiz.quiz_time ? `${formatTime(quiz.quiz_time)}h` : null,
          quiz.location,
          quiz.entry_fee !== null ? `kotizacija ${formatPrice(quiz.entry_fee)}` : null,
        ].filter(Boolean).join(', ')
      : 'Detalji pab kviza.',
    path: `/kvizovi/${slug}`,
    image: quiz?.cover_image_url ?? undefined,
    jsonLd,
    // Held back until the quiz arrives, so the metadata the server wrote for
    // this URL is not replaced by the fallbacks above while the request is in
    // flight.
    enabled: !!quiz,
  })

  if (isLoading) {
    return (
      <div className="page">
        <div className="detail-hero" style={{ marginTop: 40 }}>
          <div className="detail-poster skeleton" style={{ aspectRatio: '4 / 5', borderRadius: 22 }} />
          <div className="detail-info">
            <div className="skeleton" style={{ height: 56, width: '70%', borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !quiz) {
    return (
      <div className="page" style={{ paddingTop: 72 }}>
        <EmptyState title="Ovaj kviz nismo našli" text="Možda je obrisan ili je link pogrešan." action={<Link to="/" className="btn btn-primary">Nazad na kvizove</Link>} />
      </div>
    )
  }

  const org = quiz.organization
  const accent = accentOf(org)
  const title = cleanTitle(quiz.title)
  const team = teamSizeLong(quiz.min_team_members, quiz.max_team_members)
  const cancelled = quiz.status === 'cancelled'
  // Signing up or saving to a calendar makes no sense once the evening is over.
  const over = (quiz.quiz_date ?? '').slice(0, 10) < todayIso()
  const day = relativeDay(quiz.quiz_date)
  const phone = quiz.contact_phone
  const lat = quiz.latitude != null ? Number(quiz.latitude) : null
  const lng = quiz.longitude != null ? Number(quiz.longitude) : null
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([quiz.location, quiz.address].filter(Boolean).join(', '))}`
  const more = (orgData?.quizzes ?? [])
    .filter(q => q.slug !== quiz.slug && (q.quiz_date ?? '').slice(0, 10) >= todayIso())
    .sort((a, b) => (a.quiz_date ?? '').localeCompare(b.quiz_date ?? ''))
    .slice(0, 4)
  const subscribed = orgData?.organization.is_subscribed ?? false

  return (
    <div style={{ position: 'relative' }}>
      {quiz.cover_image_url && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '-120px -10% auto', height: 760, overflow: 'hidden', pointerEvents: 'none' }}>
          <img src={quiz.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(70px) saturate(1.3)', opacity: 0.3 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,8,24,0) 40%, #070818)' }} />
        </div>
      )}

      <div className="page" style={{ position: 'relative', paddingTop: 20 }}>
        <Link to="/" className="back-rail" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginLeft: -12, borderRadius: 10, color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Svi kvizovi
        </Link>

        <section className="detail-hero" style={{ marginTop: 16 }}>
          <div className="detail-poster anim-up">
            {quiz.cover_image_url ? (
              <img src={quiz.cover_image_url} alt={`Poster: ${title}`} style={{
                width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block', borderRadius: 22,
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(241,242,255,0.12)',
                filter: cancelled ? 'grayscale(0.85)' : undefined,
              }} />
            ) : (
              <div style={{ aspectRatio: '4 / 5', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 40%, ${tint(accent, 0.35)}, ${tint(accent, 0.06)} 70%), #0D0F2A` }}>
                <OrgDragon org={org} size={220} />
              </div>
            )}
          </div>

          <div className="detail-info">
            <div className="detail-title-row">
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <div className="anim-up" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, animationDelay: '0.08s' }}>
                  {cancelled ? (
                    <span style={{ padding: '7px 12px', borderRadius: 999, background: 'var(--danger)', color: '#2A0A12', fontSize: 13, fontWeight: 700 }}>OTKAZANO</span>
                  ) : day && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, background: day === 'Večeras' ? 'var(--lime)' : 'rgba(241,242,255,0.08)', color: day === 'Večeras' ? 'var(--on-lime)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}>
                      {day === 'Večeras' && <span className="live-dot dark" />}
                      {day.toUpperCase()}{quiz.quiz_time ? ` · ${formatTime(quiz.quiz_time)}` : ''}
                    </span>
                  )}
                </div>
                <h1 className="display anim-up" style={{ fontSize: 'clamp(34px, 4.6vw, 60px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.035em', animationDelay: '0.12s', textDecoration: cancelled ? 'line-through' : undefined }}>
                  {title}
                </h1>
              </div>

              <div className="anim-peek" style={{
                flex: '0 1 300px', position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 8px', marginTop: 18,
                borderRadius: 22, background: `linear-gradient(120deg, ${tint(accent, 0.2)}, rgba(17,19,46,0.85) 65%)`, border: `1px solid ${tint(accent, 0.38)}`,
              }}>
                <span style={{ flex: 'none', margin: '-40px 0 -14px' }}><OrgDragon org={org} size={104} /></span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Link to={`/organizacije/${org.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', textDecoration: 'none', minWidth: 0 }}>
                    <OrgBadge org={org} size={32} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>Organizator</span>
                      <span className="display" style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</span>
                    </span>
                  </Link>
                  <span><SubscribeButton slug={org.slug} isSubscribed={subscribed} org={org} size="sm" color={accent} /></span>
                </span>
              </div>
            </div>

            {cancelled && (
              <div role="status" style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--danger-soft)', border: '1px solid rgba(255,92,122,0.4)', color: '#FFB3C1', fontWeight: 600 }}>
                Ovaj kviz je otkazan.
              </div>
            )}

            <div className="fact-grid anim-up" style={{ animationDelay: '0.2s' }}>
              {quiz.quiz_date && <Fact icon={<Calendar size={18} />} label="Datum" value={longDate(quiz.quiz_date)} />}
              {quiz.quiz_time && <Fact icon={<Clock size={18} />} label="Vreme" value={formatTime(quiz.quiz_time)} />}
              {(quiz.location || quiz.address) && (
                <Fact
                  icon={<MapPin size={18} />}
                  label="Lokacija"
                  value={<a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{quiz.location ?? quiz.address}</a>}
                  sub={quiz.location && quiz.address ? quiz.address : undefined}
                />
              )}
              <Fact icon={<Coins size={18} />} label="Kotizacija" value={formatPrice(quiz.entry_fee)} />
              {team && <Fact icon={<Users size={18} />} label="Ekipa" value={team} />}
              {phone && <Fact icon={<Phone size={18} />} label="Kontakt" value={<a href={`tel:${phone}`} style={{ color: 'var(--lime)', textDecoration: 'none' }}>{phone}</a>} />}
            </div>

            <div className="detail-actions sticky-mobile anim-up" style={{ animationDelay: '0.28s' }}>
              {phone && !cancelled && !over && (
                <a href={`tel:${phone}`} className="btn btn-primary">
                  <Phone size={18} aria-hidden="true" /><span className="only-desktop">Prijavi ekipu: {phone}</span><span className="only-mobile">Prijavi ekipu</span>
                </a>
              )}
              {quiz.instagram_post_url && (
                <a href={quiz.instagram_post_url} target="_blank" rel="noopener noreferrer" className={`btn ${phone && !over ? 'btn-secondary' : 'btn-primary'}`}>
                  <Instagram size={18} />{phone && !over ? <span className="only-desktop">Instagram objava</span> : 'Instagram objava'}
                </a>
              )}
              {quiz.quiz_date && !cancelled && !over && (
                <a href={`/api/quizzes/${quiz.slug}/calendar.ics`} target="_blank" rel="noopener" className="btn btn-secondary" aria-label="Dodaj u kalendar">
                  <CalendarPlus size={18} aria-hidden="true" /><span className="only-desktop">Dodaj u kalendar</span>
                </a>
              )}
              <HeartButton quizSlug={quiz.slug} isFavorited={quiz.is_favorited ?? false} size={20} style={{ width: 48, height: 48, borderRadius: 14 }} />
            </div>
          </div>
        </section>

        <section style={{ marginTop: 48, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {quiz.description && (
            <div style={{ flex: '999 1 520px', minWidth: 0, padding: '24px 26px', borderRadius: 22, background: 'rgba(17,19,46,0.75)', border: '1px solid var(--border-subtle)' }}>
              <h2 className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>O kvizu</h2>
              <Description text={quiz.description} />
            </div>
          )}
          {lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng) && (
            <div style={{ flex: '1 1 320px', minHeight: 260, position: 'relative', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <Suspense fallback={<div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}>
                <MiniMap lat={lat} lng={lng} />
              </Suspense>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
                position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 500, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(7,8,24,0.88)', backdropFilter: 'blur(8px)', color: 'var(--text-primary)', textDecoration: 'none',
              }}>
                <span style={{ display: 'block', fontWeight: 700 }}>{quiz.location ?? quiz.address}</span>
                <span style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)' }}>Otvori u Google mapama →</span>
              </a>
            </div>
          )}
        </section>

        {more.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 className="display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Još od organizatora {org.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {more.map(q => (
                <Link key={q.id} to={`/kvizovi/${q.slug}`} className="lift" style={{ display: 'flex', gap: 14, padding: 12, borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                  {q.cover_image_url
                    ? <img src={q.cover_image_url} alt="" loading="lazy" style={{ width: 80, aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 12, flex: 'none' }} />
                    : <span style={{ width: 80, aspectRatio: '4 / 5', borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(accent, 0.15) }}><OrgDragon org={org} size={64} animated={false} /></span>}
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, paddingTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)' }}>{shortDate(q.quiz_date)}{q.quiz_time ? ` · ${formatTime(q.quiz_time)}` : ''}</span>
                    <span className="display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{cleanTitle(q.title)}</span>
                    {q.location && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{q.location}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className="only-mobile" style={{ height: 90 }} />
      </div>
    </div>
  )
}

function Fact({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 16, background: 'rgba(17,19,46,0.75)', border: '1px solid var(--border-subtle)' }}>
      <span aria-hidden="true" style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: 'var(--lime-soft)', color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</span>
        <span className="display" style={{ display: 'block', fontSize: 17, fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</span>
        {sub && <span style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</span>}
      </span>
    </div>
  )
}

function Description({ text }: { text: string }) {
  // Instagram captions use single newlines for line breaks.
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

  // Separate a trailing block that is mostly hashtags.
  const last = blocks[blocks.length - 1]?.join(' ') ?? ''
  const hashtagCount = (last.match(/#\w+/g) ?? []).length
  const isLastHashtags = hashtagCount >= 3 && hashtagCount / Math.max(last.split(/\s+/).length, 1) > 0.5
  const contentBlocks = isLastHashtags ? blocks.slice(0, -1) : blocks
  const hashtagBlock = isLastHashtags ? blocks[blocks.length - 1] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {contentBlocks.map((para, i) => (
        <p key={i} style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxWidth: '68ch' }}>
          {para.join('\n')}
        </p>
      ))}
      {hashtagBlock && (
        <p style={{ marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
          {hashtagBlock.join(' ')}
        </p>
      )}
    </div>
  )
}
