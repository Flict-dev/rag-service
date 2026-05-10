import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Topbar from './components/Topbar'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  clearSession,
  createKnowledgeBase,
  loadAccounts,
  loadBases,
  loadSession,
  saveAccounts,
  saveBases,
  saveSession,
} from './lib/storage'
import AuthScreen, { type AuthFormValues } from './screens/AuthScreen'
import BasesScreen from './screens/BasesScreen'
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen'
import LandingPage from './screens/LandingPage'
import type { AuthMode, AuthSession, KnowledgeBase, LocalAccount } from './types'

type NavigationState = {
  from?: {
    hash?: string
    pathname?: string
    search?: string
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function createAccountId(email: string) {
  return `user-${email.replace(/[^\p{L}\p{N}]+/gu, '-')}`
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [accounts, setAccounts] = useState<LocalAccount[]>(() => loadAccounts())
  const [bases, setBases] = useState<KnowledgeBase[]>(() => loadBases())
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = session?.user ?? null
  const workspaceRoute = /^\/bases\/[^/]+/.test(location.pathname)

  useEffect(() => {
    saveAccounts(accounts)
  }, [accounts])

  useEffect(() => {
    saveBases(bases)
  }, [bases])

  const openAuth = (mode: AuthMode) => {
    navigate(mode === 'signup' ? '/signup' : '/login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const switchAuthMode = (mode: AuthMode) => {
    navigate(mode === 'signup' ? '/signup' : '/login', { state: location.state })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openBases = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: '/bases' } } })
      return
    }

    navigate('/bases')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openLanding = () => {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const finishAuth = (nextSession: AuthSession) => {
    saveSession(nextSession)
    setSession(nextSession)
    setAuthError(null)

    const navigationState = location.state as NavigationState | null
    const from = navigationState?.from
    const nextPath = from?.pathname?.startsWith('/bases')
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : '/bases'

    navigate(nextPath, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthSubmit = (authMode: AuthMode) => (values: AuthFormValues) => {
    const email = normalizeEmail(values.email)
    const password = values.password.trim()
    const name = values.name?.trim()

    setAuthSubmitting(true)
    setAuthError(null)

    try {
      if (!email || !password) {
        setAuthError('Введите почту и пароль.')
        return
      }

      if (authMode === 'signup') {
        if (!name) {
          setAuthError('Введите имя.')
          return
        }

        if (accounts.some((account) => account.email === email)) {
          setAuthError('Аккаунт с такой почтой уже существует.')
          return
        }

        const account: LocalAccount = {
          id: createAccountId(email),
          email,
          name,
          password,
        }

        setAccounts((currentAccounts) => [account, ...currentAccounts])
        finishAuth({ token: account.id, user: { id: account.id, email: account.email, name: account.name } })
        return
      }

      const account = accounts.find(
        (candidate) => candidate.email === email && candidate.password === password,
      )

      if (!account) {
        setAuthError('Почта или пароль не подходят.')
        return
      }

      finishAuth({ token: account.id, user: { id: account.id, email: account.email, name: account.name } })
    } finally {
      setAuthSubmitting(false)
    }
  }

  const signOut = () => {
    clearSession()
    setSession(null)
    setAuthError(null)
    navigate('/', { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createBase = (title: string) => {
    const base = createKnowledgeBase(title, bases)
    setBases((currentBases) => [base, ...currentBases])
    return base
  }

  const updateBase = (nextBase: KnowledgeBase) => {
    setBases((currentBases) =>
      currentBases.map((base) => (base.id === nextBase.id ? nextBase : base)),
    )
  }

  return (
    <TooltipProvider>
      <div className="app-shell">
        {!workspaceRoute ? (
          <Topbar
            currentUser={currentUser}
            onOpenAuth={openAuth}
            onOpenBases={openBases}
            onOpenLanding={openLanding}
            onSignOut={signOut}
          />
        ) : null}

        <Routes>
          <Route
            path="/"
            element={
              <LandingPage currentUser={currentUser} onOpenAuth={openAuth} onOpenBases={openBases} />
            }
          />
          <Route
            path="/login"
            element={
              <AuthScreen
                authMode="signin"
                currentUser={currentUser}
                error={authError}
                isSubmitting={authSubmitting}
                onAuthModeChange={switchAuthMode}
                onBack={openLanding}
                onSubmit={handleAuthSubmit('signin')}
              />
            }
          />
          <Route
            path="/signup"
            element={
              <AuthScreen
                authMode="signup"
                currentUser={currentUser}
                error={authError}
                isSubmitting={authSubmitting}
                onAuthModeChange={switchAuthMode}
                onBack={openLanding}
                onSubmit={handleAuthSubmit('signup')}
              />
            }
          />
          <Route
            path="/bases"
            element={
              currentUser ? (
                <BasesScreen bases={bases} onCreateBase={createBase} />
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId"
            element={
              currentUser ? (
                <KnowledgeBaseScreen bases={bases} onUpdateBase={updateBase} />
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId/page/:pageId"
            element={
              currentUser ? (
                <KnowledgeBaseScreen bases={bases} onUpdateBase={updateBase} />
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId/section/:sectionId"
            element={
              currentUser ? (
                <KnowledgeBaseScreen bases={bases} onUpdateBase={updateBase} />
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </TooltipProvider>
  )
}

export default App
