import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authForgotPassword } from '../api'
import { authCardStyle, authErrorStyle, authFieldStyle, authLabelStyle, authSubmitStyle, authSuccessStyle } from './authStyles'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Unesi email adresu.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Unesi validnu email adresu.')
      return
    }

    setSubmitting(true)
    try {
      await authForgotPassword(email.trim())
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Doslo je do greske. Pokusaj ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '64px 24px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          Zaboravljena lozinka
        </h1>
        <p style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: '0 0 22px',
          lineHeight: 1.5,
        }}>
          Unesi svoj email i poslacemo ti link za resetovanje lozinke.
        </p>

        <form onSubmit={handleSubmit} style={authCardStyle}>
          {success ? (
            <div style={authSuccessStyle}>
              Ako nalog postoji, proveri email za link.
            </div>
          ) : (
            <>
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

              {error && <div style={authErrorStyle}>{error}</div>}

              <button
                type="submit"
                className="btn-amber"
                disabled={submitting}
                style={{ ...authSubmitStyle, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Slanje...' : 'Posalji link'}
              </button>
            </>
          )}

          <div style={{
            marginTop: 6,
            fontSize: 12,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <Link to="/login" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
              Vrati se na prijavu
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
