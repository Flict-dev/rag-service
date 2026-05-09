import { ArrowRight, Lightbulb, Search, Sparkles } from 'lucide-react'
import type { AskResponse } from '../api/ask'
import type { ArticleSearchResult, HighlightSegment } from '../lib/search'

type SearchDialogProps = {
  answer: AskResponse | null
  answerError?: string | null
  answerLoading?: boolean
  query: string
  results: ArticleSearchResult[]
  selectedArticleId: string
  onAsk: () => void
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

function getSourceKey(source: AskResponse['sources'][number]) {
  return 'articleId' in source
    ? `${source.articleId}-${source.sectionHeading}`
    : `${source.documentId}-${source.sectionHeading}`
}

function SearchDialog({
  answer,
  answerError,
  answerLoading = false,
  query,
  results,
  selectedArticleId,
  onAsk,
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
          <button disabled={queryIsEmpty || answerLoading} onClick={onAsk} type="button">
            <Sparkles aria-hidden="true" size={14} />
            <span>{answerLoading ? '...' : 'Ответ'}</span>
          </button>
          <button onClick={onClose} type="button">
            Esc
          </button>
        </div>

        <div className="search-results">
          {!queryIsEmpty && (answer || answerError || answerLoading) && (
            <section className={answerError ? 'search-answer error' : 'search-answer'}>
              <span className="sidebar-label">Ответ из базы</span>
              <p>
                {answerLoading
                  ? 'Собираем ответ по найденным статьям...'
                  : answerError ?? answer?.answer}
              </p>
              {answer && answer.sources.length > 0 && (
                <div>
                  {answer.sources.map((source) => (
                    <button
                      disabled={!('articleId' in source)}
                      key={getSourceKey(source)}
                      onClick={() => {
                        if ('articleId' in source) {
                          onSelect(source.articleId)
                        }
                      }}
                      type="button"
                    >
                      <strong>{source.title}</strong>
                      <small>{source.sectionHeading}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

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
