import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import RequireAuth from './components/RequireAuth'
import HomePage from './pages/HomePage'
import QuizDetailPage from './pages/QuizDetailPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationDetailPage from './pages/OrganizationDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import { useMediaQuery } from './lib/useMediaQuery'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 899px)')
  const { pathname } = useLocation()

  // Close drawer on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // If we leave mobile, ensure drawer state doesn't leak into desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div className="container-app">
      <Sidebar isMobile={isMobile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-backdrop open"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <main style={{ overflowX: 'hidden', minWidth: 0 }}>
        {isMobile && (
          <div className="mobile-topbar">
            <button
              type="button"
              className="hamburger-btn"
              aria-label="Otvori meni"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: 'var(--text-primary)',
              }}
            >
              <img
                src="/images/logo1.png"
                alt="Ko zna zna"
                style={{ width: 30, height: 30, objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}
              >
                KoZnaZna
              </span>
            </Link>
            <span style={{ width: 40 }} aria-hidden="true" />
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kvizovi/:slug" element={<QuizDetailPage />} />
          <Route path="/organizacije" element={<OrganizationsPage />} />
          <Route path="/organizacije/:slug" element={<OrganizationDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/profil"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
