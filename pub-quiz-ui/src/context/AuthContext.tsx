import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AUTH_TOKEN_KEY,
  authLogin,
  authLogout,
  authMe,
  authRegister,
} from '../api'
import type { LoginPayload, RegisterPayload, User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const hydrate = useCallback(async () => {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!stored) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }
    try {
      const { user } = await authMe()
      setUser(user)
      setToken(stored)
    } catch (err: any) {
      // 401 or otherwise -> clear
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authLogin(payload)
    localStorage.setItem(AUTH_TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authRegister(payload)
    localStorage.setItem(AUTH_TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authLogout()
    } catch {
      // ignore server errors, we clear local state anyway
    }
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, register, logout, refetch: hydrate }),
    [user, token, isLoading, login, register, logout, hydrate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
