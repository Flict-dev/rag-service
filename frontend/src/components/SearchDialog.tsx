import { ArrowRight, Lightbulb, Search } from 'lucide-react'
import type { ArticleSearchResult, HighlightSegment } from '../lib/search'

type SearchDialogProps = {
  query: string
  results: ArticleSearchResult[]
  selectedArticleId: string
  onClose: () => void
  onQueryChange: (query: string) => void
  onSelect: (articleId: string) => void
}

const quickSearchTips = ['поиск', 'публикация', 'доступ', 'владелец']

type HighlightedTextProps = {
  segments: HighlightSegment[]
}

function HighlightedText({ segments }: HighlightedTextProps) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={`${segment.text}-${index}`}>{segment.text}</mark>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </>
  )
}

function SearchDialog({
  query,
  results,
  selectedArticleId,
  onClose,
  onQueryChange,
  onSelect,
}: SearchDialogProps) {
  const queryIsEmpty = query.trim().length === 0

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
          {queryIsEmpty ? (
            <div className="search-tips">
              <Lightbulb aria-hidden="true" size={18} />
              <strong>Начните с быстрого запроса</strong>
              <div>
                {quickSearchTips.map((tip) => (
                  <button key={tip} onClick={() => onQueryChange(tip)} type="button">
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                className={
                  result.article.id === selectedArticleId
                    ? 'search-result-button active'
                    : 'search-result-button'
                }
                key={result.article.id}
                onClick={() => onSelect(result.article.id)}
                type="button"
              >
                <span>
                  <strong>
                    <HighlightedText segments={result.title} />
                  </strong>
                  <small>
                    {result.article.group} · {result.matchLabel}
                  </small>
                  <span className="search-snippet">
                    <HighlightedText segments={result.snippet} />
                  </span>
                </span>
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            ))
          ) : (
            <div className="empty-search">
              <strong>Ничего не найдено</strong>
              <span>Проверьте формулировку или роль доступа к материалам.</span>
              <div>
                {quickSearchTips.map((tip) => (
                  <button key={tip} onClick={() => onQueryChange(tip)} type="button">
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchDialog
