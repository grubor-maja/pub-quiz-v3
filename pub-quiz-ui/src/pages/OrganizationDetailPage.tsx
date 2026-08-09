import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, ExternalLink } from 'lucide-react'
import { fetchOrganization } from '../api'
import QuizCard from '../components/QuizCard'
import type { Quiz } from '../types'

export default function OrganizationDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization', slug],
    queryFn: () => fetchOrganization(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginBottom: 36,
        }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--bg-surface)' }} />
          <div style={{ width: 220, height: 22, background: 'var(--bg-surface)', borderRadius: 6 }} />
          <div style={{ width: 140, height: 12, background: 'var(--bg-surface)', borderRadius: 4 }} />
        </div>
      </div>
    )
  }

  if (isError || !data || !data.organization) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Organizacija nije pronadjena.
        <Link to="/organizacije" style={{ display: 'block', marginTop: 12, color: 'var(--accent-amber)' }}>
          Nazad
        </Link>
      </div>
    )
  }

  const org = data.organization
  const quizzes = data.quizzes ?? []
  const igUrl = org.instagram_handle ? `https://instagram.com/${org.instagram_handle}` : null

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1180, margin: '0 auto' }}>
      <Link
        to="/organizacije"
        className="back-rail"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          padding: '6px 8px',
          borderRadius: 7,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={13} />
        Sve organizacije
      </Link>

      {/* Hero - centered */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '24px 16px 32px',
        marginBottom: 28,
      }}>
        {/* Logo */}
        <div style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Building2 size={42} style={{ color: 'var(--accent-amber)', opacity: 0.7 }} />
          )}
        </div>

        {/* Name */}
        <h1 className="sg" style={{
          fontSize: 26,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          margin: '0 0 10px',
        }}>
          {org.name}
        </h1>

        {/* Instagram link */}
        {igUrl && (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="org-ig-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '7px 13px',
              borderRadius: 8,
              border: '0.5px solid var(--border-default)',
              background: 'var(--bg-surface)',
              marginBottom: 16,
            }}
          >
            <ExternalLink size={13} />
            @{org.instagram_handle}
          </a>
        )}

        {/* Description */}
        {org.description && (
          <p style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto',
          }}>
            {org.description}
          </p>
        )}
      </div>

      {/* Quizzes section */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <h2 className="sg" style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          margin: 0,
        }}>
          Kvizovi
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {quizzes.length} {labelKviz(quizzes.length)}
        </span>
      </div>

      {quizzes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px 0',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          Nema objavljenih kvizova.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18,
        }}>
          {quizzes.map((quiz: Quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={{
                ...quiz,
                organization: {
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  logo_url: org.logo_url,
                  instagram_handle: org.instagram_handle,
                  description: org.description,
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function labelKviz(n: number): string {
  if (n === 1) return 'kviz'
  if (n >= 2 && n <= 4) return 'kviza'
  return 'kvizova'
}
