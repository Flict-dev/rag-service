import { type FormEvent, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Command,
  FileText,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import './App.css'

type View = 'landing' | 'auth'
type AuthMode = 'signin' | 'signup'
type UserRole = 'reader' | 'editor' | 'admin'

type CurrentUser = {
  name: string
  email: string
  role: UserRole
}

const navItems = ['Продукт', 'База знаний', 'Доступы', 'Поиск']

const roleLabels: Record<UserRole, string> = {
  reader: 'Читатель',
  editor: 'Редактор',
  admin: 'Администратор',
}

const roleDescriptions: Record<UserRole, string> = {
  reader: 'Может читать базу и искать материалы.',
  editor: 'Может создавать и редактировать статьи.',
  admin: 'Может управлять ролями и публикацией.',
}

const featureCards = [
  {
    icon: BookOpen,
    title: 'Документация без тяжёлой CMS',
    description:
      'Страницы, разделы и оглавление выглядят как developer docs, но остаются понятными для всей команды.',
  },
  {
    icon: LockKeyhole,
    title: 'Редактируют только свои',
    description:
      'Роли заранее разделяют тех, кто читает, пишет, ревьюит и публикует знания.',
  },
  {
    icon: Search,
    title: 'Поиск в центре опыта',
    description:
      'Командная строка поиска помогает быстро находить статьи, владельцев и связанные процессы.',
  },
]

const docSections = [
  'Начало работы',
  'Регламенты',
  'Процессы команды',
  'Интеграции',
  'Доступы',
]

const authBenefits = [
  'Один аккаунт для чтения и редактирования',
  'Роль пользователя видна в интерфейсе',
  'Фронтенд готов к подключению API авторизации',
]

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
  }

  const signOut = () => {
    setCurrentUser(null)
    setAuthMode('signin')
  }

  return (
    <div className="app-shell">
      <Topbar
        currentUser={currentUser}
        onOpenAuth={openAuth}
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
      ) : (
        <LandingPage onOpenAuth={openAuth} />
      )}
    </div>
  )
}

type TopbarProps = {
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenLanding: () => void
  onSignOut: () => void
}

function Topbar({
  currentUser,
  onOpenAuth,
  onOpenLanding,
  onSignOut,
}: TopbarProps) {
  return (
    <header className="topbar" aria-label="Главная навигация">
      <button className="brand" onClick={onOpenLanding} type="button">
        <span className="brand-mark">R</span>
        <span>RAG Base</span>
      </button>

      <nav className="desktop-nav" aria-label="Разделы продукта">
        {navItems.map((item) => (
          <button key={item} onClick={onOpenLanding} type="button">
            {item}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        {currentUser ? (
          <>
            <span className="user-chip">
              <UserCheck aria-hidden="true" size={15} />
              {roleLabels[currentUser.role]}
            </span>
            <button className="ghost-link icon-link" onClick={onSignOut} type="button">
              <LogOut aria-hidden="true" size={16} />
              <span>Выйти</span>
            </button>
          </>
        ) : (
          <>
            <button className="ghost-link" onClick={() => onOpenAuth('signin')} type="button">
              Войти
            </button>
            <button className="primary-button" onClick={() => onOpenAuth('signup')} type="button">
              <span>Начать</span>
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  )
}

type LandingPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <main>
      <section className="hero-section" id="home">
        <div className="hero-copy">
          <a className="release-pill" href="#product">
            <Sparkles aria-hidden="true" size={16} />
            Минимальная knowledge platform для курсового проекта
          </a>
          <h1>База знаний, которую удобно читать, искать и поддерживать</h1>
          <p className="hero-lead">
            Собираем лёгкий аналог Mintlify: лендинг, авторизация, роли
            редакторов, поиск и документация в одном аккуратном интерфейсе.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button large"
              onClick={() => onOpenAuth('signup')}
              type="button"
            >
              <span>Открыть демо</span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <a className="secondary-button large" href="#product">
              <BookOpen aria-hidden="true" size={18} />
              <span>Посмотреть UX</span>
            </a>
          </div>

          <div className="trust-row" aria-label="Ключевые возможности">
            <span>
              <CheckCircle2 aria-hidden="true" size={16} />
              Быстрый старт
            </span>
            <span>
              <ShieldCheck aria-hidden="true" size={16} />
              Роли доступа
            </span>
            <span>
              <Command aria-hidden="true" size={16} />
              Поиск по ⌘K
            </span>
          </div>
        </div>

        <div className="product-preview" aria-label="Превью базы знаний">
          <div className="preview-toolbar">
            <div className="window-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="preview-search">
              <Search aria-hidden="true" size={15} />
              <span>Search or ask...</span>
              <kbd>⌘K</kbd>
            </div>
          </div>

          <div className="docs-preview-grid">
            <aside className="preview-sidebar">
              <span className="sidebar-label">Navigation</span>
              {docSections.map((section, index) => (
                <button
                  className={index === 0 ? 'active nav-row' : 'nav-row'}
                  key={section}
                  type="button"
                >
                  <FileText aria-hidden="true" size={15} />
                  <span>{section}</span>
                </button>
              ))}
            </aside>

            <article className="preview-article">
              <span className="eyebrow">Get started</span>
              <h2>Введение в базу знаний</h2>
              <p>
                Документ описывает, кто отвечает за раздел, как обновлять
                материалы и где искать связанные инструкции.
              </p>
              <div className="article-callout">
                <MessageSquare aria-hidden="true" size={18} />
                <span>
                  Assistant подскажет владельца статьи и похожие страницы.
                </span>
              </div>
              <div className="article-lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </article>

            <aside className="preview-toc">
              <span className="sidebar-label">On this page</span>
              <a href="#overview">Обзор</a>
              <a href="#roles">Роли</a>
              <a href="#search">Поиск</a>
            </aside>
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label="Состояние продукта">
        <div>
          <strong>4</strong>
          <span>ключевых экрана</span>
        </div>
        <div>
          <strong>3</strong>
          <span>роли доступа</span>
        </div>
        <div>
          <strong>1</strong>
          <span>единый поиск</span>
        </div>
      </section>

      <section className="feature-section" id="product">
        <div className="section-heading">
          <span className="eyebrow">Product surface</span>
          <h2>Минимум функций, но с правильным UX-скелетом</h2>
          <p>
            Сейчас это фронтенд-прототип, который дальше можно связать с API,
            RAG-поиском и настоящими пользователями.
          </p>
        </div>

        <div className="feature-grid">
          {featureCards.map((feature) => {
            const Icon = feature.icon

            return (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon aria-hidden="true" size={20} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="workflow-section" id="start">
        <div className="workflow-panel">
          <div>
            <span className="eyebrow">Next step</span>
            <h2>Дальше добавляем авторизацию и рабочую docs-оболочку</h2>
          </div>
          <button className="primary-button" onClick={() => onOpenAuth('signin')} type="button">
            <span>Перейти к входу</span>
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
      </section>
    </main>
  )
}

type AuthScreenProps = {
  authMode: AuthMode
  currentUser: CurrentUser | null
  selectedRole: UserRole
  onAuthModeChange: (mode: AuthMode) => void
  onBack: () => void
  onRoleChange: (role: UserRole) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function AuthScreen({
  authMode,
  currentUser,
  selectedRole,
  onAuthModeChange,
  onBack,
  onRoleChange,
  onSubmit,
}: AuthScreenProps) {
  const isSignup = authMode === 'signup'

  return (
    <main className="auth-page">
      <section className="auth-section" aria-labelledby="auth-title">
        <div className="auth-copy">
          <button className="back-button" onClick={onBack} type="button">
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Вернуться на лендинг</span>
          </button>

          <span className="eyebrow">Access layer</span>
          <h1 id="auth-title">
            {isSignup ? 'Создайте рабочий доступ' : 'Войдите в базу знаний'}
          </h1>
          <p>
            Пока это клиентский прототип: форма собирает данные, показывает
            роль пользователя и готовит интерфейс к подключению настоящего API.
          </p>

          <div className="auth-benefits">
            {authBenefits.map((benefit) => (
              <span key={benefit}>
                <CheckCircle2 aria-hidden="true" size={16} />
                {benefit}
              </span>
            ))}
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Тип авторизации">
            <button
              aria-selected={!isSignup}
              className={!isSignup ? 'active' : ''}
              onClick={() => onAuthModeChange('signin')}
              role="tab"
              type="button"
            >
              Вход
            </button>
            <button
              aria-selected={isSignup}
              className={isSignup ? 'active' : ''}
              onClick={() => onAuthModeChange('signup')}
              role="tab"
              type="button"
            >
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {isSignup && (
              <label className="field-label">
                <span>Имя</span>
                <span className="input-shell">
                  <UserPlus aria-hidden="true" size={18} />
                  <input name="name" placeholder="Максим Зданов" type="text" />
                </span>
              </label>
            )}

            <label className="field-label">
              <span>Email</span>
              <span className="input-shell">
                <Mail aria-hidden="true" size={18} />
                <input
                  defaultValue={isSignup ? '' : 'editor@ragbase.local'}
                  name="email"
                  placeholder="you@company.ru"
                  type="email"
                />
              </span>
            </label>

            <label className="field-label">
              <span>Пароль</span>
              <span className="input-shell">
                <KeyRound aria-hidden="true" size={18} />
                <input
                  defaultValue={isSignup ? '' : 'demo-password'}
                  name="password"
                  placeholder="Минимум 8 символов"
                  type="password"
                />
              </span>
            </label>

            {isSignup && (
              <fieldset className="role-fieldset">
                <legend>Роль в базе знаний</legend>
                {(['reader', 'editor', 'admin'] as UserRole[]).map((role) => (
                  <label
                    className={selectedRole === role ? 'role-option active' : 'role-option'}
                    key={role}
                  >
                    <input
                      checked={selectedRole === role}
                      name="role"
                      onChange={() => onRoleChange(role)}
                      type="radio"
                      value={role}
                    />
                    <span>
                      <strong>{roleLabels[role]}</strong>
                      <small>{roleDescriptions[role]}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <button className="primary-button wide" type="submit">
              <span>{isSignup ? 'Создать доступ' : 'Войти в демо'}</span>
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </form>

          {currentUser && (
            <div className="session-card" aria-live="polite">
              <span className="session-icon">
                <UserCheck aria-hidden="true" size={20} />
              </span>
              <div>
                <strong>{currentUser.name}</strong>
                <span>
                  {currentUser.email} · {roleLabels[currentUser.role]}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
