import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { fetchOrganizations } from '../api'
import type { Organization } from '../types'
import { kvizWord } from '../lib/utils'
import { accentOf, tint } from '../lib/dragon'
import { useSeo } from '../lib/useSeo'
import { OrgDragon } from '../components/OrgBadge'
import SubscribeButton from '../components/SubscribeButton'
import EmptyState from '../components/EmptyState'

export default function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })

  useSeo({
    title: 'Organizatori',
    description: 'Organizatori pab kvizova u Srbiji. Pregledaj njihove kvizove, termine i lokacije.',
    path: '/organizacije',
  })

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? orgs?.filter(o => o.name.toLowerCase().includes(q) || o.instagram_handle?.toLowerCase().includes(q)) : orgs
  }, [orgs, search])

  return (
    <div className="page">
      <div className="anim-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', margin: '20px 0 36px' }}>
        <div>
          <h1 className="display" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, marginBottom: 10 }}>
            Upoznaj <span style={{ color: 'var(--lime)' }}>organizatore</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-muted)', maxWidth: 520 }}>
            Zaprati one koji ti se sviđaju i njihove kvizove imaš na jednom mestu, u tabu „Pratim“.
          </p>
        </div>
        <label className="field" style={{ flex: '0 1 340px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span className="sr-only">Pretraži organizatore</span>
          <input type="search" placeholder="Pretraži organizatore" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {isLoading ? (
        <div className="org-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 380, borderRadius: 26 }} />)}
        </div>
      ) : !shown || shown.length === 0 ? (
        <EmptyState title="Nema takvog organizatora" text="Probaj drugi naziv." />
      ) : (
        <div className="org-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22 }}>
          {shown.map((o, i) => <OrgCard key={o.id} org={o} index={i} />)}
        </div>
      )}
    </div>
  )
}

/** Smaller type for longer names; past ~24 characters the ellipsis takes over. */
function nameSize(name: string): number {
  const n = name.length
  return n <= 14 ? 24 : n <= 18 ? 21 : n <= 22 ? 18 : 16
}

function OrgCard({ org, index }: { org: Organization; index: number }) {
  const accent = accentOf(org)
  const count = org.published_quizzes_count ?? 0

  return (
    <article className="anim-up lift org-card" style={{
      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%',
      padding: '22px 20px', borderRadius: 26, background: tint(accent, 0.07), border: `1px solid ${tint(accent, 0.22)}`,
      animationDelay: `${Math.min(index, 10) * 0.08}s`,
    }}>
      <Link to={`/organizacije/${org.slug}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: 'var(--text-primary)' }}>
        <span style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <span aria-hidden="true" className="org-card-halo" style={{ position: 'absolute', top: 14, width: 190, height: 190, borderRadius: '50%', background: tint(accent, 0.14) }} />
          <span className="org-card-dragon" style={{ position: 'relative' }}><OrgDragon org={org} size={210} /></span>
        </span>
        {/* One line at a size that fits the name, so every card is the same
            height and the follow button sits in the same place on each. */}
        <span className="display org-card-name" title={org.name} style={{
          marginTop: 8, maxWidth: '100%', fontSize: nameSize(org.name), lineHeight: '32px', height: 32, fontWeight: 700, letterSpacing: '-0.02em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{org.name}</span>
        <span style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>{count} {kvizWord(count)} na sajtu</span>
      </Link>
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <SubscribeButton slug={org.slug} isSubscribed={org.is_subscribed ?? false} org={org} color={accent} />
      </div>
    </article>
  )
}
