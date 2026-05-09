export interface Organization {
  id: string
  name: string
  slug: string
  instagram_handle: string | null
  logo_url: string | null
  description: string | null
  published_quizzes_count?: number
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
}
