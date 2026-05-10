import { ArrowRight, FileText, MessageSquareText, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { docSections, featureCards, productStats, productTeams } from '../data/demoData'
import type { AuthMode, CurrentUser } from '../types'

type LandingPageProps = {
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenBases: () => void
}

function LandingPage({ currentUser, onOpenAuth, onOpenBases }: LandingPageProps) {
  return (
    <main className="landing-page">
      <section className="hero-section" id="home">
        <div className="hero-shell">
          <div className="hero-copy">
            <span className="ui-kicker">Markdown-база знаний</span>
            <h1>RAG Base</h1>
            <p className="hero-lead">
              Внутренний интерфейс для простых баз знаний: список баз, структура
              разделов, markdown-файлы и чат-поиск рядом с документами.
            </p>

            <div className="hero-actions">
              <Button
                onClick={currentUser ? onOpenBases : () => onOpenAuth('signup')}
                size="lg"
                type="button"
              >
                {currentUser ? 'Открыть базы' : 'Начать'}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#workspace">Посмотреть интерфейс</a>
              </Button>
            </div>

            <div className="trust-row" aria-label="Ключевые возможности">
              <span>Базы знаний</span>
              <span>Markdown-файлы</span>
              <span>Локальный чат-поиск</span>
            </div>
          </div>

          <div className="product-preview hero-preview" aria-label="Превью базы знаний">
            <div className="preview-toolbar">
              <div className="window-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-search">
                <Search aria-hidden="true" />
                <span>Найти в markdown...</span>
              </div>
              <span className="preview-status">Preview</span>
            </div>

            <div className="docs-preview-grid">
              <aside className="preview-sidebar">
                <div className="sidebar-mini-title">
                  <span>Структура</span>
                  <Plus aria-hidden="true" />
                </div>
                {docSections.map((section, index) => (
                  <div className={index === 1 ? 'active nav-row' : 'nav-row'} key={section}>
                    <FileText aria-hidden="true" />
                    <span>{section}</span>
                  </div>
                ))}
              </aside>

              <article className="preview-article">
                <span className="ui-kicker">process.md</span>
                <h2># Чеклист релиза</h2>
                <p>
                  Перед релизом проверьте описание изменений, владельца, обратимость
                  и ссылки на связанные документы.
                </p>
                <pre>
                  <code>release ready = tests + owner + rollback</code>
                </pre>
              </article>

              <aside className="preview-inspector">
                <MessageSquareText aria-hidden="true" />
                <strong>AI чат</strong>
                <span>Нашел 2 источника в текущей базе.</span>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="logo-band" aria-label="Команды">
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

      <section className="feature-section" id="workspace">
        <div className="section-heading">
          <span className="ui-kicker">Работа с базой</span>
          <h2>Сначала список баз, потом один рабочий экран</h2>
          <p>
            Пользователь создает базу одним названием, открывает ее и работает
            с тремя колонками: структура, markdown и чат.
          </p>
        </div>

        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="feature-panel" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="markdown-section" id="markdown">
        <div className="markdown-story">
          <span className="ui-kicker">Markdown</span>
          <h2>Файл остается обычным текстом</h2>
          <p>
            В этом этапе markdown хранится локально в UI-модели. Позже тот же
            контракт можно подключить к backend, индексатору и RAG-поиску.
          </p>
        </div>
        <Separator />
        <div className="markdown-sample" aria-label="Пример markdown">
          <span># answer.md</span>
          <p>- короткая структура</p>
          <p>- понятный preview</p>
          <p>- источники в чате</p>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
