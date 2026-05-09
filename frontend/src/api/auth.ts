import type { AuthSession, UserRole } from '../types'
import { apiRequest } from './client'

type LoginRequest = {
  email?: string
  password?: string
  role?: UserRole
}

type LoginResponse = AuthSession

export function loginApi(credentials: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    body: credentials,
    method: 'POST',
  })
}

export function logoutApi(token: string) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    token,
  })
}
