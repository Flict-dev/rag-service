import type { CurrentUser, UserRole } from '../types'
import { apiRequest } from './client'

type LoginRequest = {
  email?: string
  role?: UserRole
}

type LoginResponse = {
  token: string
  user: CurrentUser
}

export function loginApi(credentials: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    body: credentials,
    method: 'POST',
  })
}
