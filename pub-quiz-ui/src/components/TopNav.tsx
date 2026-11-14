import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CalendarCog, Heart, History, LogOut, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import Zmaj from './Zmaj'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../types'

export function Wordmark({ size = 21 }: { size?: number }) {
  return (
    <span className="display" style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      ko zna <span style={{ color: 'var(--lime)' }}>gde</span>
    </span>
  )
}

const isQuizzes = (p: string) => p === '/' || p.startsWith('/kvizovi')

export default function TopNav() {
  const { user, isLoading } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" aria-label="Ko zna gde, početna" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Zmaj size={46} animated={false} />
          <Wordmark />
        </Link>

        <nav className="only-desktop" aria-label="Glavna navigacija" style={{ display: 'flex', gap: 4 }}>
          <NavLink to="/" className={() => `topnav-link${isQuizzes(pathname) ? ' active' : ''}`}>Kvizovi</NavLink>
          <NavLink to="/mapa" className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}>Mapa</NavLink>
          <NavLink to="/organizacije" className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}>Organizatori</NavLink>
          {user && (
            <NavLink to="/profil" className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}>Omiljeni</NavLink>
          )}
        </nav>

        {isLoading ? (
          <span style={{ width: 44 }} />
        ) : user ? (
          <AccountMenu />
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">Prijavi se</Link>
        )}
      </div>
    </header>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  if (!user) return null
  const initial = user.name?.charAt(0)?.toUpperCase() ?? '?'

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Moj nalog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="display"
        style={{
          width: 44, height: 44, borderRadius: '50%', border: 0, cursor: 'pointer',
          background: 'var(--lime)', color: 'var(--on-lime)', fontWeight: 700, fontSize: 18,
        }}
      >
        {initial}
      </button>
      {open && (
        <div className="popover" style={{ right: 0, width: 260 }} role="menu">
          <div style={{ padding: '4px 12px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          <Link to="/profil" className="menu-item" role="menuitem" onClick={() => setOpen(false)}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Heart size={16} /> Omiljeni</span></Link>
          {user.is_admin ? (
            <>
              <MenuHeading>ADMIN</MenuHeading>
              <MenuLink to="/admin/kvizovi" icon={<CalendarCog size={16} />} onClick={() => setOpen(false)}>Kvizovi</MenuLink>
              <MenuLink to="/admin/organizacije" icon={<ShieldCheck size={16} />} onClick={() => setOpen(false)}>Organizacije</MenuLink>
              <MenuLink to="/admin/korisnici" icon={<Users size={16} />} onClick={() => setOpen(false)}>Korisnici</MenuLink>
              <MenuLink to="/admin/audit" icon={<History size={16} />} onClick={() => setOpen(false)}>Audit log</MenuLink>
            </>
          ) : canManage(user) && (
            <>
              <MenuHeading>ADMINISTRATOR</MenuHeading>
              <MenuLink to="/admin/organizacije" icon={<ShieldCheck size={16} />} onClick={() => setOpen(false)}>
                {user.managed_organizations!.length > 1 ? 'Moje organizacije' : 'Moja organizacija'}
              </MenuLink>
              <MenuLink to="/admin/kvizovi" icon={<CalendarCog size={16} />} onClick={() => setOpen(false)}>Moji kvizovi</MenuLink>
            </>
          )}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6 }}>
            <button type="button" className="menu-item" role="menuitem" onClick={handleLogout}>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><LogOut size={16} /> Odjavi se</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuHeading({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', padding: '10px 12px 4px' }}>{children}</div>
}

function MenuLink({ to, icon, onClick, children }: { to: string; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <Link to={to} className="menu-item" role="menuitem" onClick={onClick}>
      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{icon} {children}</span>
    </Link>
  )
}
