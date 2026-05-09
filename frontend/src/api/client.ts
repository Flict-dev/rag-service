const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000'

type ApiRequestOptions = {
  body?: unknown
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  token?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers = new Headers()

  if (options.body) {
    headers.set('content-type', 'application/json')
  }

  if (options.token) {
    headers.set('x-user-id', options.token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers,
    method: options.method ?? 'GET',
  })

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
