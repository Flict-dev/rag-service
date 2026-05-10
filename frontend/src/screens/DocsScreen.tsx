import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Edit3, FilePlus, FileText, RefreshCcw, Search } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { askApi, type AskResponse } from '../api/ask'
import { AppSidebar, type DocsSidebarGroup } from '../components/app-sidebar'
import ArticleEditorForm from '../components/ArticleEditorForm'
import SearchDialog from '../components/SearchDialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { articleToMarkdown, getFallbackFolder } from '../lib/markdownArticle'
import { searchArticles } from '../lib/search'
import type { CurrentUser, KnowledgeArticle } from '../types'

type EditorState =
  | {
      mode: 'view'
    }
  | {
      group?: string
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

function createFolderList(articles: KnowledgeArticle[], customFolders: string[]) {
  const folders = [...customFolders, ...articles.map((article) => article.group)]
    .map((folder) => folder.trim())
    .filter(Boolean)

  return [...new Set(folders)]
}

function renderMarkdown(markdown: string) {
  const nodes: ReactNode[] = []
  const paragraphLines: string[] = []
  let listItems: string[] = []
  let codeLines: string[] = []
  let insideCodeBlock = false
  let blockIndex = 0

  const pushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    nodes.push(<p key={`paragraph-${blockIndex}`}>{paragraphLines.join(' ')}</p>)
    paragraphLines.length = 0
    blockIndex += 1
  }

  const pushList = () => {
    if (listItems.length === 0) {
      return
    }

    nodes.push(
      <ul key={`list-${blockIndex}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    )
    listItems = []
    blockIndex += 1
  }

  const pushCode = () => {
    nodes.push(
      <pre key={`code-${blockIndex}`}>
        <code>{codeLines.join('\n')}</code>
      </pre>,
    )
    codeLines = []
    blockIndex += 1
  }

  markdown.split('\n').forEach((line) => {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('```')) {
      pushParagraph()
      pushList()

      if (insideCodeBlock) {
        pushCode()
        insideCodeBlock = false
        return
      }

      insideCodeBlock = true
      return
    }

    if (insideCodeBlock) {
      codeLines.push(line)
      return
    }

    if (!trimmedLine) {
      pushParagraph()
      pushList()
      return
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmedLine)
    if (headingMatch) {
      pushParagraph()
      pushList()

      const [, marks, heading] = headingMatch
      const HeadingTag = `h${Math.min(marks.length, 4)}` as 'h1' | 'h2' | 'h3' | 'h4'
      nodes.push(<HeadingTag key={`heading-${blockIndex}`}>{heading}</HeadingTag>)
      blockIndex += 1
      return
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmedLine)
    if (listMatch) {
      pushParagraph()
      listItems.push(listMatch[1])
      return
    }

    const quoteMatch = /^>\s?(.+)$/.exec(trimmedLine)
    if (quoteMatch) {
      pushParagraph()
      pushList()
      nodes.push(<blockquote key={`quote-${blockIndex}`}>{quoteMatch[1]}</blockquote>)
      blockIndex += 1
      return
    }

    pushList()
    paragraphLines.push(trimmedLine)
  })

  pushParagraph()
  pushList()

  if (insideCodeBlock || codeLines.length > 0) {
    pushCode()
  }

  return nodes.length > 0 ? nodes : <p>Пустой markdown-файл.</p>
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
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'view' })
  const navigate = useNavigate()
  const { articleId } = useParams<{ articleId: string }>()
  const fallbackArticle = articles[0] ?? null

  const selectedArticle = articles.find((article) => article.id === articleId) ?? fallbackArticle
  const folders = useMemo(() => createFolderList(articles, customFolders), [articles, customFolders])
  const sidebarGroups = useMemo<DocsSidebarGroup[]>(
    () =>
      folders.map((folder) => ({
        title: folder,
        items: articles
          .filter((article) => article.group === folder)
          .map((article) => ({
            id: article.id,
            isActive: article.id === selectedArticle?.id && editorState.mode !== 'create',
            title: article.title,
          })),
      })),
    [articles, editorState.mode, folders, selectedArticle?.id],
  )
  const searchResults = useMemo(
    () => searchArticles(articles, searchQuery, currentUser.role),
    [articles, currentUser.role, searchQuery],
  )

  const canCreate = canCreateArticles(currentUser)
  const canEdit = Boolean(selectedArticle && canCreate)
  const editorMode =
    editorState.mode === 'edit'
      ? editorState.articleId === selectedArticle?.id
        ? 'edit'
        : 'view'
      : editorState.mode
  const activeFolder =
    editorState.mode === 'create'
      ? (editorState.group ?? folders[0] ?? getFallbackFolder())
      : (selectedArticle?.group ?? folders[0] ?? getFallbackFolder())
  const activePageTitle =
    editorMode === 'create' ? 'New Page' : selectedArticle?.title ?? 'Documentation'

  useEffect(() => {
    const articleExists = articleId
      ? articles.some((article) => article.id === articleId)
      : false

    if (fallbackArticle && !articleExists && editorState.mode === 'view') {
      navigate(`/docs/${fallbackArticle.id}`, { replace: true })
    }
  }, [articleId, articles, editorState.mode, fallbackArticle, navigate])

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

  const rememberFolder = (folder: string) => {
    const normalizedFolder = folder.trim()

    if (!normalizedFolder) {
      return
    }

    setCustomFolders((currentFolders) =>
      currentFolders.includes(normalizedFolder)
        ? currentFolders
        : [...currentFolders, normalizedFolder],
    )
  }

  const handleResetArticles = () => {
    const seedArticles = onResetArticles()
    const nextArticleId = seedArticles[0]?.id

    setCustomFolders([])
    setEditorState({ mode: 'view' })

    if (nextArticleId) {
      navigate(`/docs/${nextArticleId}`, { replace: true })
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

  const startArticleCreate = (group = activeFolder) => {
    if (!canCreate) {
      return
    }

    rememberFolder(group)
    setEditorState({ group, mode: 'create' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createFolder = () => {
    if (!canCreate) {
      return
    }

    const folderName = window.prompt('Название папки')?.trim()

    if (!folderName) {
      return
    }

    rememberFolder(folderName)
    setEditorState({ group: folderName, mode: 'create' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startArticleEdit = () => {
    if (!canEdit || !selectedArticle) {
      return
    }

    setEditorState({ articleId: selectedArticle.id, mode: 'edit' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeEditor = () => {
    setEditorState({ mode: 'view' })
  }

  const submitArticle = async (article: KnowledgeArticle) => {
    const now = todayIsoDate()
    const isNewArticle = !article.id
    const nextArticle: KnowledgeArticle = {
      ...article,
      id: isNewArticle ? createUniqueArticleId(article.title, articles) : article.id,
      createdAt: article.createdAt || now,
      updatedAt: now,
    }

    const savedArticle = await onSaveArticle(nextArticle)
    rememberFolder(savedArticle.group)
    setEditorState({ mode: 'view' })
    navigate(`/docs/${savedArticle.id}`, { replace: !isNewArticle })
  }

  const deleteArticle = async (articleIdToDelete: string) => {
    const articleToDelete = articles.find((article) => article.id === articleIdToDelete)
    const deletionConfirmed = window.confirm(
      `Удалить страницу "${articleToDelete?.title ?? 'без названия'}"? Это действие нельзя отменить.`,
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

  return (
    <main className="docs-reference-app">
      <SidebarProvider
        className="docs-reference-shell"
        style={
          {
            '--sidebar-width': '21.75rem',
          } as CSSProperties
        }
      >
        <AppSidebar
          canCreate={canCreate}
          collapsible="none"
          groups={sidebarGroups}
          onCreateFolder={createFolder}
          onCreatePage={startArticleCreate}
          onSelectArticle={(nextArticleId) => {
            setEditorState({ mode: 'view' })
            navigate(`/docs/${nextArticleId}`)
          }}
        />

        <SidebarInset className="docs-reference-inset">
          <header className="docs-reference-header">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span>{activeFolder}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activePageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="docs-reference-actions">
              <Button variant="outline" onClick={() => setSearchOpen(true)} type="button">
                <Search aria-hidden="true" data-icon="inline-start" />
                Search
              </Button>
              {canCreate ? (
                <Button variant="outline" onClick={() => startArticleCreate()} type="button">
                  <FilePlus aria-hidden="true" data-icon="inline-start" />
                  New
                </Button>
              ) : null}
              {canEdit && editorMode === 'view' ? (
                <Button onClick={startArticleEdit} type="button">
                  <Edit3 aria-hidden="true" data-icon="inline-start" />
                  Edit
                </Button>
              ) : null}
            </div>
          </header>

          {(articlesLoading || articlesError) && (
            <div className={articlesError ? 'docs-state-banner error' : 'docs-state-banner'}>
              {articlesError ?? 'Загружаем страницы из backend...'}
            </div>
          )}

          <section className="docs-reference-content">
            {editorMode === 'create' ? (
              <div className="docs-reference-editor-panel">
                <ArticleEditorForm
                  key={`create-${activeFolder}`}
                  article={null}
                  currentUser={currentUser}
                  existingGroups={folders}
                  initialGroup={activeFolder}
                  mode="create"
                  onCancel={closeEditor}
                  onSubmit={submitArticle}
                />
              </div>
            ) : selectedArticle && editorMode === 'edit' ? (
              <div className="docs-reference-editor-panel">
                <ArticleEditorForm
                  key={`edit-${selectedArticle.id}`}
                  article={selectedArticle}
                  currentUser={currentUser}
                  existingGroups={folders}
                  mode="edit"
                  onCancel={closeEditor}
                  onDelete={deleteArticle}
                  onSubmit={submitArticle}
                />
              </div>
            ) : selectedArticle ? (
              <article className="docs-reference-document">
                <div className="markdown-file-label">
                  <FileText aria-hidden="true" />
                  <span>{selectedArticle.title}.md</span>
                </div>
                <h1>{selectedArticle.title}</h1>
                <div className="markdown-viewer">{renderMarkdown(articleToMarkdown(selectedArticle))}</div>
              </article>
            ) : (
              <div className="empty-docs-state">
                <strong>В документации пока нет страниц</strong>
                {canCreate && (
                  <Button onClick={() => startArticleCreate()} type="button">
                    <FilePlus aria-hidden="true" data-icon="inline-start" />
                    Создать страницу
                  </Button>
                )}
                <Button variant="outline" onClick={handleResetArticles} type="button">
                  <RefreshCcw aria-hidden="true" data-icon="inline-start" />
                  Вернуть демо-данные
                </Button>
              </div>
            )}
          </section>
        </SidebarInset>
      </SidebarProvider>

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
