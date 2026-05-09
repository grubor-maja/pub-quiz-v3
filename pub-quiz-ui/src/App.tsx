import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import QuizDetailPage from './pages/QuizDetailPage'
import OrganizationsPage from './pages/OrganizationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kvizovi/:slug" element={<QuizDetailPage />} />
        <Route path="/organizacije" element={<OrganizationsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
