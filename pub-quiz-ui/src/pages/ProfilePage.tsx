import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart, Mail, User as UserIcon, Bell, Building2, ChevronDown, ChevronRight, Archive } from 'lucide-react'
import { fetchFavorites, fetchSubscriptions } from '../api'
import { useAuth } from '../context/AuthContext'
import QuizCard from '../components/QuizCard'
import { kvizWord } from '../lib/utils'
import type { Quiz } from '../types'

export default function ProfilePage() {
  const { user } = useAuth()
  const [pastOpen, setPastOpen] = useState(false)

  const { data: favorites, isLoading, isError } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: !!user,
  })

  const { data: subscribedOrgs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
    enabled: !!user,
  })

  const { upcoming, past } = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const upcoming: Quiz[] = []
    const past: Quiz[] = []
    for (const q of favorites ?? []) {
      const d = (q.quiz_date ?? '').slice(0, 10)
      if (d && d < todayIso) past.push(q)
      else upcoming.push(q)
    }
    return { upcoming, past }
  }, [favorites])

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '0 0 22px',
        letterSpacing: '-0.01em',
      }}>
        Moj profil
      </h1>

      {/* User info card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        marginBottom: 32,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent-amber)',
          color: '#0B0B10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}>
            <UserIcon size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            {user?.name ?? '-'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            <Mail size={12} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            {user?.email ?? '-'}
          </div>
        </div>
      </div>

      {/* Favorites section */}
      <div className="section-heading">
        <h2 className="sg" style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Heart size={14} strokeWidth={1.8} style={{ color: 'var(--accent-amber)' }} fill="currentColor" />
          Moji favoriti
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {favorites ? `${upcoming.length} ${kvizWord(upcoming.length)}` : ''}
        </span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Učitavanje...
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Greška pri učitavanju favorita.
        </div>
      ) : !favorites || favorites.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)',
          border: '0.5px dashed var(--border-subtle)',
          borderRadius: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          Još uvek nemaš omiljene kvizove. Klikni na srce na kartici kviza da ga dodaš.
        </div>
      ) : upcoming.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'var(--bg-surface)',
          border: '0.5px dashed var(--border-subtle)',
          borderRadius: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          Nemaš predstojećih omiljenih kvizova. Pogledaj prošle ispod.
        </div>
      ) : (
        <div className="card-grid">
          {upcoming.map(quiz => (
            <QuizCard key={quiz.id} quiz={{ ...quiz, is_favorited: true }} />
          ))}
        </div>
      )}

      {/* Past favorites (collapsible) */}
      {past.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <button
            onClick={() => setPastOpen(o => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-subtle)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            {pastOpen
              ? <ChevronDown size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
              : <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />}
            <Archive size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
            <span style={{ flex: 1 }}>Prošli favoriti</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {past.length} {kvizWord(past.length)}
            </span>
          </button>

          {pastOpen && (
            <div className="card-grid" style={{ marginTop: 14, opacity: 0.75 }}>
              {past.map(quiz => (
                <QuizCard key={quiz.id} quiz={{ ...quiz, is_favorited: true }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribed organizations */}
      <div className="section-heading" style={{ marginTop: 40 }}>
        <h2 className="sg" style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Bell size={14} strokeWidth={1.8} style={{ color: 'var(--accent-amber)' }} />
          Organizacije koje pratim
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {subscribedOrgs ? `${subscribedOrgs.length}` : ''}
        </span>
      </div>

      {!subscribedOrgs || subscribedOrgs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'var(--bg-surface)',
          border: '0.5px dashed var(--border-subtle)',
          borderRadius: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          Ne pratite nijednu organizaciju. Idi na <Link to="/organizacije" style={{ color: 'var(--accent-amber)' }}>Organizacije</Link> i klikni "Zaprati".
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}>
          {subscribedOrgs.map(org => (
            <Link
              key={org.id}
              to={`/organizacije/${org.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border-subtle)',
                borderRadius: 10,
                textDecoration: 'none',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {org.logo_url
                  ? <img src={org.logo_url} alt={org.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Building2 size={16} style={{ color: 'var(--accent-amber)' }} />
                }
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {org.published_quizzes_count ?? 0} {kvizWord(org.published_quizzes_count ?? 0)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
