import { NavLink, useLocation } from 'react-router-dom'
import { Heart, LayoutGrid, LogIn, MapPin, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** The phone's navigation: a floating bar of four tabs, in place of a hamburger menu. */
export default function MobileTabBar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const quizzes = pathname === '/' || pathname.startsWith('/kvizovi')

  // A quiz's page has its own bar at the bottom (sign up, Instagram, calendar).
  if (pathname.startsWith('/kvizovi/')) return null

  return (
    <nav className="tabbar" aria-label="Glavna navigacija">
      <NavLink to="/" className={() => (quizzes ? 'active' : '')}>
        <LayoutGrid size={22} strokeWidth={2} aria-hidden="true" />Kvizovi
      </NavLink>
      <NavLink to="/mapa" className={({ isActive }) => (isActive ? 'active' : '')}>
        <MapPin size={22} strokeWidth={2} aria-hidden="true" />Mapa
      </NavLink>
      <NavLink to="/organizacije" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Users size={22} strokeWidth={2} aria-hidden="true" />Organizatori
      </NavLink>
      {user ? (
        <NavLink to="/profil" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Heart size={22} strokeWidth={2} aria-hidden="true" />Omiljeni
        </NavLink>
      ) : (
        <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
          <LogIn size={22} strokeWidth={2} aria-hidden="true" />Prijava
        </NavLink>
      )}
    </nav>
  )
}
