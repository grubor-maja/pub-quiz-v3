import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExternalLink, Trophy } from 'lucide-react'
import { fetchOrganizations } from '../api'

export default function OrganizationsPage() {
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Organizacije</h1>
        <p className="text-zinc-500 text-sm">Organizatori pub kvizova</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-zinc-800 rounded mb-2 w-1/2" />
              <div className="h-3 bg-zinc-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {orgs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {orgs.map(org => (
            <Link
              key={org.id}
              to={`/organizacije/${org.slug}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Trophy size={16} className="text-zinc-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-medium text-zinc-100">{org.name}</h2>
                  {org.instagram_handle && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <ExternalLink size={11} />
                      <span>@{org.instagram_handle}</span>
                    </div>
                  )}
                </div>
              </div>

              {org.description && (
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{org.description}</p>
              )}

              {org.published_quizzes_count !== undefined && (
                <div className="mt-3 text-xs text-zinc-500">
                  {org.published_quizzes_count} nadolazecih kvizova
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
