import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Topbar from './components/Topbar'
import { demoUsers } from './data/demoData'
import {
  loadArticles,
  resetArticles as resetStoredArticles,
  saveArticles,
} from './lib/articleStore'
import { fetchApiArticles } from './lib/api'
import { clearCurrentUser, loadCurrentUser, saveCurrentUser } from './lib/storage'
import AuthScreen from './screens/AuthScreen'
import DocsScreen from './screens/DocsScreen'
import LandingPage from './screens/LandingPage'
import type { AuthMode, CurrentUser, KnowledgeArticle, UserRole } from './types'

type NavigationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('editor')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => loadCurrentUser())
  const [articles, setArticles] = useState(() => loadArticles())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    saveArticles(articles)
  }, [articles])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    let ignoreResult = false

    fetchApiArticles(currentUser)
      .then((apiArticles) => {
        if (!ignoreResult) {
          setArticles(apiArticles)
        }
      })
      .catch(() => {
        if (!ignoreResult) {
          setArticles(loadArticles())
        }
      })

    return () => {
      ignoreResult = true
    }
  }, [currentUser])

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
    const selectedDemoUser =
      demoUsers.find((user) => user.role === selectedRole) ?? demoUsers[1]
    const email = String(formData.get('email') || selectedDemoUser.email)
    const name =
      authMode === 'signup'
        ? String(formData.get('name') || 'Новый редактор')
        : selectedDemoUser.name

    const nextUser: CurrentUser = {
      id: authMode === 'signup' ? `local-${selectedRole}-${Date.now()}` : selectedDemoUser.id,
      email,
      name,
      role: authMode === 'signup' ? selectedRole : selectedDemoUser.role,
    }

    saveCurrentUser(nextUser)
    setCurrentUser(nextUser)

    const navigationState = location.state as NavigationState | null
    const from = navigationState?.from
    const nextPath = from?.pathname?.startsWith('/docs')
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : '/docs'

    navigate(nextPath, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const signOut = () => {
    clearCurrentUser()
    setCurrentUser(null)
    navigate('/', { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetArticles = () => {
    const seedArticles = resetStoredArticles()
    setArticles(seedArticles)
    return seedArticles
  }

  const saveArticle = (article: KnowledgeArticle) => {
    setArticles((currentArticles) => {
      const articleExists = currentArticles.some((currentArticle) => currentArticle.id === article.id)

      if (!articleExists) {
        return [article, ...currentArticles]
      }

      return currentArticles.map((currentArticle) =>
        currentArticle.id === article.id ? article : currentArticle,
      )
    })
  }

  const deleteArticle = (articleId: string) => {
    setArticles((currentArticles) =>
      currentArticles.filter((currentArticle) => currentArticle.id !== articleId),
    )
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
              <DocsScreen
                articles={articles}
                currentUser={currentUser}
                onDeleteArticle={deleteArticle}
                onResetArticles={resetArticles}
                onSaveArticle={saveArticle}
              />
            ) : (
              <Navigate to="/login" replace state={{ from: location }} />
            )
          }
        />
        <Route
          path="/docs/:articleId"
          element={
            currentUser ? (
              <DocsScreen
                articles={articles}
                currentUser={currentUser}
                onDeleteArticle={deleteArticle}
                onResetArticles={resetArticles}
                onSaveArticle={saveArticle}
              />
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
