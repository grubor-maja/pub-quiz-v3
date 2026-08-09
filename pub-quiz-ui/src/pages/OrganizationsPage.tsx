import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, AtSign, ChevronRight } from 'lucide-react'
import { fetchOrganizations } from '../api'
import type { Organization } from '../types'
import { kvizWord } from '../lib/utils'

export default function OrganizationsPage() {
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h1 className="sg" style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'var(--text-primary)',
          margin: '0 0 6px',
        }}>
          Organizacije
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          Organizatori pub kvizova u Srbiji
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
      }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <OrgCardSkeleton key={i} />)
          : orgs?.map(org => <OrgCard key={org.id} org={org} />)
        }
      </div>
    </div>
  )
}

function OrgCard({ org }: { org: Organization }) {
  return (
    <Link
      to={`/organizacije/${org.slug}`}
      className="org-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 14,
        padding: '22px 18px 18px',
        textDecoration: 'none',
        position: 'relative',
        textAlign: 'center',
      }}
    >
      {/* Logo */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 12,
        flexShrink: 0,
      }}>
        {org.logo_url ? (
          <img
            src={org.logo_url}
            alt={org.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Building2 size={28} style={{ color: 'var(--accent-amber)', opacity: 0.7 }} />
        )}
      </div>

      {/* Name */}
      <h3 style={{
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--text-primary)',
        margin: '0 0 4px',
        letterSpacing: '-0.005em',
      }}>
        {org.name}
      </h3>

      {/* IG handle */}
      {org.instagram_handle && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}>
          <AtSign size={10} />
          {org.instagram_handle}
        </div>
      )}

      {/* Quiz count badge */}
      {org.published_quizzes_count !== undefined && (
        <div style={{
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 6,
          background: 'var(--accent-amber-soft)',
          color: 'var(--accent-amber)',
          border: '0.5px solid rgba(233,184,74,0.2)',
          marginTop: 'auto',
        }}>
          {org.published_quizzes_count} {kvizWord(org.published_quizzes_count)}
        </div>
      )}

      {/* Chevron decoration */}
      <ChevronRight
        size={13}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          color: 'var(--text-muted)',
          opacity: 0.5,
        }}
      />
    </Link>
  )
}

function OrgCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border-subtle)',
      borderRadius: 14,
      padding: '22px 18px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-elevated)' }} />
      <div style={{ width: '60%', height: 13, background: 'var(--bg-elevated)', borderRadius: 4 }} />
      <div style={{ width: '40%', height: 10, background: 'var(--bg-elevated)', borderRadius: 4 }} />
    </div>
  )
}

