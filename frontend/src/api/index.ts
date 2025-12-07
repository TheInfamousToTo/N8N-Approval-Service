const API_BASE = '/api/v1'

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP error ${response.status}`)
  }

  return response.json()
}

// Posts API
export const postsApi = {
  getAll: (params?: { status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    const query = searchParams.toString()
    return fetchApi<any>(`/posts${query ? `?${query}` : ''}`)
  },

  getById: (id: number) => fetchApi<any>(`/posts/${id}`),

  getStats: () => fetchApi<any>('/posts/stats/summary'),

  delete: (id: number) =>
    fetchApi<any>(`/posts/${id}`, { method: 'DELETE' }),

  approve: (id: number) => fetchApi<any>(`/posts/${id}/approve`),

  reject: (id: number) => fetchApi<any>(`/posts/${id}/reject`),
}

// Settings API
export const settingsApi = {
  getAll: () => fetchApi<any>('/settings'),

  update: (settings: Record<string, string>) =>
    fetchApi<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}
