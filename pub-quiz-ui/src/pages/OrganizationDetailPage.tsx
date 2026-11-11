import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchOrganization } from '../api'
import QuizCard from '../components/QuizCard'
import SubscribeButton from '../components/SubscribeButton'
import { OrgBadge, OrgDragon } from '../components/OrgBadge'
import EmptyState from '../components/EmptyState'
import { Instagram } from '../components/icons'
import { accentOf, tint } from '../lib/dragon'
import { kvizWord, pluralSr, todayIso } from '../lib/utils'
import { useSeo } from '../lib/useSeo'

export default function OrganizationDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<'predstojeci' | 'arhiva'>('predstojeci')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization', slug],
    queryFn: () => fetchOrganization(slug!),
    enabled: !!slug,
  })

  // Must sit above the early returns below, which is why it reads from data.
  useSeo({
    title: data?.organization?.name ?? '',
    description: data?.organization?.description
      ?? `Pab kvizovi u organizaciji ${data?.organization?.name}. Termini, lokacije, kotizacija i prijava.`,
    path: `/organizacije/${slug}`,
    image: data?.organization?.logo_url ?? undefined,
    enabled: !!data?.organization,
  })

  if (isLoading) {
    return (
      <div className="page" style={{ paddingTop: 60 }}>
        <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: 280, height: 280, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="skeleton" style={{ height: 56, width: '60%', borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 18, width: '40%', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data?.organization) {
    return (
      <div className="page" style={{ paddingTop: 72 }}>
        <EmptyState title="Ovog organizatora nismo našli" action={<Link to="/organizacije" className="btn btn-primary">Svi organizatori</Link>} />
      </div>
    )
  }

  const org = data.organization
  const accent = accentOf(org)
  const today = todayIso()
  const all = (data.quizzes ?? []).map(q => ({ ...q, organization: { ...org } }))
  const upcoming = all.filter(q => (q.quiz_date ?? '').slice(0, 10) >= today).sort((a, b) => (a.quiz_date ?? '').localeCompare(b.quiz_date ?? ''))
  const past = all.filter(q => (q.quiz_date ?? '').slice(0, 10) < today)
  const shown = tab === 'predstojeci' ? upcoming : past
  const igUrl = org.instagram_handle ? `https://instagram.com/${org.instagram_handle}` : null

  return (
    <div>
      <section style={{ background: `linear-gradient(180deg, ${tint(accent, 0.16)}, ${tint(accent, 0)} 90%)`, borderBottom: `1px solid ${tint(accent, 0.15)}` }}>
        <div className="page" style={{ paddingBottom: 40, paddingTop: 20 }}>
          <Link to="/organizacije" className="back-rail" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginLeft: -12, borderRadius: 10, color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 14 }}>
            <ArrowLeft size={16} aria-hidden="true" /> Svi organizatori
          </Link>
          <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <div className="anim-peek" style={{ position: 'relative', flex: 'none', width: 280, height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <svg className="spin-slow" aria-hidden="true" viewBox="0 0 280 280" width="280" height="280" style={{ position: 'absolute', top: 6, left: 0 }}>
                <circle cx="140" cy="140" r="132" fill={tint(accent, 0.1)} stroke={tint(accent, 0.45)} strokeWidth="2" strokeDasharray="4 10" />
              </svg>
              <span style={{ position: 'relative' }}><OrgDragon org={org} size={250} /></span>
            </div>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <div className="anim-up" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
                <h1 className="display" style={{ fontSize: 'clamp(38px, 5vw, 64px)', fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.035em' }}>{org.name}</h1>
                <OrgBadge org={org} size={64} />
              </div>
              {org.description && (
                <p className="anim-up" style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--text-tertiary)', maxWidth: 560, marginBottom: 22, animationDelay: '0.08s' }}>{org.description}</p>
              )}
              <div className="anim-up" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', animationDelay: '0.14s' }}>
                <SubscribeButton slug={org.slug} isSubscribed={org.is_subscribed ?? false} org={org} color={accent} />
                {igUrl && (
                  <a href={igUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <Instagram size={18} /> @{org.instagram_handle}
                  </a>
                )}
              </div>
              <p className="anim-up" style={{ marginTop: 24, fontSize: 17, color: 'var(--text-muted)', animationDelay: '0.2s' }}>
                <span className="display" style={{ fontSize: 22, fontWeight: 700, color: accent }}>{upcoming.length}</span>{' '}
                {pluralSr(upcoming.length, 'predstojeći kviz', 'predstojeća kviza', 'predstojećih kvizova')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page" style={{ paddingTop: 32 }}>
        <div role="tablist" aria-label="Kvizovi organizatora" style={{ display: 'inline-flex', gap: 6, padding: 5, borderRadius: 14, background: 'rgba(17,19,46,0.85)', border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
          {([['predstojeci', `Predstojeći (${upcoming.length})`], ['arhiva', `Arhiva (${past.length})`]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{
              minHeight: 40, padding: '0 18px', borderRadius: 10, border: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: tab === k ? accent : 'transparent', color: tab === k ? 'var(--on-lime)' : 'var(--text-muted)',
            }}>{label}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title={tab === 'predstojeci' ? 'Trenutno nema najavljenih kvizova' : 'Još nema prošlih kvizova'}
            text={tab === 'predstojeci' ? `${org.name} još nije objavio sledeći kviz. Zaprati ih da ti se pojavi u tabu „Pratim“ čim ga objave.` : undefined}
          />
        ) : (
          <div className="card-grid">
            {shown.map((q, i) => <QuizCard key={q.id} quiz={q} index={i} hideOrg />)}
          </div>
        )}
        <p style={{ marginTop: 18, fontSize: 14, color: 'var(--text-muted)' }}>{all.length} {kvizWord(all.length)} ukupno na sajtu</p>
      </div>
    </div>
  )
}
