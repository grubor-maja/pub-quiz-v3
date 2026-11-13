import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Zmaj from './Zmaj'

interface Props {
  /** Shows the Prijava / Registracija switch above the form. */
  mode?: 'login' | 'register'
  children: ReactNode
}

/** Login, registration and password pages: three dragons on the left, the form on the right. */
export default function AuthLayout({ mode, children }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: 'calc(100vh - 64px)' }}>
      <section className="only-desktop" style={{
        flex: '1 1 480px', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28,
        background: 'radial-gradient(circle at 50% 45%, rgba(76,29,149,0.55), rgba(7,8,24,0) 65%)',
      }}>
        {/* Centered in its half, like the form in the other half; on a wide
            screen it used to hug the window's left edge. */}
        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <p className="display anim-up" style={{ fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.035em', marginBottom: 12 }}>Ekipa te čeka.</p>
          <p className="anim-up" style={{ fontSize: 17, color: 'var(--text-tertiary)', maxWidth: 420, animationDelay: '0.1s' }}>
            Sačuvaj kvizove, zaprati organizatore i sve imaj na jednom mestu.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }} aria-hidden="true">
          <span className="anim-up" style={{ animationDelay: '0.2s' }}><Zmaj boja="tirkiz" rekvizit="lopta" majica="plava" size={150} /></span>
          <span className="anim-up" style={{ animationDelay: '0.35s', marginLeft: -20 }}><Zmaj size={190} /></span>
          <span className="anim-up" style={{ animationDelay: '0.5s', marginLeft: -20 }}><Zmaj boja="koral" rekvizit="sijalica" majica="bela" size={150} /></span>
        </div>
        </div>
      </section>

      <section style={{ flex: '1 1 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px 120px' }}>
        <div className="anim-up" style={{
          width: '100%', maxWidth: 440, padding: 28, borderRadius: 26, background: 'rgba(17,19,46,0.9)',
          border: '1px solid var(--border-default)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)', animationDelay: '0.1s',
        }}>
          <div className="only-mobile" style={{ justifyContent: 'center', marginBottom: 8 }}><Zmaj size={110} /></div>
          {mode && (
            <nav aria-label="Prijava ili registracija" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 5, borderRadius: 14, background: 'rgba(7,8,24,0.7)', marginBottom: 20 }}>
              {([['login', '/login', 'Prijava'], ['register', '/register', 'Registracija']] as const).map(([key, to, label]) => (
                <Link key={key} to={to} aria-current={mode === key ? 'page' : undefined} style={{
                  minHeight: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                  fontSize: 15, fontWeight: 700, background: mode === key ? 'var(--lime)' : 'transparent', color: mode === key ? 'var(--on-lime)' : 'var(--text-muted)',
                }}>{label}</Link>
              ))}
            </nav>
          )}
          {children}
        </div>
      </section>
    </div>
  )
}
