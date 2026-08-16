import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authCardStyle, authErrorStyle, authFieldStyle, authLabelStyle, authSubmitStyle } from './authStyles'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
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
    if (password !== passwordConfirmation) {
      setError('Lozinke se ne poklapaju.')
      return
    }

    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      const respData = err?.response?.data
      const validationErrors = respData?.errors
      if (validationErrors && typeof validationErrors === 'object') {
        const first = Object.values(validationErrors)[0]
        if (Array.isArray(first) && typeof first[0] === 'string') {
          setError(first[0])
        } else {
          setError(respData?.message ?? 'Registracija neuspela.')
        }
      } else {
        setError(respData?.message ?? 'Registracija neuspela.')
      }
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
          margin: '0 0 22px',
          textAlign: 'center',
        }}>
          Registracija
        </h1>

        <form onSubmit={handleSubmit} style={authCardStyle}>
          <label style={authLabelStyle}>
            Ime
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              style={authFieldStyle}
              placeholder="Tvoje ime"
            />
          </label>

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
            {submitting ? 'Registracija...' : 'Registruj se'}
          </button>

          <div style={{
            marginTop: 6,
            fontSize: 12,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            Već imaš nalog?{' '}
            <Link to="/login" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
              Prijavi se
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
