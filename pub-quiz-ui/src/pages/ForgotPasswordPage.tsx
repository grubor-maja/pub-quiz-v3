import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authForgotPassword } from '../api'
import { authCardStyle, authErrorStyle, authFieldStyle, authLabelStyle, authSubmitStyle, authSuccessStyle } from './authStyles'
import AuthLayout from '../components/AuthLayout'

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
      setError(err?.response?.data?.message ?? 'Došlo je do greške. Pokušaj ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
        <h1 className="display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Zaboravljena lozinka
        </h1>
        <p style={{
          fontSize: 15,
          color: 'var(--text-muted)',
          margin: '0 0 22px',
          lineHeight: 1.5,
        }}>
          Unesi svoj email i poslaćemo ti link za resetovanje lozinke.
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
                {submitting ? 'Slanje...' : 'Pošalji link'}
              </button>
            </>
          )}

          <div style={{
            marginTop: 6,
            fontSize: 14,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <Link to="/login" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
              Vrati se na prijavu
            </Link>
          </div>
        </form>
    </AuthLayout>
  )
}
