import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Keeps the admin screens out of the way of everyone else. This is convenience,
 * not security: the API rejects the calls behind them regardless of what the
 * frontend chooses to render.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Učitavanje...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />

  return <>{children}</>
}
