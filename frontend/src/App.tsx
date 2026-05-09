import { type FormEvent, useState } from 'react'
import './App.css'
import Topbar from './components/Topbar'
import AuthScreen from './screens/AuthScreen'
import DocsScreen from './screens/DocsScreen'
import LandingPage from './screens/LandingPage'
import type { AuthMode, CurrentUser, UserRole, View } from './types'

function App() {
  const [view, setView] = useState<View>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [selectedRole, setSelectedRole] = useState<UserRole>('editor')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDocs = () => {
    if (!currentUser) {
      openAuth('signin')
      return
    }

    setView('docs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openLanding = () => {
    setView('landing')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    setView('docs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const signOut = () => {
    setCurrentUser(null)
    setAuthMode('signin')
    setView('landing')
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

      {view === 'auth' ? (
        <AuthScreen
          authMode={authMode}
          currentUser={currentUser}
          selectedRole={selectedRole}
          onAuthModeChange={setAuthMode}
          onBack={openLanding}
          onRoleChange={setSelectedRole}
          onSubmit={handleAuthSubmit}
        />
      ) : view === 'docs' && currentUser ? (
        <DocsScreen currentUser={currentUser} />
      ) : (
        <LandingPage currentUser={currentUser} onOpenAuth={openAuth} onOpenDocs={openDocs} />
      )}
    </div>
  )
}

export default App
