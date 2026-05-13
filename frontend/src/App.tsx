import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Topbar from './components/Topbar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { askKnowledgeBaseApi } from './api/ask'
import { loginApi, logoutApi, registerApi } from './api/auth'
import { uploadBaseDocumentApi } from './api/documents'
import {
  createKnowledgeBaseApi,
  createKnowledgePageApi,
  createKnowledgeSectionApi,
  fetchKnowledgeBasesApi,
  inviteKnowledgeBaseMemberApi,
  updateKnowledgeBaseMemberRoleApi,
  updateKnowledgePageApi,
} from './api/knowledgeBases'
import { clearSession, loadSession, saveSession } from './lib/storage'
import AuthScreen, { type AuthFormValues } from './screens/AuthScreen'
import BasesScreen from './screens/BasesScreen'
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen'
import type { AuthMode, AuthSession, BaseRole, KnowledgeBase, KnowledgeBaseMember, KnowledgePage } from './types'

type NavigationState = {
  from?: {
    hash?: string
    pathname?: string
    search?: string
  }
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [basesLoading, setBasesLoading] = useState(() => Boolean(loadSession()?.token))
  const [basesError, setBasesError] = useState<string | null>(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = session?.user ?? null
  const authRoute = location.pathname === '/login' || location.pathname === '/signup'
  const appRoute = location.pathname === '/bases' || location.pathname.startsWith('/bases/')
  const workspaceRoute = location.pathname.startsWith('/bases/')
  const showTopbar = appRoute && Boolean(currentUser)

  useEffect(() => {
    if (!session?.token) {
      return
    }

    let cancelled = false
    fetchKnowledgeBasesApi(session.token)
      .then((nextBases) => {
        if (!cancelled) {
          setBases(nextBases)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBasesError('Не удалось загрузить базы знаний.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBasesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session?.token])

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

  const finishAuth = (nextSession: AuthSession) => {
    saveSession(nextSession)
    setBasesLoading(true)
    setSession(nextSession)
    setAuthError(null)
    setBasesError(null)

    const navigationState = location.state as NavigationState | null
    const from = navigationState?.from
    const nextPath = from?.pathname?.startsWith('/bases')
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : '/bases'

    navigate(nextPath, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthSubmit = (authMode: AuthMode) => async (values: AuthFormValues) => {
    const email = values.email.trim().toLowerCase()
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

        const nextSession = await registerApi({ email, name, password })
        finishAuth(nextSession)
        return
      }

      const nextSession = await loginApi({ email, password })
      finishAuth(nextSession)
    } catch {
      setAuthError(authMode === 'signup' ? 'Не удалось зарегистрироваться.' : 'Почта или пароль не подходят.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const signOut = async () => {
    if (session?.token) {
      try {
        await logoutApi(session.token)
      } catch {
        // Local cleanup still wins if the backend session is already gone.
      }
    }

    clearSession()
    setSession(null)
    setBases([])
    setBasesError(null)
    setBasesLoading(false)
    setAuthError(null)
    navigate('/login', { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createBase = async (title: string) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const base = await createKnowledgeBaseApi(session.token, title)
    setBases((currentBases) => [base, ...currentBases])
    return base
  }

  const updateBase = (nextBase: KnowledgeBase) => {
    setBases((currentBases) =>
      currentBases.map((base) => (base.id === nextBase.id ? nextBase : base)),
    )
  }

  const mergeBaseMember = (baseId: string, member: KnowledgeBaseMember) => {
    setBases((currentBases) =>
      currentBases.map((base) => {
        if (base.id !== baseId) {
          return base
        }

        const members = base.members.some((candidate) => candidate.userId === member.userId)
          ? base.members.map((candidate) => (candidate.userId === member.userId ? member : candidate))
          : [...base.members, member]

        return {
          ...base,
          members,
          myRole: member.userId === currentUser?.id ? member.role : base.myRole,
          updatedAt: member.updatedAt,
        }
      }),
    )
  }

  const inviteMember = async (baseId: string, email: string) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const member = await inviteKnowledgeBaseMemberApi(session.token, baseId, email)
    mergeBaseMember(baseId, member)
    return member
  }

  const updateMemberRole = async (baseId: string, userId: string, role: BaseRole) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const member = await updateKnowledgeBaseMemberRoleApi(session.token, baseId, userId, role)
    mergeBaseMember(baseId, member)
    return member
  }

  const createSection = async (baseId: string, title: string) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const section = await createKnowledgeSectionApi(session.token, baseId, title)
    setBases((currentBases) =>
      currentBases.map((base) =>
        base.id === baseId
          ? { ...base, sections: [...base.sections, section], updatedAt: section.updatedAt }
          : base,
      ),
    )
    return section
  }

  const createPage = async (baseId: string, sectionId: string | undefined, title: string) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const page = await createKnowledgePageApi(session.token, baseId, sectionId, title)
    setBases((currentBases) =>
      currentBases.map((base) =>
        base.id === baseId
          ? { ...base, pages: [page, ...base.pages], updatedAt: page.updatedAt }
          : base,
      ),
    )
    return page
  }

  const savePage = async (
    baseId: string,
    pageId: string,
    payload: Partial<Pick<KnowledgePage, 'contentMd' | 'sectionId' | 'title'>>,
  ) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    const page = await updateKnowledgePageApi(session.token, baseId, pageId, payload)
    setBases((currentBases) =>
      currentBases.map((base) =>
        base.id === baseId
          ? {
              ...base,
              pages: base.pages.map((candidate) => (candidate.id === page.id ? page : candidate)),
              updatedAt: page.updatedAt,
            }
          : base,
      ),
    )
    return page
  }

  const askBase = async (baseId: string, question: string) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    return askKnowledgeBaseApi(session.token, baseId, question)
  }

  const uploadDocument = async (baseId: string, file: File) => {
    if (!session?.token) {
      throw new Error('Auth required')
    }

    return uploadBaseDocumentApi(session.token, baseId, file)
  }

  return (
    <TooltipProvider>
      <div className={workspaceRoute && currentUser ? 'app-shell app-shell-workspace' : 'app-shell'}>
        {showTopbar && !authRoute ? (
          <Topbar
            currentUser={currentUser}
            onOpenBases={openBases}
            onSignOut={signOut}
          />
        ) : null}

        <Routes>
          <Route
            path="/"
            element={<Navigate to={currentUser ? '/bases' : '/login'} replace />}
          />
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to="/bases" replace />
              ) : (
                <AuthScreen
                  authMode="signin"
                  error={authError}
                  isSubmitting={authSubmitting}
                  onAuthModeChange={switchAuthMode}
                  onSubmit={handleAuthSubmit('signin')}
                />
              )
            }
          />
          <Route
            path="/signup"
            element={
              currentUser ? (
                <Navigate to="/bases" replace />
              ) : (
                <AuthScreen
                  authMode="signup"
                  error={authError}
                  isSubmitting={authSubmitting}
                  onAuthModeChange={switchAuthMode}
                  onSubmit={handleAuthSubmit('signup')}
                />
              )
            }
          />
          <Route
            path="/bases"
            element={
              currentUser ? (
                <BasesScreen
                  bases={bases}
                  currentUser={currentUser}
                  error={basesError}
                  isLoading={basesLoading}
                  onCreateBase={createBase}
                />
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId"
            element={
              currentUser ? (
                basesLoading ? (
                  <main className="bases-page">Загружаем базу знаний...</main>
                ) : (
                  <KnowledgeBaseScreen
                    bases={bases}
                    currentUser={currentUser}
                    onAsk={askBase}
                    onCreatePage={createPage}
                    onCreateSection={createSection}
                    onInviteMember={inviteMember}
                    onSavePage={savePage}
                    onUpdateMemberRole={updateMemberRole}
                    onUpdateBase={updateBase}
                    onUploadDocument={uploadDocument}
                  />
                )
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId/page/:pageId"
            element={
              currentUser ? (
                basesLoading ? (
                  <main className="bases-page">Загружаем базу знаний...</main>
                ) : (
                  <KnowledgeBaseScreen
                    bases={bases}
                    currentUser={currentUser}
                    onAsk={askBase}
                    onCreatePage={createPage}
                    onCreateSection={createSection}
                    onInviteMember={inviteMember}
                    onSavePage={savePage}
                    onUpdateMemberRole={updateMemberRole}
                    onUpdateBase={updateBase}
                    onUploadDocument={uploadDocument}
                  />
                )
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route
            path="/bases/:baseId/section/:sectionId"
            element={
              currentUser ? (
                basesLoading ? (
                  <main className="bases-page">Загружаем базу знаний...</main>
                ) : (
                  <KnowledgeBaseScreen
                    bases={bases}
                    currentUser={currentUser}
                    onAsk={askBase}
                    onCreatePage={createPage}
                    onCreateSection={createSection}
                    onInviteMember={inviteMember}
                    onSavePage={savePage}
                    onUpdateMemberRole={updateMemberRole}
                    onUpdateBase={updateBase}
                    onUploadDocument={uploadDocument}
                  />
                )
              ) : (
                <Navigate to="/login" replace state={{ from: location }} />
              )
            }
          />
          <Route path="*" element={<Navigate to={currentUser ? '/bases' : '/login'} replace />} />
        </Routes>
      </div>
    </TooltipProvider>
  )
}

export default App
