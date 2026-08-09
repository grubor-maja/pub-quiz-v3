import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Brain,
  Building2,
  User as UserIcon,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface NavItemProps {
  to?: string
  icon: LucideIcon
  label: string
  count?: number
  active?: boolean
}

function NavItem({ to, icon: Icon, label, count, active }: NavItemProps) {
  const cls = `nav-item${active ? ' active' : ''}`
  const inner = (
    <>
      <Icon size={15} strokeWidth={1.8} style={{ opacity: active ? 1 : 0.75, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontSize: 10,
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text-tertiary)',
          padding: '2px 6px',
          borderRadius: 4,
        }}>
          {count}
        </span>
      )}
    </>
  )

  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <div className={cls}>{inner}</div>
}

interface SidebarProps {
  isMobile?: boolean
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ isMobile = false, open = false, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const { user, logout, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    onClose?.()
    navigate('/', { replace: true })
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? ''

  return (
    <aside
      className={`sidebar-desktop${isMobile && open ? ' open' : ''}`}
      aria-hidden={isMobile && !open ? 'true' : undefined}
    >

      {/* Brand */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px 22px',
        borderBottom: '0.5px solid var(--border-subtle)',
        marginBottom: 18,
      }}>
        <img
          src="/images/logo1.png"
          alt="Ko zna zna"
          style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }}
        />
        <span style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 20,
          fontWeight:300,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          koZnaZna
        </span>
      </div>

      {/* Nav: Glavno */}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        padding: '0 8px 8px',
      }}>
        Glavno
      </div>

      <NavItem to="/" icon={Brain} label="Kvizovi" active={pathname === '/' || pathname.startsWith('/kvizovi')} />
      <NavItem to="/organizacije" icon={Building2} label="Organizacije" active={pathname.startsWith('/organizacije')} />

      {user && (
        <NavItem to="/profil" icon={UserIcon} label="Moj profil" active={pathname.startsWith('/profil')} />
      )}

      {/* User footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '0.5px solid var(--border-subtle)',
      }}>
        {isLoading ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px' }}>...</div>
        ) : user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--accent-amber)',
                color: '#0B0B10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '4px 8px',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <LogOut size={11} strokeWidth={1.8} />
              Odjava
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
            <Link
              to="/login"
              className="btn-amber"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Prijava
            </Link>
            <Link
              to="/register"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                color: 'var(--accent-amber)',
                border: '0.5px solid rgba(233,184,74,0.35)',
                background: 'var(--accent-amber-soft)',
              }}
            >
              Registracija
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
