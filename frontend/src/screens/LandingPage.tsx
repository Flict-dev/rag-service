import { ArrowRight, FileText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  accessModes,
  docSections,
  featureCards,
  productStats,
  productTeams,
} from '../data/demoData'
import type { AuthMode, CurrentUser } from '../types'

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
          <Link className="primary-button" to="/login">
            <span>Открыть демо</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
