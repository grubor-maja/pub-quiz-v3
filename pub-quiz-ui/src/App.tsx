import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import MobileTabBar from './components/MobileTabBar'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import HomePage from './pages/HomePage'
import QuizDetailPage from './pages/QuizDetailPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationDetailPage from './pages/OrganizationDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import LoadingScreen from './components/LoadingScreen'

// The map (Leaflet) and the admin screens load only when opened.
const MapPage = lazy(() => import('./pages/MapPage'))
const AdminQuizzesPage = lazy(() => import('./pages/admin/AdminQuizzesPage'))
const AdminOrganizationsPage = lazy(() => import('./pages/admin/AdminOrganizationsPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppShell() {
  return (
    <div className="app-bg">
      <ScrollToTop />
      <TopNav />
      <main className="app-main">
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kvizovi/:slug" element={<QuizDetailPage />} />
          <Route path="/organizacije" element={<OrganizationsPage />} />
          <Route path="/organizacije/:slug" element={<OrganizationDetailPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profil" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin/kvizovi" element={<RequireAdmin><AdminQuizzesPage /></RequireAdmin>} />
          <Route path="/admin/organizacije" element={<RequireAdmin><AdminOrganizationsPage /></RequireAdmin>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </main>
      <MobileTabBar />
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
