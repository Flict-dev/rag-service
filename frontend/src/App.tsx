import { type FormEvent, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Topbar from './components/Topbar'
import AuthScreen from './screens/AuthScreen'
import DocsScreen from './screens/DocsScreen'
import LandingPage from './screens/LandingPage'
import type { AuthMode, CurrentUser, UserRole } from './types'

type NavigationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('editor')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const openAuth = (mode: AuthMode) => {
    navigate(mode === 'signup' ? '/signup' : '/login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const switchAuthMode = (mode: AuthMode) => {
    navigate(mode === 'signup' ? '/signup' : '/login', { state: location.state })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDocs = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: '/docs' } } })
      return
    }

    navigate('/docs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openLanding = () => {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthSubmit = (authMode: AuthMode) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || 'editor@ragbase.local')
    const name =
      authMode === 'signup'
        ? String(formData.get('name') || 'Новый редактор')
        : 'Демо редактор'

    setCurrentUser({
      email,
      name,
      role: authMode === 'signup' ? selectedRole : 'editor',
    })

    const navigationState = location.state as NavigationState | null
    const from = navigationState?.from
    const nextPath = from?.pathname?.startsWith('/docs')
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : '/docs'

    navigate(nextPath, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const signOut = () => {
    setCurrentUser(null)
    navigate('/', { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <Topbar
        currentUser={currentUser}
        onOpenAuth={openAuth}
        onOpenDocs={openDocs}
        onOpenLanding={openLanding}
        onSignOut={signOut}
      />

      <Routes>
        <Route
          path="/"
          element={
            <LandingPage currentUser={currentUser} onOpenAuth={openAuth} onOpenDocs={openDocs} />
          }
        />
        <Route
          path="/login"
          element={
            <AuthScreen
              authMode="signin"
              currentUser={currentUser}
              selectedRole={selectedRole}
              onAuthModeChange={switchAuthMode}
              onBack={openLanding}
              onRoleChange={setSelectedRole}
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
              selectedRole={selectedRole}
              onAuthModeChange={switchAuthMode}
              onBack={openLanding}
              onRoleChange={setSelectedRole}
              onSubmit={handleAuthSubmit('signup')}
            />
          }
        />
        <Route
          path="/docs"
          element={
            currentUser ? (
              <DocsScreen currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace state={{ from: location }} />
            )
          }
        />
        <Route
          path="/docs/:articleId"
          element={
            currentUser ? (
              <DocsScreen currentUser={currentUser} />
            ) : (
              <Navigate to="/login" replace state={{ from: location }} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
