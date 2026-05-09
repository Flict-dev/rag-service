import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { createApiArticle, deleteApiArticle, fetchApiArticles, updateApiArticle } from './api/articles'
import { loginApi, logoutApi } from './api/auth'
import Topbar from './components/Topbar'
import { demoUsers } from './data/demoData'
import {
  loadArticles,
  resetArticles as resetStoredArticles,
  saveArticles,
} from './lib/articleStore'
import { clearSession, loadSession, saveSession } from './lib/storage'
import AuthScreen from './screens/AuthScreen'
import DocsScreen from './screens/DocsScreen'
import LandingPage from './screens/LandingPage'
import type { AuthMode, AuthSession, KnowledgeArticle, UserRole } from './types'

type NavigationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('editor')
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [articles, setArticles] = useState(() => loadArticles())
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = session?.user ?? null
  const authToken = session?.token ?? null

  useEffect(() => {
    saveArticles(articles)
  }, [articles])

  useEffect(() => {
    if (!currentUser || !authToken) {
      return
    }

    let ignoreResult = false

    Promise.resolve()
      .then(async () => {
        if (ignoreResult) {
          return
        }

        setArticlesLoading(true)
        setArticlesError(null)

        try {
          const apiArticles = await fetchApiArticles(authToken)

          if (ignoreResult) {
            return
          }

          setArticles(apiArticles)
          setArticlesError(null)
        } catch {
          if (ignoreResult) {
            return
          }

          setArticles(loadArticles())
          setArticlesError('Backend недоступен, поэтому открыта локальная копия статей.')
        }

        if (!ignoreResult) {
          setArticlesLoading(false)
        }
      })

    return () => {
      ignoreResult = true
    }
  }, [authToken, currentUser])

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

  const handleAuthSubmit = (authMode: AuthMode) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const selectedDemoUser =
      demoUsers.find((user) => user.role === selectedRole) ?? demoUsers[1]
    const email = String(formData.get('email') || selectedDemoUser.email)
    const password = String(formData.get('password') || 'demo-password')
    const name =
      authMode === 'signup'
        ? String(formData.get('name') || 'Новый редактор')
        : selectedDemoUser.name

    setAuthSubmitting(true)
    setAuthError(null)

    let nextSession: AuthSession

    try {
      if (authMode === 'signin') {
        nextSession = await loginApi({ email, password, role: selectedRole })
      } else {
        const localUser = {
          id: `local-${selectedRole}-${Date.now()}`,
          email,
          name,
          role: selectedRole,
        }
        nextSession = { token: localUser.id, user: localUser }
      }

      saveSession(nextSession)
      setSession(nextSession)
    } catch {
      const localUser = {
        id: authMode === 'signup' ? `local-${selectedRole}-${Date.now()}` : selectedDemoUser.id,
        email,
        name,
        role: authMode === 'signup' ? selectedRole : selectedDemoUser.role,
      }
      nextSession = { token: localUser.id, user: localUser }

      saveSession(nextSession)
      setSession(nextSession)
      setAuthError('Backend недоступен, поэтому вход выполнен в демо-режиме.')
    } finally {
      setAuthSubmitting(false)
    }

    const navigationState = location.state as NavigationState | null
    const from = navigationState?.from
    const nextPath = from?.pathname?.startsWith('/docs')
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : '/docs'

    navigate(nextPath, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const signOut = () => {
    if (authToken) {
      void logoutApi(authToken).catch(() => undefined)
    }

    clearSession()
    setSession(null)
    setAuthError(null)
    setArticlesError(null)
    setArticlesLoading(false)
    navigate('/', { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetArticles = () => {
    const seedArticles = resetStoredArticles()
    setArticles(seedArticles)
    return seedArticles
  }

  const saveArticleLocally = (article: KnowledgeArticle) => {
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

  const saveArticle = async (article: KnowledgeArticle) => {
    if (!currentUser || !authToken) {
      saveArticleLocally(article)
      return article
    }

    const articleExists = articles.some((currentArticle) => currentArticle.id === article.id)

    try {
      const savedArticle = articleExists
        ? await updateApiArticle(authToken, article)
        : await createApiArticle(authToken, article)

      saveArticleLocally(savedArticle)
      setArticlesError(null)
      return savedArticle
    } catch {
      saveArticleLocally(article)
      setArticlesError('Не удалось сохранить статью в backend, изменения оставлены локально.')
      return article
    }
  }

  const deleteArticleLocally = (articleId: string) => {
    setArticles((currentArticles) =>
      currentArticles.filter((currentArticle) => currentArticle.id !== articleId),
    )
  }

  const deleteArticle = async (articleId: string) => {
    if (!currentUser || !authToken) {
      deleteArticleLocally(articleId)
      return
    }

    try {
      await deleteApiArticle(authToken, articleId)
      setArticlesError(null)
    } catch {
      setArticlesError('Не удалось удалить статью в backend, она удалена только локально.')
    }

    deleteArticleLocally(articleId)
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
              error={authError}
              isSubmitting={authSubmitting}
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
              error={authError}
              isSubmitting={authSubmitting}
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
                articlesError={articlesError}
                articlesLoading={articlesLoading}
                authToken={authToken}
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
                articlesError={articlesError}
                articlesLoading={articlesLoading}
                authToken={authToken}
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
