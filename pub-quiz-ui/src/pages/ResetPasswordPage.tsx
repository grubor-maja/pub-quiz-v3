import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authResetPassword } from '../api'
import { authCardStyle, authErrorStyle, authFieldStyle, authLabelStyle, authSubmitStyle } from './authStyles'
import AuthLayout from '../components/AuthLayout'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const missingToken = !token || !email

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !passwordConfirmation) {
      setError('Popuni sva polja.')
      return
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 karaktera.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Lozinke se ne poklapaju.')
      return
    }

    setSubmitting(true)
    try {
      await authResetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Lozinka je uspešno promenjena. Prijavi se sa novom lozinkom.' },
      })
    } catch (err: any) {
      const respData = err?.response?.data
      const validationErrors = respData?.errors
      if (validationErrors && typeof validationErrors === 'object') {
        const first = Object.values(validationErrors)[0]
        if (Array.isArray(first) && typeof first[0] === 'string') {
          setError(first[0])
        } else {
          setError(respData?.message ?? 'Neuspešno resetovanje lozinke.')
        }
      } else {
        setError(respData?.message ?? 'Neuspešno resetovanje lozinke.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
        <h1 className="display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Postavi novu lozinku
        </h1>

        <div style={authCardStyle}>
          {missingToken ? (
            <>
              <div style={authErrorStyle}>Nevažeći link.</div>
              <div style={{
                marginTop: 6,
                fontSize: 14,
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <Link to="/forgot-password" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
                  Zatraži novi link
                </Link>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={authLabelStyle}>
                Nova lozinka
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={authFieldStyle}
                  placeholder="Najmanje 8 karaktera"
                />
              </label>

              <label style={authLabelStyle}>
                Potvrdi lozinku
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={e => setPasswordConfirmation(e.target.value)}
                  autoComplete="new-password"
                  style={authFieldStyle}
                  placeholder="Ponovi lozinku"
                />
              </label>

              {error && <div style={authErrorStyle}>{error}</div>}

              <button
                type="submit"
                className="btn-amber"
                disabled={submitting}
                style={{ ...authSubmitStyle, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Čuvanje...' : 'Postavi novu lozinku'}
              </button>

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
          )}
        </div>
    </AuthLayout>
  )
}
