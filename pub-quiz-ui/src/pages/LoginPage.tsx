import { useState, type FormEvent } from 'react'
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
  const successMessage = location.state?.successMessage ?? null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Popuni sva polja.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Unesi validnu email adresu.')
      return
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 karaktera.')
      return
    }

    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Neispravna prijava. Proveri email i lozinku.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="login">
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
