import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Edit3, FileText, Plus, RefreshCcw, Search, Upload } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { askApi, type AskResponse } from '../api/ask'
import { fetchApiDocuments, uploadApiDocument } from '../api/documents'
import ArticleEditorForm from '../components/ArticleEditorForm'
import SearchDialog from '../components/SearchDialog'
import { articleStatusLabels, editorAccess, roleLabels } from '../data/demoData'
import { formatArticleDate, groupArticlesByGroup } from '../lib/articles'
import { searchArticles } from '../lib/search'
import type { ArticleStatus, CurrentUser, IngestionJob, KnowledgeArticle, KnowledgeDocument } from '../types'

type EditorMode = 'view' | 'edit' | 'create'
type EditorState =
  | {
      mode: 'view'
    }
  | {
      mode: 'create'
    }
  | {
      articleId: string
      mode: 'edit'
    }

type DocsScreenProps = {
  articles: KnowledgeArticle[]
  articlesError?: string | null
  articlesLoading?: boolean
  authToken: string | null
  currentUser: CurrentUser
  onDeleteArticle: (articleId: string) => Promise<void> | void
  onResetArticles: () => KnowledgeArticle[]
  onSaveArticle: (article: KnowledgeArticle) => Promise<KnowledgeArticle> | KnowledgeArticle
}

const documentStatusLabels: Record<KnowledgeDocument['status'], string> = {
  queued: 'В очереди',
  processing: 'Индексируется',
  indexed: 'Проиндексирован',
  failed: 'Ошибка',
}

const ingestionJobStatusLabels: Record<IngestionJob['status'], string> = {
  queued: 'В очереди',
  processing: 'В работе',
  completed: 'Готово',
  failed: 'Ошибка',
}

function slugifyArticleTitle(title: string) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedTitle || 'article'
}

function createUniqueArticleId(title: string, articles: KnowledgeArticle[]) {
  const baseId = slugifyArticleTitle(title)
  const existingIds = new Set(articles.map((article) => article.id))
  let candidateId = baseId
  let counter = 2

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${counter}`
    counter += 1
  }

  return candidateId
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function canCreateArticles(currentUser: CurrentUser) {
  return currentUser.role === 'editor' || currentUser.role === 'admin'
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} Б`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} КБ`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
}

function DocsScreen({
  articles,
  articlesError,
  articlesLoading = false,
  authToken,
  currentUser,
  onDeleteArticle,
  onResetArticles,
  onSaveArticle,
}: DocsScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [askAnswer, setAskAnswer] = useState<AskResponse | null>(null)
  const [askError, setAskError] = useState<string | null>(null)
  const [askLoading, setAskLoading] = useState(false)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentUploading, setDocumentUploading] = useState(false)
  const [lastIngestionJob, setLastIngestionJob] = useState<IngestionJob | null>(null)
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null)
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'view' })
  const documentFileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { articleId } = useParams<{ articleId: string }>()
  const fallbackArticle = articles[0] ?? null

  const selectedArticle = articles.find((article) => article.id === articleId) ?? fallbackArticle

  const groupedArticles = useMemo(() => groupArticlesByGroup(articles), [articles])
  const articleGroups = useMemo(
    () => [...new Set(articles.map((article) => article.group))],
    [articles],
  )
  const searchResults = useMemo(
    () => searchArticles(articles, searchQuery, currentUser.role),
    [articles, currentUser.role, searchQuery],
  )

  const canCreate = canCreateArticles(currentUser)
  const canManageDocuments = canCreate
  const canEdit =
    selectedArticle && canCreate
      ? currentUser.role === 'admin' ||
        selectedArticle.ownerId === currentUser.id ||
        selectedArticle.access.includes(currentUser.role)
      : false
  const canManageAccess = currentUser.role === 'admin'
  const editorMode: EditorMode =
    editorState.mode === 'edit'
      ? editorState.articleId === selectedArticle?.id
        ? 'edit'
        : 'view'
      : editorState.mode

  useEffect(() => {
    const articleExists = articleId
      ? articles.some((article) => article.id === articleId)
      : false

    if (fallbackArticle && !articleExists) {
      navigate(`/docs/${fallbackArticle.id}`, { replace: true })
    }
  }, [articleId, articles, fallbackArticle, navigate])

  useEffect(() => {
    if (!canManageDocuments || !authToken) {
      return
    }

    let ignoreResult = false

    Promise.resolve()
      .then(async () => {
        if (ignoreResult) {
          return
        }

        setDocumentsLoading(true)
        setDocumentsError(null)

        try {
          const apiDocuments = await fetchApiDocuments(authToken)

          if (ignoreResult) {
            return
          }

          setDocuments(apiDocuments)
          setDocumentsError(null)
        } catch {
          if (ignoreResult) {
            return
          }

          setDocuments([])
          setDocumentsError('Не удалось загрузить список документов из backend.')
        }

        if (!ignoreResult) {
          setDocumentsLoading(false)
        }
      })

    return () => {
      ignoreResult = true
    }
  }, [authToken, canManageDocuments])

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

    setEditorState({ mode: 'view' })

    if (nextArticleId) {
      navigate(`/docs/${nextArticleId}`, { replace: true })
    }
  }

  const refreshDocuments = async () => {
    if (!authToken || !canManageDocuments) {
      return
    }

    setDocumentsLoading(true)
    setDocumentsError(null)

    try {
      const apiDocuments = await fetchApiDocuments(authToken)
      setDocuments(apiDocuments)
      setDocumentsError(null)
    } catch {
      setDocumentsError('Не удалось обновить список документов.')
    } finally {
      setDocumentsLoading(false)
    }
  }

  const selectDocumentFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedDocumentFile(event.target.files?.[0] ?? null)
    setLastIngestionJob(null)
  }

  const uploadDocument = async () => {
    if (!authToken || !canManageDocuments || !selectedDocumentFile) {
      return
    }

    setDocumentUploading(true)
    setDocumentsError(null)
    setLastIngestionJob(null)

    try {
      const result = await uploadApiDocument(authToken, selectedDocumentFile)
      setDocuments((currentDocuments) => [
        result.document,
        ...currentDocuments.filter((document) => document.id !== result.document.id),
      ])
      setLastIngestionJob(result.job)
      setSelectedDocumentFile(null)

      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = ''
      }

      await refreshDocuments()
    } catch {
      setDocumentsError('Не удалось загрузить документ в backend.')
    } finally {
      setDocumentUploading(false)
    }
  }

  const updateSearchQuery = (nextQuery: string) => {
    setSearchQuery(nextQuery)
    setAskAnswer(null)
    setAskError(null)
  }

  const askQuestion = async () => {
    const question = searchQuery.trim()

    if (!question) {
      return
    }

    setAskLoading(true)
    setAskAnswer(null)
    setAskError(null)

    try {
      const answer = await askApi(authToken ?? currentUser.id, question)
      setAskAnswer(answer)
    } catch {
      setAskError('Не удалось получить ответ из backend.')
    } finally {
      setAskLoading(false)
    }
  }

  const startArticleCreate = () => {
    if (!canCreate) {
      return
    }

    setEditorState({ mode: 'create' })
  }

  const startArticleEdit = () => {
    if (!canEdit || !selectedArticle) {
      return
    }

    setEditorState({ articleId: selectedArticle.id, mode: 'edit' })
  }

  const closeEditor = () => {
    setEditorState({ mode: 'view' })
  }

  const submitArticle = async (article: KnowledgeArticle, status: ArticleStatus) => {
    const now = todayIsoDate()
    const isNewArticle = !article.id
    const nextArticle: KnowledgeArticle = {
      ...article,
      id: isNewArticle ? createUniqueArticleId(article.title, articles) : article.id,
      createdAt: article.createdAt || now,
      updatedAt: now,
      status,
    }

    const savedArticle = await onSaveArticle(nextArticle)
    setEditorState({ mode: 'view' })
    navigate(`/docs/${savedArticle.id}`, { replace: !isNewArticle })
  }

  const deleteArticle = async (articleIdToDelete: string) => {
    const articleToDelete = articles.find((article) => article.id === articleIdToDelete)
    const deletionConfirmed = window.confirm(
      `Удалить статью “${articleToDelete?.title ?? 'без названия'}”? Это действие нельзя отменить.`,
    )

    if (!deletionConfirmed) {
      return
    }

    const nextArticle = articles.find((article) => article.id !== articleIdToDelete)

    await onDeleteArticle(articleIdToDelete)
    setEditorState({ mode: 'view' })

    if (nextArticle) {
      navigate(`/docs/${nextArticle.id}`, { replace: true })
      return
    }

    navigate('/docs', { replace: true })
  }

  if (!selectedArticle && editorMode !== 'create') {
    return (
      <main className="docs-app">
        <div className="empty-docs-state">
          <strong>В базе пока нет статей</strong>
          {canCreate && (
            <button className="primary-button" onClick={startArticleCreate} type="button">
              <Plus aria-hidden="true" size={16} />
              <span>Создать статью</span>
            </button>
          )}
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
      {(articlesLoading || articlesError) && (
        <div className={articlesError ? 'docs-state-banner error' : 'docs-state-banner'}>
          {articlesError ?? 'Загружаем статьи из backend...'}
        </div>
      )}

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Навигация базы знаний">
          <button className="docs-search-button" onClick={() => setSearchOpen(true)} type="button">
            <Search aria-hidden="true" size={16} />
            <span>Поиск или вопрос...</span>
            <kbd>⌘K</kbd>
          </button>

          {canCreate && (
            <button className="docs-create-button" onClick={startArticleCreate} type="button">
              <Plus aria-hidden="true" size={16} />
              <span>Новая статья</span>
            </button>
          )}

          <nav className="docs-nav">
            {Object.entries(groupedArticles).map(([group, articles]) => (
              <div className="docs-nav-group" key={group}>
                <span>{group}</span>
                {articles.map((article) => (
                  <button
                    className={article.id === selectedArticle?.id ? 'active' : ''}
                    key={article.id}
                    onClick={() => {
                      setEditorState({ mode: 'view' })
                      navigate(`/docs/${article.id}`)
                    }}
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
          {editorMode === 'create' ? (
            <ArticleEditorForm
              key="create-article"
              article={null}
              canManageAccess={canManageAccess}
              currentUser={currentUser}
              existingGroups={articleGroups}
              mode="create"
              onCancel={closeEditor}
              onSubmit={submitArticle}
            />
          ) : selectedArticle && editorMode === 'edit' ? (
            <ArticleEditorForm
              key={`edit-${selectedArticle.id}`}
              article={selectedArticle}
              canManageAccess={canManageAccess}
              currentUser={currentUser}
              existingGroups={articleGroups}
              mode="edit"
              onCancel={closeEditor}
              onDelete={deleteArticle}
              onSubmit={submitArticle}
            />
          ) : (
            selectedArticle && (
              <>
                <div className="doc-breadcrumb">
                  <BookOpen aria-hidden="true" size={15} />
                  <span>{selectedArticle.group}</span>
                </div>

                <header className="doc-header">
                  <div className="doc-header-title">
                    <div>
                      <span className="eyebrow">База знаний</span>
                      <h1>{selectedArticle.title}</h1>
                    </div>
                    {canEdit && (
                      <button className="secondary-button compact" onClick={startArticleEdit} type="button">
                        <Edit3 aria-hidden="true" size={16} />
                        <span>Редактировать</span>
                      </button>
                    )}
                  </div>
                  <p>{selectedArticle.description}</p>

                  <div className="doc-meta">
                    <span className={`status-pill status-${selectedArticle.status}`}>
                      {articleStatusLabels[selectedArticle.status]}
                    </span>
                    <span>Владелец: {selectedArticle.owner}</span>
                    <span>Создано: {formatArticleDate(selectedArticle.createdAt)}</span>
                    <span>Обновлено: {formatArticleDate(selectedArticle.updatedAt)}</span>
                    <span>
                      Доступ: {selectedArticle.access.map((role) => roleLabels[role]).join(', ')}
                    </span>
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
              </>
            )
          )}
        </article>

        <aside className="docs-aside" aria-label="Оглавление и права">
          {editorMode === 'create' ? (
            <div className="access-card editable">
              <span className="sidebar-label">Создание</span>
              <h3>Новый материал</h3>
              <p>После сохранения статья появится в навигации и останется в localStorage.</p>
            </div>
          ) : (
            selectedArticle && (
              <>
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
                    Ваша роль: {roleLabels[currentUser.role]}. Владелец страницы:{' '}
                    {selectedArticle.owner}.
                  </p>
                  <button disabled={!canEdit} onClick={startArticleEdit} type="button">
                    <Edit3 aria-hidden="true" size={16} />
                    <span>{canEdit ? 'Редактировать' : 'Нет доступа'}</span>
                  </button>
                  {canManageAccess && <small>Администратор может менять роли раздела.</small>}
                </div>
              </>
            )
          )}

          {canManageDocuments && (
            <div className="documents-card">
              <div className="documents-card-heading">
                <div>
                  <span className="sidebar-label">Документы RAG</span>
                  <h3>Загрузка и индекс</h3>
                </div>
                <button
                  aria-label="Обновить документы"
                  className="icon-button"
                  disabled={documentsLoading || documentUploading}
                  onClick={refreshDocuments}
                  type="button"
                >
                  <RefreshCcw aria-hidden="true" size={16} />
                </button>
              </div>

              <label className="document-file-field">
                <span>Файл</span>
                <input ref={documentFileInputRef} onChange={selectDocumentFile} type="file" />
              </label>

              <button
                className="primary-button compact"
                disabled={!selectedDocumentFile || documentUploading}
                onClick={uploadDocument}
                type="button"
              >
                <Upload aria-hidden="true" size={16} />
                <span>{documentUploading ? 'Загружаем...' : 'Загрузить'}</span>
              </button>

              {lastIngestionJob && (
                <p className="document-job-state" aria-live="polite">
                  Ingestion job: {ingestionJobStatusLabels[lastIngestionJob.status]}
                </p>
              )}

              {documentsError && (
                <p className="document-error" role="alert">
                  {documentsError}
                </p>
              )}

              <div className="documents-list" aria-live="polite">
                {documentsLoading && <p>Загружаем документы...</p>}
                {!documentsLoading && documents.length === 0 && <p>Документов пока нет.</p>}
                {!documentsLoading &&
                  documents.map((document) => (
                    <div className="document-row" key={document.id}>
                      <FileText aria-hidden="true" size={16} />
                      <div>
                        <strong>{document.filename}</strong>
                        <span>
                          {formatFileSize(document.sizeBytes)} · {formatArticleDate(document.uploadedAt)}
                        </span>
                      </div>
                      <span className={`document-status document-status-${document.status}`}>
                        {documentStatusLabels[document.status]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
          answer={askAnswer}
          answerError={askError}
          answerLoading={askLoading}
          query={searchQuery}
          results={searchResults}
          selectedArticleId={selectedArticle?.id ?? ''}
          onAsk={askQuestion}
          onClose={() => setSearchOpen(false)}
          onQueryChange={updateSearchQuery}
          onSelect={(nextArticleId) => {
            setEditorState({ mode: 'view' })
            navigate(`/docs/${nextArticleId}`)
            setSearchOpen(false)
            setSearchQuery('')
            setAskAnswer(null)
            setAskError(null)
          }}
        />
      )}
    </main>
  )
}

export default DocsScreen
