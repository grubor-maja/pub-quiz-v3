import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchQuizzes } from '../../api'
import Zmaj from '../Zmaj'
import { addDays, cleanTitle, endOfWeekIso, formatTime, kvizWord, todayHeading, todayIso } from '../../lib/utils'
import type { Kada } from '../../lib/useQuizFilters'
import type { Quiz } from '../../types'

type Window = { kada: Kada; when: string; cta: string; quizzes: Quiz[]; total: number }

/**
 * Tonight's quizzes; if there are none, tomorrow's; if none either, the rest
 * of this week's. Each step is one request, and usually only the first runs.
 */
async function fetchWindow(): Promise<Window | null> {
  const today = todayIso()
  const steps: { kada: Kada; from: string; to: string; when: string; cta: string }[] = [
    { kada: 'danas', from: today, to: today, when: 'večeras', cta: 'Svi večerašnji' },
    { kada: 'sutra', from: addDays(today, 1), to: addDays(today, 1), when: 'sutra', cta: 'Svi sutrašnji' },
    { kada: 'nedelja', from: today, to: endOfWeekIso(), when: 'ove nedelje', cta: 'Svi ove nedelje' },
  ]
  for (const s of steps) {
    const res = await fetchQuizzes({ date_from: s.from, date_to: s.to })
    if (res.total > 0) return { kada: s.kada, when: s.when, cta: s.cta, quizzes: res.data, total: res.total }
  }
  return null
}

/** Up to three at random, but a quiz starting within the hour always makes it in. */
function pickFan(quizzes: Quiz[]): Quiz[] {
  const now = new Date()
  const soon = quizzes.filter(q => {
    if (!q.quiz_time || q.quiz_date?.slice(0, 10) !== todayIso()) return false
    const [h, m] = q.quiz_time.split(':').map(Number)
    const start = new Date(); start.setHours(h, m, 0, 0)
    const diff = start.getTime() - now.getTime()
    return diff > 0 && diff <= 60 * 60 * 1000
  })
  const rest = quizzes.filter(q => !soon.includes(q)).sort(() => Math.random() - 0.5)
  return [...soon, ...rest].slice(0, 3)
}

const LAYOUTS: Record<number, { left: string; top: number; rot: string }[]> = {
  1: [{ left: '28%', top: 10, rot: '-3deg' }],
  2: [{ left: '10%', top: 24, rot: '-6deg' }, { left: '44%', top: 14, rot: '6deg' }],
  3: [{ left: '0%', top: 50, rot: '-9deg' }, { left: '27%', top: 0, rot: '0deg' }, { left: '54%', top: 50, rot: '9deg' }],
}

export default function HomeHero({ onShowAll }: { onShowAll: (kada: Kada) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['hero-window', todayIso()], queryFn: fetchWindow, staleTime: 60 * 1000 })
  // Picked once per load of the data, not on every render.
  const fan = useMemo(() => (data ? pickFan(data.quizzes) : []), [data])
  const layout = LAYOUTS[fan.length] ?? []

  return (
    <section style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', padding: '40px 0 36px', position: 'relative' }}>
      <span aria-hidden="true" className="float-shape" style={{ position: 'absolute', left: '44%', top: 24, width: 26, height: 26, borderRadius: '50%', border: '3px solid #A78BFA', opacity: 0.6 }} />
      <span aria-hidden="true" className="float-shape" style={{ position: 'absolute', left: '4%', bottom: 0, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: '24px solid rgba(182,242,62,0.5)', ['--r' as string]: '20deg', animationDelay: '1.5s' }} />
      <span aria-hidden="true" className="float-shape" style={{ position: 'absolute', right: '3%', top: 10, width: 18, height: 18, borderRadius: 5, background: 'rgba(167,139,250,0.55)', ['--r' as string]: '30deg', animationDelay: '0.8s' }} />

      <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="anim-up only-desktop"><Zmaj size={190} /></div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <span className="anim-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'var(--lime-soft)', color: 'var(--lime-light)', fontSize: 13, fontWeight: 600 }}>
            <span className="live-dot" />{todayHeading()}
          </span>
          {isLoading ? (
            <div className="skeleton" style={{ height: 110, width: '80%', borderRadius: 14, marginTop: 16 }} />
          ) : data ? (
            <h1 className="display" style={{ margin: '14px 0 20px', fontSize: 'clamp(38px, 5vw, 64px)', fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.035em' }}>
              <span className="anim-count" style={{ color: 'var(--lime)' }}>{data.total}</span> {kvizWord(data.total)}<br />
              <span className="anim-up" style={{ display: 'inline-block', animationDelay: '0.2s' }}>{data.when}</span>
            </h1>
          ) : (
            <h1 className="display" style={{ margin: '14px 0 20px', fontSize: 'clamp(34px, 4.4vw, 54px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>
              Ove nedelje nema<br />najavljenih kvizova
            </h1>
          )}
          {data && (
            <button type="button" className="btn btn-primary anim-up" style={{ animationDelay: '0.35s' }} onClick={() => onShowAll(data.kada)}>
              {data.cta} →
            </button>
          )}
        </div>
      </div>

      {fan.length > 0 && (
        <div className="only-desktop" style={{ flex: '1 1 420px', position: 'relative', height: 360, minWidth: 0 }}>
          {fan.map((q, i) => (
            <Link
              key={q.id}
              to={`/kvizovi/${q.slug}`}
              className="fan-card"
              aria-label={`${cleanTitle(q.title)}, ${formatTime(q.quiz_time)}, ${q.location ?? ''}: detalji`}
              style={{
                left: layout[i].left, top: layout[i].top, width: 200, aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden',
                ['--rot' as string]: layout[i].rot, animationDelay: `${0.35 + i * 0.12}s`,
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6)', border: '1px solid rgba(241,242,255,0.15)', background: '#11132E',
              }}
            >
              {q.cover_image_url
                ? <img src={q.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zmaj size={120} animated={false} /></div>}
              <span className="fan-details" style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4, padding: 16,
                background: 'linear-gradient(180deg, rgba(7,8,24,0) 30%, rgba(7,8,24,0.95) 100%)', color: 'var(--text-primary)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {formatTime(q.quiz_time)}{q.quiz_time ? ' · ' : ''}{q.organization.name}
                </span>
                <span className="display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.15 }}>{cleanTitle(q.title)}</span>
                {q.location && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{q.location}</span>}
                <span style={{ marginTop: 8, alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 10, background: 'var(--lime)', color: 'var(--on-lime)', fontSize: 13, fontWeight: 700 }}>Detalji →</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {fan.length > 0 && (
        <div className="only-mobile h-scroll" style={{ width: '100%', gap: 12, paddingBottom: 6, scrollSnapType: 'x mandatory' }}>
          {fan.map(q => (
            <Link key={q.id} to={`/kvizovi/${q.slug}`} style={{ position: 'relative', width: 230, aspectRatio: '4 / 5', borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'start', color: 'var(--text-primary)', textDecoration: 'none', background: '#11132E' }}>
              {q.cover_image_url
                ? <img src={q.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zmaj size={110} animated={false} /></div>}
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,8,24,0) 40%, rgba(7,8,24,0.95))' }} />
              <span style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)' }}>{formatTime(q.quiz_time)}{q.quiz_time ? ' · ' : ''}{q.organization.name}</span>
                <span className="display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15 }}>{cleanTitle(q.title)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
