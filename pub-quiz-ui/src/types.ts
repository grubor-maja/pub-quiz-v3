export interface Organization {
  id: string
  name: string
  slug: string
  instagram_handle: string | null
  logo_url: string | null
  description: string | null
  published_quizzes_count?: number
  is_subscribed?: boolean
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  organization_id: string
  title: string
  slug: string
  description: string | null
  quiz_date: string | null
  quiz_time: string | null
  location: string | null
  address: string | null
  entry_fee: number | null
  min_team_members: number
  max_team_members: number
  contact_phone: string | null
  cover_image_url: string | null
  instagram_post_url: string | null
  status: 'published' | 'draft' | 'completed' | 'cancelled'
  organization: Pick<Organization, 'id' | 'name' | 'slug' | 'logo_url' | 'instagram_handle' | 'description'>
  is_favorited?: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export interface QuizFilters {
  search?: string
  org?: string
  date_from?: string
  date_to?: string
  page?: number
  subscribed?: boolean
}

export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ResetPasswordPayload {
  token: string
  email: string
  password: string
  password_confirmation: string
}
