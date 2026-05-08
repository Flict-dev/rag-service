import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Command,
  FileText,
  LockKeyhole,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import './App.css'

const navItems = ['Продукт', 'База знаний', 'Доступы', 'Поиск']

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

function App() {
  return (
    <div className="app-shell">
      <header className="topbar" aria-label="Главная навигация">
        <a className="brand" href="#home" aria-label="RAG Base">
          <span className="brand-mark">R</span>
          <span>RAG Base</span>
        </a>

        <nav className="desktop-nav" aria-label="Разделы продукта">
          {navItems.map((item) => (
            <a key={item} href="#product">
              {item}
            </a>
          ))}
        </nav>

        <div className="topbar-actions">
          <a className="ghost-link" href="#signin">
            Войти
          </a>
          <a className="primary-button" href="#start">
            <span>Начать</span>
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
      </header>

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
              <a className="primary-button large" href="#start">
                <span>Открыть демо</span>
                <ArrowRight aria-hidden="true" size={18} />
              </a>
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
            <a className="primary-button" href="#signin">
              <span>Перейти к входу</span>
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
