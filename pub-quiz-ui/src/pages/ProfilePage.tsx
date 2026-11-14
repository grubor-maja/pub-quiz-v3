import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { fetchFavorites, fetchSubscriptions } from '../api'
import { useAuth } from '../context/AuthContext'
import QuizCard from '../components/QuizCard'
import { SkeletonCard } from '../components/LoadingScreen'
import EmptyState from '../components/EmptyState'
import { OrgDragon } from '../components/OrgBadge'
import { accentOf, tint } from '../lib/dragon'
import { kvizWord, todayIso } from '../lib/utils'
import { useSeo } from '../lib/useSeo'
import type { Quiz } from '../types'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pastOpen, setPastOpen] = useState(false)

  useSeo({ title: 'Omiljeni', description: 'Sačuvani kvizovi i organizatori koje pratiš.', path: '/profil' })

  const { data: favorites, isLoading, isError } = useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites, enabled: !!user })
  const { data: subscribedOrgs } = useQuery({ queryKey: ['subscriptions'], queryFn: fetchSubscriptions, enabled: !!user })

  const { upcoming, past } = useMemo(() => {
    const today = todayIso()
    const upcoming: Quiz[] = []
    const past: Quiz[] = []
    for (const q of favorites ?? []) {
      const d = (q.quiz_date ?? '').slice(0, 10)
      if (d && d < today) past.push(q)
      else upcoming.push(q)
    }
    upcoming.sort((a, b) => (a.quiz_date ?? '').localeCompare(b.quiz_date ?? ''))
    return { upcoming, past }
  }, [favorites])

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="page">
      {/* No "Hello, <name>": a greeting would need the vocative, which a name cannot be trusted to form correctly. */}
      <section className="anim-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', margin: '16px 0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <span className="display" aria-hidden="true" style={{ width: 72, height: 72, flex: 'none', borderRadius: '50%', background: 'var(--lime)', color: 'var(--on-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>{initial}</span>
          <div style={{ minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>Omiljeni</h1>
            <p style={{ fontSize: 15, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{user?.name} · {user?.email}</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={async () => { await logout(); navigate('/', { replace: true }) }}>Odjavi se</button>
      </section>

      <section style={{ marginBottom: 44 }}>
        <div className="section-heading">
          <h2 className="display" style={{ fontSize: 26, fontWeight: 700 }}>Sačuvani kvizovi</h2>
          {favorites && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{upcoming.length} {kvizWord(upcoming.length)} uskoro</span>}
        </div>
        {isLoading ? (
          <div className="card-grid">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : isError ? (
          <EmptyState title="Sačuvane kvizove nismo učitali" text="Probaj ponovo za koji trenutak." />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title={favorites?.length ? 'Nema predstojećih sačuvanih kvizova' : 'Još nemaš sačuvane kvizove'}
            text="Klikni srce na kartici kviza i on će čekati ovde."
            action={<Link to="/" className="btn btn-primary">Pogledaj kvizove</Link>}
          />
        ) : (
          <div className="card-grid">{upcoming.map((q, i) => <QuizCard key={q.id} quiz={{ ...q, is_favorited: true }} index={i} />)}</div>
        )}

        {past.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn btn-secondary" aria-expanded={pastOpen} onClick={() => setPastOpen(o => !o)} style={{ borderStyle: 'dashed' }}>
              {pastOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              {pastOpen ? 'Sakrij prošle sačuvane' : `Prikaži prošle sačuvane (${past.length})`}
            </button>
            {pastOpen && (
              <div className="card-grid" style={{ marginTop: 16, opacity: 0.75 }}>
                {past.map((q, i) => <QuizCard key={q.id} quiz={{ ...q, is_favorited: true }} index={i} />)}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h2 className="display" style={{ fontSize: 26, fontWeight: 700 }}>Organizatori koje pratiš</h2>
          <Link to="/organizacije" className="tap-link" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Pronađi još →</Link>
        </div>
        {!subscribedOrgs || subscribedOrgs.length === 0 ? (
          <EmptyState title="Još ne pratiš nijednog organizatora" text="Zaprati ih i njihovi kvizovi će ti biti u tabu „Pratim“ na početnoj." action={<Link to="/organizacije" className="btn btn-primary">Upoznaj organizatore</Link>} />
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {subscribedOrgs.map(o => {
              const accent = accentOf(o)
              const n = o.published_quizzes_count ?? 0
              return (
                <Link key={o.id} to={`/organizacije/${o.slug}`} className="lift" style={{
                  width: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 12px 18px', borderRadius: 22,
                  background: tint(accent, 0.08), border: `1px solid ${tint(accent, 0.25)}`, textDecoration: 'none', color: 'var(--text-primary)',
                }}>
                  <OrgDragon org={o} size={120} />
                  <span style={{ fontSize: 15, fontWeight: 700, textAlign: 'center' }}>{o.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n} {kvizWord(n)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
