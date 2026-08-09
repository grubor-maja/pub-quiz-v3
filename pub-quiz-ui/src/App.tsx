import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        minHeight: '100vh',
      }}>
        <Sidebar />
        <main style={{ overflowX: 'hidden' }}>
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
    </BrowserRouter>
  )
}
