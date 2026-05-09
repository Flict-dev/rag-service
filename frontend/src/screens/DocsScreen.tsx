import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Edit3, FileText, RefreshCcw, Search } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import SearchDialog from '../components/SearchDialog'
import { articleStatusLabels, editorAccess, roleLabels } from '../data/demoData'
import { formatArticleDate, groupArticlesByGroup, searchArticles } from '../lib/articles'
import type { CurrentUser, KnowledgeArticle } from '../types'

type DocsScreenProps = {
  articles: KnowledgeArticle[]
  currentUser: CurrentUser
  onResetArticles: () => KnowledgeArticle[]
}

function DocsScreen({ articles, currentUser, onResetArticles }: DocsScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { articleId } = useParams<{ articleId: string }>()
  const fallbackArticle = articles[0] ?? null

  const selectedArticle = articles.find((article) => article.id === articleId) ?? fallbackArticle

  const groupedArticles = useMemo(() => groupArticlesByGroup(articles), [articles])
  const searchResults = useMemo(() => searchArticles(articles, searchQuery), [articles, searchQuery])

  const canEdit = selectedArticle?.access.includes(currentUser.role) ?? false
  const canManageAccess = currentUser.role === 'admin'

  useEffect(() => {
    const articleExists = articleId
      ? articles.some((article) => article.id === articleId)
      : false

    if (fallbackArticle && !articleExists) {
      navigate(`/docs/${fallbackArticle.id}`, { replace: true })
    }
  }, [articleId, articles, fallbackArticle, navigate])

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

  const handleResetArticles = () => {
    const seedArticles = onResetArticles()
    const nextArticleId = seedArticles[0]?.id

    if (nextArticleId) {
      navigate(`/docs/${nextArticleId}`, { replace: true })
    }
  }

  if (!selectedArticle) {
    return (
      <main className="docs-app">
        <div className="empty-docs-state">
          <strong>В базе пока нет статей</strong>
          <button className="primary-button" onClick={handleResetArticles} type="button">
            <RefreshCcw aria-hidden="true" size={16} />
            <span>Вернуть демо-данные</span>
          </button>
        </div>
      </main>
    )
  }

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
                    onClick={() => navigate(`/docs/${article.id}`)}
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
              <span className={`status-pill status-${selectedArticle.status}`}>
                {articleStatusLabels[selectedArticle.status]}
              </span>
              <span>Владелец: {selectedArticle.owner}</span>
              <span>Создано: {formatArticleDate(selectedArticle.createdAt)}</span>
              <span>Обновлено: {formatArticleDate(selectedArticle.updatedAt)}</span>
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
              Ваша роль: {roleLabels[currentUser.role]}. Владелец страницы: {selectedArticle.owner}.
            </p>
            <button disabled={!canEdit} type="button">
              <Edit3 aria-hidden="true" size={16} />
              <span>{canEdit ? 'Редактировать' : 'Нет доступа'}</span>
            </button>
            {canManageAccess && <small>Администратор может менять роли раздела.</small>}
          </div>

          <div className="reset-card">
            <span className="sidebar-label">Демо-данные</span>
            <p>Верните исходный набор статей, статусов и дат обновления.</p>
            <button onClick={handleResetArticles} type="button">
              <RefreshCcw aria-hidden="true" size={16} />
              <span>Сбросить статьи</span>
            </button>
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
            navigate(`/docs/${articleId}`)
            setSearchOpen(false)
            setSearchQuery('')
          }}
        />
      )}
    </main>
  )
}

export default DocsScreen
