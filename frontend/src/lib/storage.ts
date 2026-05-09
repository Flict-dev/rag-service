import type { AuthSession, CurrentUser, UserRole } from '../types'

const CURRENT_USER_STORAGE_KEY = 'rag-base/current-user/v1'
const STORAGE_VERSION = 1
const USER_ROLES = new Set<UserRole>(['reader', 'editor', 'admin'])

type StoredCurrentUser = {
  token?: string
  version: typeof STORAGE_VERSION
  user: CurrentUser
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.has(value as UserRole)
}

function normalizeUser(value: unknown): CurrentUser | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<CurrentUser>

  if (
    typeof candidate.name !== 'string' ||
    typeof candidate.email !== 'string' ||
    !isUserRole(candidate.role)
  ) {
    return null
  }

  return {
    id: typeof candidate.id === 'string' ? candidate.id : `legacy-${candidate.email}`,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
  }
}

export function loadSession(): AuthSession | null {
  if (!hasLocalStorage()) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredCurrentUser> | CurrentUser
    const userCandidate = 'user' in parsedValue ? parsedValue.user : parsedValue
    const user = normalizeUser(userCandidate)

    if (!user) {
      return null
    }

    return {
      token: 'token' in parsedValue && typeof parsedValue.token === 'string' ? parsedValue.token : user.id,
      user,
    }
  } catch {
    return null
  }
}

export function loadCurrentUser() {
  return loadSession()?.user ?? null
}

export function saveSession(session: AuthSession) {
  if (!hasLocalStorage()) {
    return
  }

  const storedUser: StoredCurrentUser = {
    token: session.token,
    version: STORAGE_VERSION,
    user: session.user,
  }

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(storedUser))
}

export function saveCurrentUser(user: CurrentUser) {
  saveSession({ token: user.id, user })
}

export function clearSession() {
  if (!hasLocalStorage()) {
    return
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
}

export const clearCurrentUser = clearSession
