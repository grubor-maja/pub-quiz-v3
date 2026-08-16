import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X, Bell, Grid3x3, Archive } from 'lucide-react'
import { fetchOrganizations, fetchQuizzes } from '../api'
import { useAuth } from '../context/AuthContext'
import QuizCard from '../components/QuizCard'
import LoadingScreen from '../components/LoadingScreen'
import Toolbar from '../components/Toolbar'
import OrgChipsBar from '../components/OrgChipsBar'
import type { QuizFilters } from '../types'
import { rezultatWord } from '../lib/utils'

type Tab = 'all' | 'subscribed' | 'archive'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [filters, setFilters] = useState<QuizFilters>({})
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')

  // apply tab to filter
  useEffect(() => {
    setFilters(f => ({
      ...f,
      subscribed: tab === 'subscribed' ? true : undefined,
      archive: tab === 'archive' ? true : undefined,
      page: 1,
    }))
  }, [tab])

  // reset tab if user logs out
  useEffect(() => {
    if (!user && tab === 'subscribed') setTab('all')
  }, [user, tab])

  const handleTabClick = (newTab: Tab) => {
    if (newTab === 'subscribed' && !user) {
      navigate('/login')
      return
    }
    setTab(newTab)
  }

  // auto-apply search with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // apply org selection to filters (CSV)
  useEffect(() => {
    setFilters(f => ({ ...f, org: selectedOrgs.length > 0 ? selectedOrgs.join(',') : undefined, page: 1 }))
  }, [selectedOrgs])

  const toggleOrg = (slug: string) => {
    setSelectedOrgs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['quizzes', filters],
    queryFn: () => fetchQuizzes(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })

  const hasFilters = filters.search || filters.org || filters.date_from || filters.date_to
  const currentPage = filters.page ?? 1

  const clearFilters = () => {
    setFilters({})
    setSelectedOrgs([])
    setSearchInput('')
  }

  return (
    <div className="page-pad">
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '0.5px solid var(--border-subtle)',
        marginBottom: 20,
      }}>
        <TabBtn active={tab === 'all'} onClick={() => handleTabClick('all')}>
          <Grid3x3 size={13} strokeWidth={1.8} />
          Predstojeći
        </TabBtn>
        <TabBtn active={tab === 'subscribed'} onClick={() => handleTabClick('subscribed')}>
          <Bell size={13} strokeWidth={1.8} />
          Pratim
        </TabBtn>
        <TabBtn active={tab === 'archive'} onClick={() => handleTabClick('archive')}>
          <Archive size={13} strokeWidth={1.8} />
          Arhiva
        </TabBtn>
      </div>

      <Toolbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        initialDateFrom={filters.date_from ?? ''}
        initialDateTo={filters.date_to ?? ''}
        onApplyFilters={(dateFrom, dateTo) =>
          setFilters(f => ({
            ...f,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page: 1,
          }))
        }
      />

      {/* Org chips (multi-select filter) - hidden on subscribed tab */}
      {tab !== 'subscribed' && (
        <OrgChipsBar
          orgs={orgs}
          selected={selectedOrgs}
          onToggle={toggleOrg}
          onClearAll={() => setSelectedOrgs([])}
        />
      )}

      {/* Section heading */}
      <div className="section-heading">
        <h2 className="sg" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          {tab === 'archive' ? 'Prošli kvizovi' : tab === 'subscribed' ? 'Kvizovi organizacija koje pratim' : 'Predstojeći kvizovi'}
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {data ? `${data.total} ${rezultatWord(data.total)} · sortirano po datumu` : ''}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                marginLeft: 10,
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <X size={10} /> očisti
            </button>
          )}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Greška pri učitavanju. Pokušajte ponovo.
        </div>
      ) : data?.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {tab === 'subscribed'
            ? 'Ne pratite nijednu organizaciju. Klikni "Zaprati" na stranici organizacije.'
            : tab === 'archive'
              ? 'Nema prošlih kvizova za zadate filtere.'
              : 'Nema kvizova za zadate filtere.'}
        </div>
      ) : (
        <div className={isFetching ? 'is-fetching' : undefined}>
          <div className="card-grid">
            {data?.data.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>

          {data && data.last_page > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40, flexWrap: 'wrap' }}>
              <PaginationBtn
                onClick={() => setFilters(f => ({ ...f, page: currentPage - 1 }))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
              </PaginationBtn>

              {Array.from({ length: data.last_page }, (_, i) => i + 1).map(page => (
                <PaginationBtn
                  key={page}
                  onClick={() => setFilters(f => ({ ...f, page }))}
                  active={page === currentPage}
                >
                  {page}
                </PaginationBtn>
              ))}

              <PaginationBtn
                onClick={() => setFilters(f => ({ ...f, page: currentPage + 1 }))}
                disabled={currentPage === data.last_page}
              >
                <ChevronRight size={14} />
              </PaginationBtn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 14px',
        marginBottom: -1,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent-amber)' : '2px solid transparent',
      }}
    >
      {children}
    </button>
  )
}

function PaginationBtn({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        border: '0.5px solid var(--border-default)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        background: active ? 'var(--accent-amber)' : 'rgba(255,255,255,0.03)',
        color: active ? '#0B0B10' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
        boxShadow: active ? '0 0 16px rgba(233,184,74,0.25)' : 'none',
      }}
    >
      {children}
    </button>
  )
}
