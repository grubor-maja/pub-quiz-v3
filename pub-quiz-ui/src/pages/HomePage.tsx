import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, X } from 'lucide-react'
import { fetchOrganizations, fetchQuizzes } from '../api'
import QuizCard from '../components/QuizCard'
import type { QuizFilters } from '../types'

export default function HomePage() {
  const [filters, setFilters] = useState<QuizFilters>({})
  const [searchInput, setSearchInput] = useState('')

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quizzes', filters],
    queryFn: () => fetchQuizzes(filters),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(f => ({ ...f, search: searchInput, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchInput('')
  }

  const hasFilters = filters.search || filters.org || filters.date_from || filters.date_to

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Pub kvizovi</h1>
        <p className="text-zinc-500 text-sm">Pronadji kviz u svom gradu</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Pretrazi kvizove..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Trazi
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={filters.org ?? ''}
            onChange={e => setFilters(f => ({ ...f, org: e.target.value || undefined, page: 1 }))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">Sve organizacije</option>
            {orgs?.map(org => (
              <option key={org.id} value={org.slug}>{org.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || undefined, page: 1 }))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
          />

          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || undefined, page: 1 }))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">Aktivni filteri</span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X size={12} /> Ocisti
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded mb-3 w-3/4" />
              <div className="h-3 bg-zinc-800 rounded mb-2 w-1/2" />
              <div className="h-3 bg-zinc-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-zinc-500">
          Greska pri ucitavanju. Pokusajte ponovo.
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-500">{data.total} kvizova</span>
          </div>

          {data.data.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              Nema kvizova za zadate filtere.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          )}

          {data.last_page > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: data.last_page }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setFilters(f => ({ ...f, page }))}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    page === (filters.page ?? 1)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
