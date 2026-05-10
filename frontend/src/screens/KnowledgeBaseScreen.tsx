import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  LogOut,
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  Send,
  Undo2,
} from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Textarea } from '@/components/ui/textarea'
import CreateNameDialog from '../components/CreateNameDialog'
import MarkdownPreview from '../components/MarkdownPreview'
import {
  getBasePage,
  getBaseSection,
  getSectionPages,
  pageSummary,
  searchKnowledgeBase,
} from '../lib/knowledge'
import { createPage, createSection, touchBase } from '../lib/storage'
import type { ChatMessage, CreateTarget, KnowledgeBase } from '../types'

type KnowledgeBaseScreenProps = {
  bases: KnowledgeBase[]
  onUpdateBase: (base: KnowledgeBase) => void
}

type EditDraft = {
  baselineContentMd: string
  contentMd: string
  pageId: string
}

type BaseSidebarProps = {
  activePageId?: string
  activeSectionId?: string
  base: KnowledgeBase
  bases: KnowledgeBase[]
  onCreateRequest: (target: CreateTarget) => void
}

type ChatPanelProps = {
  base: KnowledgeBase
  isAnswering: boolean
  messages: ChatMessage[]
  onAsk: (question: string) => void
  onOpenPage: (pageId: string) => void
}

const CHAT_RESPONSE_DELAY_MS = 650

function ActionMenu({
  onCreatePage,
  onCreateSection,
}: {
  onCreatePage: () => void
  onCreateSection: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction aria-label="Создать" title="Создать">
          <Plus aria-hidden="true" />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreatePage}>
            <FileText aria-hidden="true" />
            Файл
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateSection}>
            <Folder aria-hidden="true" />
            Раздел
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BaseSidebar({
  activePageId,
  activeSectionId,
  base,
  bases,
  onCreateRequest,
}: BaseSidebarProps) {
  const navigate = useNavigate()
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(() => new Set())
  const otherBases = bases.filter((candidate) => candidate.id !== base.id)

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((currentSectionIds) => {
      const nextSectionIds = new Set(currentSectionIds)

      if (nextSectionIds.has(sectionId)) {
        nextSectionIds.delete(sectionId)
      } else {
        nextSectionIds.add(sectionId)
      }

      return nextSectionIds
    })
  }

  const openSection = (sectionId: string) => {
    setCollapsedSectionIds((currentSectionIds) => {
      if (!currentSectionIds.has(sectionId)) {
        return currentSectionIds
      }

      const nextSectionIds = new Set(currentSectionIds)
      nextSectionIds.delete(sectionId)
      return nextSectionIds
    })
  }

  return (
    <Sidebar className="kb-sidebar" collapsible="none">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="kb-sidebar-title" type="button">
              <span className="kb-sidebar-title-copy">
                <strong>{base.title}</strong>
                <span>{base.pages.length} .md файлов</span>
              </span>
              <ChevronDown className="kb-sidebar-title-chevron" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="kb-base-switcher-menu" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Другие базы</DropdownMenuLabel>
              {otherBases.length > 0 ? (
                otherBases.map((candidate) => (
                  <DropdownMenuItem
                    key={candidate.id}
                    onClick={() => navigate(`/bases/${candidate.id}`)}
                  >
                    <BookOpen aria-hidden="true" />
                    <span className="kb-base-switcher-entry">
                      <strong>{candidate.title}</strong>
                      <small>{candidate.pages.length} .md файлов</small>
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>Других баз нет</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/bases')}>
                <LogOut aria-hidden="true" />
                Выйти к списку баз
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Структура</SidebarGroupLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarGroupAction aria-label="Создать в базе" title="Создать">
                <Plus aria-hidden="true" />
              </SidebarGroupAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => onCreateRequest({ parentSectionId: base.sections[0]?.id, type: 'page' })}
                >
                  <FileText aria-hidden="true" />
                  Файл
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateRequest({ type: 'section' })}>
                  <Folder aria-hidden="true" />
                  Раздел
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <SidebarGroupContent>
            <SidebarMenu>
              {base.sections.map((section) => {
                const pages = getSectionPages(base, section.id)
                const isOpen = !collapsedSectionIds.has(section.id)

                return (
                  <SidebarMenuItem key={section.id}>
                    <div className="kb-section-row">
                      <button
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Свернуть' : 'Развернуть'} ${section.title}`}
                        className="kb-section-toggle"
                        onClick={() => toggleSection(section.id)}
                        title={isOpen ? 'Свернуть' : 'Развернуть'}
                        type="button"
                      >
                        {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                      </button>
                      <SidebarMenuButton
                        asChild
                        isActive={activeSectionId === section.id && !activePageId}
                      >
                        <Link
                          onClick={() => openSection(section.id)}
                          to={`/bases/${base.id}/section/${section.id}`}
                        >
                          <Folder aria-hidden="true" />
                          <span>{section.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </div>
                    <ActionMenu
                      onCreatePage={() => onCreateRequest({ parentSectionId: section.id, type: 'page' })}
                      onCreateSection={() => onCreateRequest({ type: 'section' })}
                    />

                    {isOpen ? (
                      <SidebarMenuSub>
                        {pages.map((page) => (
                          <SidebarMenuSubItem key={page.id}>
                            <SidebarMenuSubButton asChild isActive={activePageId === page.id}>
                              <Link to={`/bases/${base.id}/page/${page.id}`}>
                                <FileText aria-hidden="true" />
                                <span>{page.title}.md</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function ChatPanel({ base, isAnswering, messages, onAsk, onOpenPage }: ChatPanelProps) {
  const [query, setQuery] = useState('')

  const askCurrentQuestion = () => {
    const question = query.trim()

    if (!question || isAnswering) {
      return
    }

    onAsk(question)
    setQuery('')
  }

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    askCurrentQuestion()
  }

  const submitQuestionFromKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    askCurrentQuestion()
  }

  return (
    <aside className="chat-panel" aria-label="AI чат">
      <header className="chat-header">
        <Bot aria-hidden="true" />
        <div>
          <strong>AI чат</strong>
        </div>
      </header>

      <ScrollArea className="chat-scroll">
        <div className="chat-messages">
          {messages.length > 0 || isAnswering ? (
            <>
              {messages.map((message) => (
                <div className={`chat-message ${message.role}`} key={message.id}>
                  <p>{message.text}</p>
                  {message.sourcePageIds?.length ? (
                    <div className="chat-sources">
                      {message.sourcePageIds.map((pageId) => {
                        const page = getBasePage(base, pageId)

                        if (!page) {
                          return null
                        }

                        return (
                          <button key={page.id} onClick={() => onOpenPage(page.id)} type="button">
                            {page.title}.md
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
              {isAnswering ? (
                <div
                  aria-label="AI отвечает"
                  className="chat-message assistant chat-message-loading"
                  role="status"
                >
                  <span aria-hidden="true" className="chat-typing-indicator">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="chat-empty">
              Задайте вопрос, и чат покажет markdown-файлы, где найден контекст.
            </div>
          )}
        </div>
      </ScrollArea>

      <form className="chat-form" onSubmit={submitQuestion}>
        <InputGroup className="chat-composer">
          <InputGroupInput
            aria-label="Сообщение в AI чат"
            className="chat-composer-input"
            disabled={isAnswering}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={submitQuestionFromKeyboard}
            placeholder="Спросить по базе..."
            type="text"
            value={query}
          />
          <InputGroupAddon align="inline-end" className="chat-composer-actions">
            <InputGroupButton
              aria-label={isAnswering ? 'AI отвечает' : 'Отправить сообщение'}
              className="chat-send-button"
              disabled={!query.trim() || isAnswering}
              size="icon-sm"
              type="submit"
              variant="default"
            >
              <Send aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </aside>
  )
}

function SectionPreview({ base, sectionId }: { base: KnowledgeBase; sectionId: string }) {
  const section = getBaseSection(base, sectionId)
  const pages = section ? getSectionPages(base, section.id) : []

  if (!section) {
    return (
      <div className="document-empty">
        <BookOpen aria-hidden="true" />
        <strong>Раздел не найден</strong>
      </div>
    )
  }

  return (
    <section className="section-preview">
      <header className="section-preview-header">
        <h1>{section.title}</h1>
        <span>{pages.length} markdown-файлов</span>
      </header>
      {pages.length > 0 ? (
        <ul className="section-bullet-list">
          {pages.map((page) => (
            <li key={page.id}>
              <Link to={`/bases/${base.id}/page/${page.id}`}>
                <span>
                  <strong>{page.title}.md</strong>
                  <small>{pageSummary(page)}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="section-empty-note">В этом разделе пока нет файлов.</p>
      )}
    </section>
  )
}

function BaseOverview({ base }: { base: KnowledgeBase }) {
  return (
    <section className="section-preview">
      <h1>Структура базы знаний</h1>
      <ul className="section-bullet-list">
        {base.sections.map((section) => (
          <li key={section.id}>
            <Link to={`/bases/${base.id}/section/${section.id}`}>
              <span>
                <strong>{section.title}</strong>
                <small>{getSectionPages(base, section.id).length} markdown-файлов</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function KnowledgeBaseScreen({ bases, onUpdateBase }: KnowledgeBaseScreenProps) {
  const { baseId, pageId, sectionId } = useParams<{
    baseId: string
    pageId?: string
    sectionId?: string
  }>()
  const navigate = useNavigate()
  const base = bases.find((candidate) => candidate.id === baseId)
  const [chatOpen, setChatOpen] = useState(false)
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAnswering, setIsAnswering] = useState(false)
  const answerTimeoutRef = useRef<number | null>(null)

  const selectedPage = base ? getBasePage(base, pageId) : null
  const selectedSection = base
    ? selectedPage
      ? getBaseSection(base, selectedPage.sectionId)
      : getBaseSection(base, sectionId)
    : null

  const breadcrumbLabel = selectedPage?.title ?? selectedSection?.title ?? base?.title ?? 'База знаний'
  const isEditingSelectedPage = Boolean(selectedPage && editDraft?.pageId === selectedPage.id)
  const hasEditChanges =
    Boolean(isEditingSelectedPage && editDraft && editDraft.contentMd !== editDraft.baselineContentMd)
  const editorContentMd = isEditingSelectedPage && editDraft ? editDraft.contentMd : selectedPage?.contentMd ?? ''
  const createDialogCopy = useMemo(() => {
    if (createTarget?.type === 'section') {
      return {
        description: 'Раздел появится в левой структуре базы.',
        label: 'Название раздела',
        placeholder: 'Например: FAQ',
        submitLabel: 'Создать раздел',
        title: 'Создать раздел',
      }
    }

    return {
      description: 'Файл будет создан как markdown-страница.',
      label: 'Название файла',
      placeholder: 'Например: Регламент обработки заявки',
      submitLabel: 'Создать файл',
      title: 'Создать файл',
    }
  }, [createTarget?.type])

  useEffect(() => {
    return () => {
      if (answerTimeoutRef.current !== null) {
        window.clearTimeout(answerTimeoutRef.current)
      }
    }
  }, [])

  if (!base) {
    return <Navigate to="/bases" replace />
  }

  const updateBase = (nextBase: KnowledgeBase) => {
    onUpdateBase(touchBase(nextBase))
  }

  const createItem = (name: string) => {
    if (!createTarget) {
      return
    }

    if (createTarget.type === 'section') {
      const section = createSection(name, base)
      updateBase({
        ...base,
        sections: [...base.sections, section],
      })
      navigate(`/bases/${base.id}/section/${section.id}`)
      return
    }

    const sectionIdForPage = createTarget.parentSectionId ?? base.sections[0]?.id

    if (!sectionIdForPage) {
      return
    }

    const page = createPage(name, sectionIdForPage, base)
    updateBase({
      ...base,
      pages: [...base.pages, page],
    })
    setEditDraft({
      baselineContentMd: page.contentMd,
      contentMd: page.contentMd,
      pageId: page.id,
    })
    navigate(`/bases/${base.id}/page/${page.id}`)
  }

  const startPageEditing = () => {
    if (!selectedPage) {
      return
    }

    setEditDraft({
      baselineContentMd: selectedPage.contentMd,
      contentMd: selectedPage.contentMd,
      pageId: selectedPage.id,
    })
  }

  const cancelPageChanges = () => {
    setEditDraft(null)
  }

  const savePageChanges = () => {
    if (!selectedPage || editDraft?.pageId !== selectedPage.id) {
      return
    }

    if (hasEditChanges) {
      updateBase({
        ...base,
        pages: base.pages.map((candidate) =>
          candidate.id === selectedPage.id
            ? {
                ...candidate,
                contentMd: editDraft.contentMd,
                updatedAt: new Date().toISOString(),
              }
            : candidate,
        ),
      })
    }

    setEditDraft(null)
  }

  const askQuestion = (question: string) => {
    if (isAnswering || answerTimeoutRef.current !== null) {
      return
    }

    const requestId = Date.now()

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${requestId}`,
        role: 'user',
        text: question,
      },
    ])
    setIsAnswering(true)

    answerTimeoutRef.current = window.setTimeout(() => {
      const results = searchKnowledgeBase(base, question)
      const answer =
        results.length > 0
          ? `Нашел ${results.length} источника по запросу "${question}". Самый близкий фрагмент: ${results[0].excerpt}`
          : `По запросу "${question}" в markdown-файлах ничего не найдено.`

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${requestId}`,
          role: 'assistant',
          sourcePageIds: results.map((result) => result.page.id),
          text: answer,
        },
      ])
      setIsAnswering(false)
      answerTimeoutRef.current = null
    }, CHAT_RESPONSE_DELAY_MS)
  }

  const openPageFromChat = (nextPageId: string) => {
    setEditDraft(null)
    navigate(`/bases/${base.id}/page/${nextPageId}`)
  }

  return (
    <main className="kb-page">
      <SidebarProvider
        className="kb-shell"
        style={
          {
            '--sidebar-width': '19.5rem',
          } as CSSProperties
        }
      >
        <BaseSidebar
          activePageId={selectedPage?.id}
          activeSectionId={selectedSection?.id}
          base={base}
          bases={bases}
          onCreateRequest={setCreateTarget}
        />

        <SidebarInset className="kb-inset">
          <ResizablePanelGroup orientation="horizontal" className="kb-resizable">
            <ResizablePanel defaultSize={chatOpen ? 70 : 100} minSize={50}>
              <div className="kb-main-column">
                <header className="kb-header">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link to={`/bases/${base.id}`}>{base.title}</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {selectedSection ? (
                        <>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {selectedPage ? (
                              <BreadcrumbLink asChild>
                                <Link to={`/bases/${base.id}/section/${selectedSection.id}`}>
                                  {selectedSection.title}
                                </Link>
                              </BreadcrumbLink>
                            ) : (
                              <BreadcrumbPage>{selectedSection.title}</BreadcrumbPage>
                            )}
                          </BreadcrumbItem>
                        </>
                      ) : null}
                      {selectedPage ? (
                        <>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>{breadcrumbLabel}.md</BreadcrumbPage>
                          </BreadcrumbItem>
                        </>
                      ) : null}
                    </BreadcrumbList>
                  </Breadcrumb>

                  <div className="kb-header-actions">
                    {selectedPage ? (
                      <>
                        {isEditingSelectedPage ? (
                          <Button
                            disabled={!hasEditChanges}
                            onClick={cancelPageChanges}
                            type="button"
                            variant="outline"
                          >
                            <Undo2 aria-hidden="true" data-icon="inline-start" />
                            Отмена
                          </Button>
                        ) : null}
                        <Button
                          onClick={isEditingSelectedPage ? savePageChanges : startPageEditing}
                          type="button"
                          variant={isEditingSelectedPage ? 'default' : 'outline'}
                        >
                          {isEditingSelectedPage ? (
                            <Save aria-hidden="true" data-icon="inline-start" />
                          ) : (
                            <Pencil aria-hidden="true" data-icon="inline-start" />
                          )}
                          {isEditingSelectedPage ? 'Сохранить' : 'Редактировать'}
                        </Button>
                      </>
                    ) : null}
                    <Button
                      aria-pressed={chatOpen}
                      onClick={() => setChatOpen((open) => !open)}
                      title={chatOpen ? 'Скрыть AI чат' : 'Открыть AI чат'}
                      type="button"
                      variant={chatOpen ? 'default' : 'outline'}
                    >
                      <MessageSquareText aria-hidden="true" data-icon="inline-start" />
                      AI чат
                    </Button>
                  </div>
                </header>

                <ScrollArea className="kb-content-scroll">
                  <div className="kb-content kb-content-wide">
                    {selectedPage ? (
                      isEditingSelectedPage ? (
                        <Field className="markdown-editor-field">
                          <FieldLabel htmlFor="markdown-editor">{selectedPage.title}.md</FieldLabel>
                          <Textarea
                            id="markdown-editor"
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft?.pageId === selectedPage.id
                                  ? { ...currentDraft, contentMd: event.target.value }
                                  : currentDraft,
                              )
                            }
                            spellCheck="false"
                            value={editorContentMd}
                          />
                        </Field>
                      ) : (
                        <article className="document-surface">
                          <MarkdownPreview markdown={selectedPage.contentMd} />
                        </article>
                      )
                    ) : selectedSection ? (
                      <SectionPreview base={base} sectionId={selectedSection.id} />
                    ) : (
                      <BaseOverview base={base} />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            {chatOpen ? (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={24}>
                  <ChatPanel
                    base={base}
                    isAnswering={isAnswering}
                    messages={messages}
                    onAsk={askQuestion}
                    onOpenPage={openPageFromChat}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </SidebarInset>
      </SidebarProvider>

      <CreateNameDialog
        description={createDialogCopy.description}
        label={createDialogCopy.label}
        open={Boolean(createTarget)}
        placeholder={createDialogCopy.placeholder}
        submitLabel={createDialogCopy.submitLabel}
        title={createDialogCopy.title}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null)
          }
        }}
        onSubmit={createItem}
      />
    </main>
  )
}

export default KnowledgeBaseScreen
