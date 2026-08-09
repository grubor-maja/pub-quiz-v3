import { useQuery } from '@tanstack/react-query'
import { Heart, Mail, User as UserIcon } from 'lucide-react'
import { fetchFavorites } from '../api'
import { useAuth } from '../context/AuthContext'
import QuizCard from '../components/QuizCard'
import { kvizWord } from '../lib/utils'

export default function ProfilePage() {
  const { user } = useAuth()

  const { data: favorites, isLoading, isError } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: !!user,
  })

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
          {favorites ? `${favorites.length} ${kvizWord(favorites.length)}` : ''}
        </span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Ucitavanje...
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Greska pri ucitavanju favorita.
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
          Jos uvek nemas omiljene kvizove. Klikni na srce na kartici kviza da ga dodas.
        </div>
      ) : (
        <div className="card-grid">
          {favorites.map(quiz => (
            <QuizCard key={quiz.id} quiz={{ ...quiz, is_favorited: true }} />
          ))}
        </div>
      )}
    </div>
  )
}
