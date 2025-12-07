export interface Post {
  id: number
  content: string
  source: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED'
  n8n_callback_url: string
  created_at: string
  approved_at: string | null
  posted_at: string | null
}

export interface Settings {
  discord_webhook_url?: string
  n8n_base_url?: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    total: number
    limit: number
    offset: number
  }
}

export interface Stats {
  pending: number
  approved: number
  rejected: number
  posted: number
  total: number
}
