import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Edit3,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import './App.css'

type View = 'landing' | 'auth' | 'docs'
type AuthMode = 'signin' | 'signup'
type UserRole = 'reader' | 'editor' | 'admin'

type CurrentUser = {
  name: string
  email: string
  role: UserRole
}

type ArticleSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

type KnowledgeArticle = {
  id: string
  group: string
  title: string
  description: string
  owner: string
  updated: string
  access: UserRole[]
  tags: string[]
  sections: ArticleSection[]
}

type EditorAccess = {
  name: string
  role: UserRole
  scope: string
  status: string
}

type NavItem = {
  label: string
  sectionId?: string
  opensDocs?: boolean
}

const navItems: NavItem[] = [
  { label: 'Продукт', sectionId: 'home' },
  { label: 'Возможности', sectionId: 'capabilities' },
  { label: 'Доступы', sectionId: 'access' },
  { label: 'Поиск', opensDocs: true },
]

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
    title: 'Статьи в одном месте',
    description:
      'Инструкции, регламенты и ответы на частые вопросы хранятся в общей базе. У каждой страницы есть владелец и дата обновления.',
  },
  {
    title: 'Быстрый поиск',
    description:
      'Можно найти материал по названию, разделу, тегу или владельцу. В демо поиск открывается кнопкой или через ⌘K.',
  },
  {
    title: 'Права без путаницы',
    description:
      'Читатель открывает статьи, редактор обновляет материалы, администратор управляет ролями и публикацией.',
  },
]

const productStats = [
  {
    value: '⌘K',
    label: 'поиск по статьям, тегам и владельцам',
  },
  {
    value: '3 роли',
    label: 'читатель, редактор и администратор',
  },
]

const productTeams = ['Разработка', 'Поддержка', 'Операции', 'HR', 'Юристы']

const accessModes = [
  {
    title: 'Читатель',
    description: 'Открывает статьи, ищет ответы и видит владельца материала.',
  },
  {
    title: 'Редактор',
    description: 'Создаёт и обновляет статьи, которые относятся к его команде.',
  },
  {
    title: 'Администратор',
    description: 'Управляет публикацией, ролями и структурой базы знаний.',
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
  'Доступы сразу влияют на действия в базе',
]

const editorAccess: EditorAccess[] = [
  {
    name: 'Демо редактор',
    role: 'editor',
    scope: 'Регламенты и процессы команды',
    status: 'Активен',
  },
  {
    name: 'Контент-админ',
    role: 'admin',
    scope: 'Публикация, роли, структура разделов',
    status: 'Активен',
  },
  {
    name: 'Наблюдатель проекта',
    role: 'reader',
    scope: 'Чтение и поиск по базе',
    status: 'Только чтение',
  },
]

const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 'intro',
    group: 'Начало',
    title: 'Введение в базу знаний',
    description:
      'Короткое описание того, как команда хранит регламенты, инструкции и владельцев материалов.',
    owner: 'Демо редактор',
    updated: '08.05.2026',
    access: ['editor', 'admin'],
    tags: ['start', 'docs', 'knowledge'],
    sections: [
      {
        heading: 'Что хранится в базе',
        paragraphs: [
          'База знаний собирает инструкции, проектные решения, регламенты и ответы на частые вопросы в одном интерфейсе.',
          'Каждая статья имеет владельца, дату обновления и список ролей, которые могут вносить изменения.',
        ],
      },
      {
        heading: 'Как читать материалы',
        paragraphs: [
          'Левая навигация отвечает за структуру, центральная область открывает статью, а правое оглавление помогает быстро перейти к нужному разделу.',
        ],
        bullets: [
          'Используйте поиск для быстрого перехода к статье.',
          'Смотрите владельца страницы перед тем, как предлагать правку.',
          'Ориентируйтесь на статус доступа в правой панели.',
        ],
      },
      {
        heading: 'Когда обновлять статью',
        paragraphs: [
          'Статья обновляется после изменения процесса, роли, инструмента или договорённости, на которую она ссылается.',
        ],
      },
    ],
  },
  {
    id: 'editor-access',
    group: 'Доступы',
    title: 'Кто может редактировать',
    description:
      'Список ролей и людей, которым разрешено менять контент базы знаний.',
    owner: 'Контент-админ',
    updated: '08.05.2026',
    access: ['admin'],
    tags: ['access', 'roles', 'editors'],
    sections: [
      {
        heading: 'Модель доступа',
        paragraphs: [
          'Читатель открывает страницы и пользуется поиском. Редактор создаёт черновики и обновляет закреплённые разделы. Администратор управляет публикацией и ролями.',
        ],
      },
      {
        heading: 'Кто отвечает за изменения',
        paragraphs: [
          'У каждой страницы есть владелец. Если правка затрагивает процесс другой команды, владелец страницы согласует обновление перед публикацией.',
        ],
        bullets: [
          'Редактор отвечает за точность материала.',
          'Администратор отвечает за права и публикацию.',
          'Читатель может предложить изменение через обратную связь.',
        ],
      },
      {
        heading: 'Проверка перед публикацией',
        paragraphs: [
          'Перед публикацией редактор проверяет актуальность ссылок, владельца процесса и формулировки, которые влияют на работу команды.',
        ],
      },
    ],
  },
  {
    id: 'search',
    group: 'Поиск',
    title: 'Поиск и быстрые ответы',
    description:
      'Как искать статьи и получать короткие ответы по материалам базы.',
    owner: 'Демо редактор',
    updated: '08.05.2026',
    access: ['editor', 'admin'],
    tags: ['search', 'rag', 'assistant'],
    sections: [
      {
        heading: 'Командный поиск',
        paragraphs: [
          'Поиск открывается поверх интерфейса и показывает статьи по заголовку, описанию, тегам и разделу.',
        ],
      },
      {
        heading: 'Ответы поверх базы',
        paragraphs: [
          'Ответ собирается по найденным страницам и показывает, на какие материалы он опирается.',
        ],
      },
      {
        heading: 'Что индексировать',
        paragraphs: [
          'В индекс попадают опубликованные статьи, владельцы, теги, даты обновления и ограничения по ролям.',
        ],
      },
    ],
  },
  {
    id: 'publishing',
    group: 'Материалы',
    title: 'Публикация статьи',
    description:
      'Минимальный процесс подготовки материала от черновика до опубликованной страницы.',
    owner: 'Контент-админ',
    updated: '08.05.2026',
    access: ['editor', 'admin'],
    tags: ['publish', 'workflow', 'draft'],
    sections: [
      {
        heading: 'Черновик',
        paragraphs: [
          'Редактор создаёт черновик, добавляет владельца, краткое описание и теги для поиска.',
        ],
      },
      {
        heading: 'Ревью',
        paragraphs: [
          'Администратор или владелец процесса проверяет текст, структуру и область доступа.',
        ],
      },
      {
        heading: 'Публикация',
        paragraphs: [
          'После публикации статья становится доступна читателям, а дата обновления отображается в шапке документа.',
        ],
      },
    ],
  },
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

type TopbarProps = {
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenDocs: () => void
  onOpenLanding: () => void
  onSignOut: () => void
}

function Topbar({
  currentUser,
  onOpenAuth,
  onOpenDocs,
  onOpenLanding,
  onSignOut,
}: TopbarProps) {
  const handleNavItemClick = (item: NavItem) => {
    if (item.opensDocs) {
      onOpenDocs()
      return
    }

    onOpenLanding()

    const sectionId = item.sectionId

    if (sectionId && sectionId !== 'home') {
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 80)
    }
  }

  return (
    <header className="topbar" aria-label="Главная навигация">
      <button className="brand" onClick={onOpenLanding} type="button">
        <span className="brand-mark">R</span>
        <span>RAG Base</span>
      </button>

      <nav className="desktop-nav" aria-label="Разделы продукта">
        {navItems.map((item) => (
          <button key={item.label} onClick={() => handleNavItemClick(item)} type="button">
            {item.label}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        {currentUser ? (
          <>
            <button className="primary-button compact" onClick={onOpenDocs} type="button">
              <BookOpen aria-hidden="true" size={16} />
              <span>База</span>
            </button>
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
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenDocs: () => void
}

function LandingPage({ currentUser, onOpenAuth, onOpenDocs }: LandingPageProps) {
  return (
    <main className="landing-page">
      <section className="hero-section" id="home">
        <div className="hero-shell">
          <div className="hero-copy">
            <a className="release-pill" href="#capabilities">
              База знаний для команды
            </a>
            <h1>RAG Base</h1>
            <p className="hero-lead">
              Сервис помогает собрать инструкции и регламенты в одном месте.
              Сотрудники быстро находят нужную статью, редакторы обновляют
              материалы, а администраторы управляют доступами.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button large"
                onClick={currentUser ? onOpenDocs : () => onOpenAuth('signup')}
                type="button"
              >
                <span>{currentUser ? 'Открыть базу' : 'Открыть демо'}</span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <a className="secondary-button large" href="#capabilities">
                <span>Что внутри</span>
              </a>
            </div>

            <div className="trust-row" aria-label="Ключевые возможности">
              <span>Инструкции и регламенты</span>
              <span>Поиск по материалам</span>
              <span>Роли для чтения и правок</span>
            </div>
          </div>

          <div className="product-preview hero-preview" aria-label="Превью базы знаний">
            <div className="preview-toolbar">
              <div className="window-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="preview-search">
                <Search aria-hidden="true" size={15} />
                <span>Найти статью, владельца или роль...</span>
                <kbd>⌘K</kbd>
              </div>
              <div className="preview-status">
                <span aria-hidden="true"></span>
                Демо
              </div>
            </div>

            <div className="docs-preview-grid">
              <aside className="preview-sidebar">
                <span className="sidebar-label">Разделы</span>
                {docSections.map((section, index) => (
                  <button
                    className={index === 1 ? 'active nav-row' : 'nav-row'}
                    key={section}
                    type="button"
                  >
                    <FileText aria-hidden="true" size={15} />
                    <span>{section}</span>
                  </button>
                ))}
              </aside>

              <article className="preview-article">
                <div className="doc-chip-row">
                  <span>Опубликовано</span>
                  <span>Владелец: контент</span>
                </div>
                <span className="eyebrow">Регламент</span>
                <h2>Релиз продукта</h2>
                <p>
                  На странице есть чеклист, ответственный за процесс и короткий
                  ответ для тех, кто открывает документ перед релизом.
                </p>
                <div className="answer-panel">
                  <div>
                    <strong>Ответ из базы</strong>
                    <span>Релиз утверждает администратор раздела после ревью владельца.</span>
                  </div>
                </div>
                <div className="article-lines" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>

              <aside className="preview-inspector">
                <span className="sidebar-label">Доступ</span>
                <div className="inspector-row success">
                  <span>Редактор может обновлять</span>
                </div>
                <div className="inspector-row">
                  <span>3 связанные статьи</span>
                </div>
                <div className="inspector-row">
                  <span>Обновлено сегодня</span>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="logo-band" aria-label="Команды, для которых подходит продукт">
        <span>Подходит для команд</span>
        <div>
          {productTeams.map((team) => (
            <strong key={team}>{team}</strong>
          ))}
        </div>
      </section>

      <section className="metrics-band" aria-label="Состояние продукта">
        {productStats.map((stat) => (
          <div key={stat.value}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="feature-section" id="capabilities">
        <div className="section-heading section-heading-wide">
          <span className="eyebrow">Что делает продукт</span>
          <h2>Помогает хранить знания команды и быстро находить нужное</h2>
          <p>
            Это небольшая база знаний с ролями. В ней удобно собрать рабочие
            материалы, открыть доступ команде и не искать важные инструкции в
            переписках.
          </p>
        </div>

        <div className="bento-grid">
          <article className="bento-card bento-card-large">
            <h3>Документы остаются понятными</h3>
            <p>
              На странице видно, о чём материал, кто за него отвечает и когда
              его обновляли. Так проще понять, можно ли доверять инструкции.
            </p>
            <div className="knowledge-stack" aria-label="Слои базы знаний">
              <span>Статьи</span>
              <span>Владельцы</span>
              <span>Публикация</span>
            </div>
          </article>

          {featureCards.map((feature) => (
            <article className="bento-card feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="access-section" id="access">
        <div className="section-heading">
          <span className="eyebrow">Доступы</span>
          <h2>Каждый видит только то, что ему можно делать</h2>
          <p>
            Роль выбирается при входе. Она влияет на то, можно ли редактировать
            статью, публиковать материалы и менять права других пользователей.
          </p>
        </div>

        <div className="access-grid">
          {accessModes.map((mode) => (
            <article className="access-mode" key={mode.title}>
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="start">
        <div className="workflow-panel">
          <div className="workflow-copy">
            <span className="eyebrow">Демо</span>
            <h2>После входа пользователь сразу попадает в рабочую базу</h2>
            <p>
              Можно выбрать роль, открыть статью, найти материал через поиск и
              посмотреть, какие действия доступны.
            </p>
          </div>
          <div className="workflow-steps" aria-label="Путь пользователя">
            <span>Войти</span>
            <span>Найти статью</span>
            <span>Проверить доступ</span>
          </div>
          <button className="primary-button" onClick={() => onOpenAuth('signin')} type="button">
            <span>Открыть демо</span>
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

          <span className="eyebrow">Вход</span>
          <h1 id="auth-title">
            {isSignup ? 'Создайте рабочий доступ' : 'Войдите в базу знаний'}
          </h1>
          <p>
            Защищённый вход открывает персональную роль и сразу включает нужный
            набор действий в базе знаний.
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

type DocsScreenProps = {
  currentUser: CurrentUser
}

function DocsScreen({ currentUser }: DocsScreenProps) {
  const [selectedArticleId, setSelectedArticleId] = useState(knowledgeArticles[0].id)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedArticle =
    knowledgeArticles.find((article) => article.id === selectedArticleId) ??
    knowledgeArticles[0]

  const groupedArticles = useMemo(
    () =>
      knowledgeArticles.reduce<Record<string, KnowledgeArticle[]>>((groups, article) => {
        const groupArticles = groups[article.group] ?? []
        return {
          ...groups,
          [article.group]: [...groupArticles, article],
        }
      }, {}),
    [],
  )

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return knowledgeArticles
    }

    return knowledgeArticles.filter((article) =>
      [
        article.title,
        article.description,
        article.group,
        article.owner,
        article.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [searchQuery])

  const canEdit = selectedArticle.access.includes(currentUser.role)
  const canManageAccess = currentUser.role === 'admin'

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }

      if (event.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleShortcut)

    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <main className="docs-app">
      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Навигация базы знаний">
          <button className="docs-search-button" onClick={() => setSearchOpen(true)} type="button">
            <Search aria-hidden="true" size={16} />
            <span>Поиск или вопрос...</span>
            <kbd>⌘K</kbd>
          </button>

          <nav className="docs-nav">
            {Object.entries(groupedArticles).map(([group, articles]) => (
              <div className="docs-nav-group" key={group}>
                <span>{group}</span>
                {articles.map((article) => (
                  <button
                    className={article.id === selectedArticle.id ? 'active' : ''}
                    key={article.id}
                    onClick={() => setSelectedArticleId(article.id)}
                    type="button"
                  >
                    <FileText aria-hidden="true" size={15} />
                    <span>{article.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <article className="docs-content">
          <div className="doc-breadcrumb">
            <BookOpen aria-hidden="true" size={15} />
            <span>{selectedArticle.group}</span>
          </div>

          <header className="doc-header">
            <span className="eyebrow">База знаний</span>
            <h1>{selectedArticle.title}</h1>
            <p>{selectedArticle.description}</p>

            <div className="doc-meta">
              <span>Владелец: {selectedArticle.owner}</span>
              <span>Обновлено: {selectedArticle.updated}</span>
              <span>Доступ: {selectedArticle.access.map((role) => roleLabels[role]).join(', ')}</span>
            </div>
          </header>

          {selectedArticle.sections.map((section, index) => (
            <section className="doc-section" id={`section-${index}`} key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {selectedArticle.id === 'editor-access' && (
            <section className="people-section" aria-label="Пользователи с доступом">
              <h2>Участники с доступом</h2>
              <div className="people-grid">
                {editorAccess.map((person) => (
                  <article className="person-card" key={person.name}>
                    <div>
                      <strong>{person.name}</strong>
                      <span>{roleLabels[person.role]}</span>
                    </div>
                    <p>{person.scope}</p>
                    <small>{person.status}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="docs-aside" aria-label="Оглавление и права">
          <div className="toc-card">
            <span className="sidebar-label">На странице</span>
            {selectedArticle.sections.map((section, index) => (
              <a href={`#section-${index}`} key={section.heading}>
                {section.heading}
              </a>
            ))}
          </div>

          <div className={canEdit ? 'access-card editable' : 'access-card readonly'}>
            <span className="sidebar-label">Права на правку</span>
            <h3>{canEdit ? 'Можно редактировать' : 'Только чтение'}</h3>
            <p>
              Ваша роль: {roleLabels[currentUser.role]}. Владелец страницы:
              {' '}
              {selectedArticle.owner}.
            </p>
            <button disabled={!canEdit} type="button">
              <Edit3 aria-hidden="true" size={16} />
              <span>{canEdit ? 'Редактировать' : 'Нет доступа'}</span>
            </button>
            {canManageAccess && <small>Администратор может менять роли раздела.</small>}
          </div>
        </aside>
      </div>

      {searchOpen && (
        <SearchDialog
          query={searchQuery}
          results={searchResults}
          selectedArticleId={selectedArticle.id}
          onClose={() => setSearchOpen(false)}
          onQueryChange={setSearchQuery}
          onSelect={(articleId) => {
            setSelectedArticleId(articleId)
            setSearchOpen(false)
            setSearchQuery('')
          }}
        />
      )}
    </main>
  )
}

type SearchDialogProps = {
  query: string
  results: KnowledgeArticle[]
  selectedArticleId: string
  onClose: () => void
  onQueryChange: (query: string) => void
  onSelect: (articleId: string) => void
}

function SearchDialog({
  query,
  results,
  selectedArticleId,
  onClose,
  onQueryChange,
  onSelect,
}: SearchDialogProps) {
  return (
    <div className="search-overlay" role="presentation">
      <div aria-modal="true" className="search-dialog" role="dialog">
        <div className="search-input-row">
          <Search aria-hidden="true" size={18} />
          <input
            autoFocus
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Найти статью, владельца или роль"
            type="search"
            value={query}
          />
          <button onClick={onClose} type="button">
            Esc
          </button>
        </div>

        <div className="search-results">
          {results.length > 0 ? (
            results.map((article) => (
              <button
                className={article.id === selectedArticleId ? 'active' : ''}
                key={article.id}
                onClick={() => onSelect(article.id)}
                type="button"
              >
                <span>
                  <strong>{article.title}</strong>
                  <small>{article.group}</small>
                </span>
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            ))
          ) : (
            <div className="empty-search">
              <strong>Ничего не найдено</strong>
              <span>Попробуйте запрос вроде “доступ”, “поиск” или “публикация”.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
