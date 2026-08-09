import { Link, useLocation } from 'react-router-dom'
import DragonLogo from './DragonLogo'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-10 bg-[#070a12]/90 backdrop-blur-xl border-b border-[#1c2640]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <DragonLogo size={34} walking={false} />
          <span className="hero-heading font-bold text-[15px] tracking-tight">
            <span style={{ color: '#EDEAE3' }}>Ko </span>
            <span style={{ color: '#E9B84A', fontStyle: 'italic' }}>zna</span>
            <span style={{ color: '#EDEAE3' }}> zna</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={pathname === '/'
              ? { color: '#E9B84A', backgroundColor: 'rgba(233,184,74,0.09)', border: '1px solid rgba(233,184,74,0.18)' }
              : { color: 'rgba(237,234,227,0.5)' }}
            onMouseEnter={e => { if (pathname !== '/') (e.currentTarget as HTMLElement).style.color = '#EDEAE3' }}
            onMouseLeave={e => { if (pathname !== '/') (e.currentTarget as HTMLElement).style.color = 'rgba(237,234,227,0.5)' }}
          >
            Kvizovi
          </Link>
          <Link
            to="/organizacije"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={pathname.startsWith('/organizacije')
              ? { color: '#E9B84A', backgroundColor: 'rgba(233,184,74,0.09)', border: '1px solid rgba(233,184,74,0.18)' }
              : { color: 'rgba(237,234,227,0.5)' }}
            onMouseEnter={e => { if (!pathname.startsWith('/organizacije')) (e.currentTarget as HTMLElement).style.color = '#EDEAE3' }}
            onMouseLeave={e => { if (!pathname.startsWith('/organizacije')) (e.currentTarget as HTMLElement).style.color = 'rgba(237,234,227,0.5)' }}
          >
            Organizacije
          </Link>
        </nav>
      </div>
    </header>
  )
}
