import axios from 'axios'
import type {
  AuthResponse,
  LoginPayload,
  Organization,
  PaginatedResponse,
  Quiz,
  QuizFilters,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from './types'

export const AUTH_TOKEN_KEY = 'auth_token'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export const fetchQuizzes = async (filters: QuizFilters = {}): Promise<PaginatedResponse<Quiz>> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  )
  const { data } = await api.get('/quizzes', { params })
  return data
}

export const fetchQuiz = async (slug: string): Promise<Quiz> => {
  const { data } = await api.get(`/quizzes/${slug}`)
  return data
}

export const fetchOrganizations = async (): Promise<Organization[]> => {
  const { data } = await api.get('/organizations')
  return data
}

export const fetchOrganization = async (slug: string): Promise<{ organization: Organization; quizzes: Quiz[] }> => {
  const { data } = await api.get(`/organizations/${slug}`)
  return data
}

// ---- Auth ----

export const authRegister = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export const authLogin = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export const authLogout = async (): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/logout')
  return data
}

export const authMe = async (): Promise<{ user: User }> => {
  const { data } = await api.get('/auth/me')
  return data
}

export const authForgotPassword = async (email: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export const authResetPassword = async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/reset-password', payload)
  return data
}

// ---- Favorites ----

export const fetchFavorites = async (): Promise<Quiz[]> => {
  const { data } = await api.get('/favorites')
  return data
}

export const addFavorite = async (slug: string): Promise<{ message: string }> => {
  const { data } = await api.post(`/favorites/${slug}`)
  return data
}

export const removeFavorite = async (slug: string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/favorites/${slug}`)
  return data
}

export default api
