import axios from 'axios'
import type { Organization, PaginatedResponse, Quiz, QuizFilters } from './types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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

export const fetchOrganization = async (slug: string): Promise<Organization> => {
  const { data } = await api.get(`/organizations/${slug}`)
  return data
}
