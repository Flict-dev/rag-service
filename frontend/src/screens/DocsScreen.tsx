import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Edit3, FileText, Search } from 'lucide-react'
import SearchDialog from '../components/SearchDialog'
import { editorAccess, knowledgeArticles, roleLabels } from '../data/demoData'
import { groupArticlesByGroup, searchArticles } from '../lib/articles'
import type { CurrentUser } from '../types'

type DocsScreenProps = {
  currentUser: CurrentUser
}

function DocsScreen({ currentUser }: DocsScreenProps) {
  const [selectedArticleId, setSelectedArticleId] = useState(knowledgeArticles[0].id)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedArticle =
    knowledgeArticles.find((article) => article.id === selectedArticleId) ?? knowledgeArticles[0]

  const groupedArticles = useMemo(() => groupArticlesByGroup(knowledgeArticles), [])
  const searchResults = useMemo(
    () => searchArticles(knowledgeArticles, searchQuery),
    [searchQuery],
  )

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
              Ваша роль: {roleLabels[currentUser.role]}. Владелец страницы: {selectedArticle.owner}.
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

export default DocsScreen
