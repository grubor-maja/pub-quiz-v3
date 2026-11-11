import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { fetchOrganizations, fetchQuizzes } from '../api'
import { useAuth } from '../context/AuthContext'
import QuizCard from '../components/QuizCard'
import { SkeletonCard } from '../components/LoadingScreen'
import EmptyState from '../components/EmptyState'
import { OrgBadge } from '../components/OrgBadge'
import HomeHero from '../components/home/HomeHero'
import FilterBar from '../components/home/FilterBar'
import { toApiFilters, useQuizFilters, type Tab } from '../lib/useQuizFilters'
import { useGeo } from '../lib/useGeo'
import { kvizWord } from '../lib/utils'
import { useSeo } from '../lib/useSeo'

const TABS: { key: Tab; label: string }[] = [
  { key: 'predstojeci', label: 'Predstojeći' },
  { key: 'pratim', label: 'Pratim' },
  { key: 'arhiva', label: 'Arhiva' },
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { state, update, clear } = useQuizFilters()
  const { pos } = useGeo()
  const listRef = useRef<HTMLDivElement>(null)
  const [searchInput, setSearchInput] = useState(state.search)

  // Typing updates the address after a pause, not on every key.
  useEffect(() => {
    if (searchInput === state.search) return
    const t = setTimeout(() => update({ search: searchInput }), 400)
    return () => clearTimeout(t)
  }, [searchInput, state.search, update])

  // The "Pratim" tab needs an account; a visitor who logs out falls back to all quizzes.
  useEffect(() => {
    if (!user && state.tab === 'pratim') update({ tab: 'predstojeci' })
  }, [user, state.tab, update])

  const { data: orgs } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations, staleTime: 5 * 60 * 1000 })

  const filters = toApiFilters(state, pos)
  const query = useInfiniteQuery({
    queryKey: ['quizzes', filters],
    queryFn: ({ pageParam }) => fetchQuizzes({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
  const quizzes = query.data?.pages.flatMap(p => p.data) ?? []
  const total = query.data?.pages[0]?.total

  useSeo({
    title: state.tab === 'arhiva' ? 'Arhiva kvizova' : 'Pab kvizovi u Srbiji',
    description: state.tab === 'arhiva'
      ? 'Arhiva održanih pab kvizova u Srbiji. Pretraži po organizatoru, lokaciji i datumu.'
      : 'Agregator pab kvizova u Srbiji. Svi predstojeći kvizovi na jednom mestu: datum, vreme, lokacija, kotizacija i organizator.',
    path: '/',
  })

  const pickTab = (tab: Tab) => {
    if (tab === 'pratim' && !user) {
      navigate('/login')
      return
    }
    update({ tab })
  }

  const toggleOrg = (slug: string) =>
    update({ org: state.org.includes(slug) ? state.org.filter(s => s !== slug) : [...state.org, slug] })

  const heading = state.tab === 'arhiva' ? 'Prošli kvizovi' : state.tab === 'pratim' ? 'Organizatori koje pratim' : 'Predstojeći kvizovi'

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <HomeHero onShowAll={kada => {
        update({ kada, od: '', do: '', tab: 'predstojeci' })
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }} />

      <div ref={listRef} style={{ scrollMarginTop: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div role="tablist" aria-label="Prikaz kvizova" style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 14, background: 'rgba(17,19,46,0.85)', border: '1px solid var(--border-subtle)' }}>
          {TABS.filter(t => user || t.key !== 'pratim').map(t => {
            const on = state.tab === t.key
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => pickTab(t.key)} style={{
                minHeight: 40, padding: '0 18px', borderRadius: 10, border: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--on-lime)' : 'var(--text-muted)',
              }}>
                {t.label}
              </button>
            )
          })}
        </div>
        <label className="field" style={{ flex: '0 1 380px', minWidth: 0 }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span className="sr-only">Pretraži kvizove</span>
          <input type="search" placeholder="Pretraži kvizove, lokale…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </label>
      </div>

      {state.tab !== 'pratim' && orgs && orgs.length > 0 && (
        <div className="only-desktop" role="group" aria-label="Organizatori" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {orgs.map(o => {
            const on = state.org.includes(o.slug)
            return (
              <button key={o.id} type="button" className={`chip with-badge${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleOrg(o.slug)}>
                <OrgBadge org={o} size={28} />{o.name}
              </button>
            )
          })}
        </div>
      )}

      <FilterBar state={state} update={update} clear={() => { clear(); setSearchInput('') }} orgs={orgs} total={total} />

      <div className="section-heading">
        <h2 className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{heading}</h2>
        {total !== undefined && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{total} {kvizWord(total)}</span>}
      </div>

      {query.isLoading ? (
        <div className="card-grid">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : query.isError ? (
        <EmptyState title="Nešto nije u redu" text="Kvizove nismo uspeli da učitamo. Probaj ponovo za koji trenutak." action={<button type="button" className="btn btn-secondary" onClick={() => query.refetch()}>Probaj ponovo</button>} />
      ) : quizzes.length === 0 ? (
        state.tab === 'pratim' ? (
          <EmptyState title="Ne pratiš nijednog organizatora" text="Zaprati organizatore i ovde ćeš videti samo njihove kvizove." action={<button type="button" className="btn btn-primary" onClick={() => navigate('/organizacije')}>Upoznaj organizatore</button>} />
        ) : (
          <EmptyState title="Zmaj nije našao ništa" text="Nema kvizova za ove filtere." action={<button type="button" className="btn btn-secondary" onClick={() => { clear(); setSearchInput('') }}>Očisti filtere</button>} />
        )
      ) : (
        <div className={query.isFetching && !query.isFetchingNextPage ? 'is-fetching' : undefined}>
          <div className="card-grid">
            {quizzes.map((q, i) => <QuizCard key={q.id} quiz={q} index={i % 20} />)}
          </div>
          {query.hasNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                {query.isFetchingNextPage ? 'Učitavam…' : 'Učitaj još'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
