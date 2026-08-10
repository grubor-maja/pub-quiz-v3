import { useState, useEffect } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { fetchOrganizations, fetchQuizzes } from '../api'
import QuizCard from '../components/QuizCard'
import LoadingScreen from '../components/LoadingScreen'
import Toolbar from '../components/Toolbar'
import UpcomingRow from '../components/UpcomingRow'
import type { QuizFilters } from '../types'
import { rezultatWord } from '../lib/utils'

export default function HomePage() {
  const [filters, setFilters] = useState<QuizFilters>({})
  const [searchInput, setSearchInput] = useState('')

  // auto-apply search with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

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
    setSearchInput('')
  }

  return (
    <div className="page-pad">
      <Toolbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        initialOrg={filters.org ?? ''}
        initialDateFrom={filters.date_from ?? ''}
        initialDateTo={filters.date_to ?? ''}
        onApplyFilters={(org, dateFrom, dateTo) =>
          setFilters(f => ({
            ...f,
            org: org || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page: 1,
          }))
        }
        orgs={orgs}
      />

      {/* Upcoming horizontal scroller - shows first 10 quizzes */}
      {!hasFilters && <UpcomingRow />}

      {/* Section heading */}
      <div className="section-heading">
        <h2 className="sg" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          Predstojeći kvizovi
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
              <X size={10} /> ocisti
            </button>
          )}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingScreen />
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Greska pri ucitavanju. Pokusajte ponovo.
        </div>
      ) : data?.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Nema kvizova za zadate filtere.
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
