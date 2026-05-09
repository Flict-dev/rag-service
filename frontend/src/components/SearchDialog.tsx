import { ArrowRight, Search } from 'lucide-react'
import type { KnowledgeArticle } from '../types'

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

export default SearchDialog
