import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authFieldStyle, authCardStyle, authSubmitStyle, authLabelStyle, authErrorStyle, authSuccessStyle } from './authStyles'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { successMessage?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // The dragons play along: they cover their eyes while the password field
  // has focus, frown at an error, and hop with joy before we leave the page.
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [mood, setMood] = useState<'ljut' | 'srecan' | null>(null)
  const raspolozenje = mood ?? (passwordFocused ? 'skriva' : undefined)

  useEffect(() => {
    if (mood !== 'ljut') return
    const id = window.setTimeout(() => setMood(null), 2600)
    return () => window.clearTimeout(id)
  }, [mood])

  const fail = (message: string) => {
    setError(message)
    setMood('ljut')
  }
  const successMessage = location.state?.successMessage ?? null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      fail('Popuni sva polja.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail('Unesi validnu email adresu.')
      return
    }
    if (password.length < 8) {
      fail('Lozinka mora imati najmanje 8 karaktera.')
      return
    }

    setSubmitting(true)
    try {
      await login({ email, password })
      setMood('srecan')
      // Long enough to see the dragons celebrate; no wait for reduced motion.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
      }
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Neispravna prijava. Proveri email i lozinku.'
      fail(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="login" raspolozenje={raspolozenje}>
        <h1 className="sr-only">Prijava</h1>

        <form onSubmit={handleSubmit} style={authCardStyle}>
          {successMessage && (
            <div style={{ ...authSuccessStyle, marginBottom: 14 }}>{successMessage}</div>
          )}

          <label style={authLabelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={authFieldStyle}
              placeholder="tvoj@email.com"
            />
          </label>

          <label style={authLabelStyle}>
            Lozinka
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={authFieldStyle}
              placeholder="********"
            />
          </label>

          {error && <div style={authErrorStyle}>{error}</div>}

          <button
            type="submit"
            className="btn-amber"
            disabled={submitting}
            style={{ ...authSubmitStyle, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 6,
            fontSize: 14,
            textAlign: 'center',
          }}>
            <Link to="/forgot-password" className="tap-link" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Zaboravio si lozinku?
            </Link>
            <div style={{ color: 'var(--text-muted)' }}>
              Nemaš nalog?{' '}
              <Link to="/register" className="tap-link" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
                Registruj se
              </Link>
            </div>
          </div>
        </form>
    </AuthLayout>
  )
}
