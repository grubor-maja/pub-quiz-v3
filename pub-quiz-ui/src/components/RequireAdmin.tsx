import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../types'

/**
 * Keeps the admin screens out of the way of everyone else. This is convenience,
 * not security: the API rejects the calls behind them regardless of what the
 * frontend chooses to render.
 *
 * level "site" admits only site admins; "manager" also admits organization admins.
 */
export default function RequireAdmin({ children, level = 'site' }: { children: ReactNode; level?: 'site' | 'manager' }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Učitavanje...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  const allowed = level === 'site' ? !!user.is_admin : canManage(user)
  if (!allowed) return <Navigate to="/" replace />

  return <>{children}</>
}
