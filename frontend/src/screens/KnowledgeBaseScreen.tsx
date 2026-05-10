import { type CSSProperties, type FormEvent, useMemo, useState } from 'react'
import {
  BookOpen,
  Bot,
  FileText,
  Folder,
  MessageSquareText,
  Plus,
  Send,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
import type { ChatMessage, CreateTarget, KnowledgeBase, KnowledgePage } from '../types'

type KnowledgeBaseScreenProps = {
  bases: KnowledgeBase[]
  onUpdateBase: (base: KnowledgeBase) => void
}

type ViewMode = 'edit' | 'preview'

type BaseSidebarProps = {
  activePageId?: string
  activeSectionId?: string
  base: KnowledgeBase
  chatOpen: boolean
  onCreateRequest: (target: CreateTarget) => void
  onToggleChat: () => void
}

type ChatPanelProps = {
  base: KnowledgeBase
  messages: ChatMessage[]
  onAsk: (question: string) => void
  onOpenPage: (pageId: string) => void
}

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
  chatOpen,
  onCreateRequest,
  onToggleChat,
}: BaseSidebarProps) {
  return (
    <Sidebar collapsible="none">
      <SidebarHeader>
        <div className="kb-sidebar-title">
          <span className="brand-mark">R</span>
          <div>
            <strong>{base.title}</strong>
            <span>{base.pages.length} .md файлов</span>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onToggleChat} isActive={chatOpen} type="button">
              <MessageSquareText aria-hidden="true" />
              <span>AI чат</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeSectionId === section.id && !activePageId}
                    >
                      <Link to={`/bases/${base.id}/section/${section.id}`}>
                        <Folder aria-hidden="true" />
                        <span>{section.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <ActionMenu
                      onCreatePage={() => onCreateRequest({ parentSectionId: section.id, type: 'page' })}
                      onCreateSection={() => onCreateRequest({ type: 'section' })}
                    />

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

function ChatPanel({ base, messages, onAsk, onOpenPage }: ChatPanelProps) {
  const [query, setQuery] = useState('')

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const question = query.trim()

    if (!question) {
      return
    }

    onAsk(question)
    setQuery('')
  }

  return (
    <aside className="chat-panel" aria-label="AI чат">
      <header className="chat-header">
        <Bot aria-hidden="true" />
        <div>
          <strong>AI чат</strong>
          <span>Локальный поиск по {base.pages.length} markdown-файлам</span>
        </div>
      </header>

      <ScrollArea className="chat-scroll">
        <div className="chat-messages">
          {messages.length > 0 ? (
            messages.map((message) => (
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
            ))
          ) : (
            <div className="chat-empty">
              Задайте вопрос, и чат покажет markdown-файлы, где найден контекст.
            </div>
          )}
        </div>
      </ScrollArea>

      <form className="chat-form" onSubmit={submitQuestion}>
        <InputGroup>
          <InputGroupInput
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Спросить по базе..."
            value={query}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Отправить" size="icon-xs" type="submit">
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
      <span className="ui-kicker">{section.title}</span>
      <h1>Файлы раздела</h1>
      <div className="section-file-list">
        {pages.length > 0 ? (
          pages.map((page) => (
            <Link key={page.id} to={`/bases/${base.id}/page/${page.id}`}>
              <FileText aria-hidden="true" />
              <span>
                <strong>{page.title}.md</strong>
                <small>{pageSummary(page)}</small>
              </span>
            </Link>
          ))
        ) : (
          <p>В этом разделе пока нет файлов.</p>
        )}
      </div>
    </section>
  )
}

function BaseOverview({ base }: { base: KnowledgeBase }) {
  return (
    <section className="section-preview">
      <span className="ui-kicker">{base.title}</span>
      <h1>Структура базы знаний</h1>
      <div className="section-file-list">
        {base.sections.map((section) => (
          <Link key={section.id} to={`/bases/${base.id}/section/${section.id}`}>
            <Folder aria-hidden="true" />
            <span>
              <strong>{section.title}</strong>
              <small>{getSectionPages(base, section.id).length} markdown-файлов</small>
            </span>
          </Link>
        ))}
      </div>
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
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const selectedPage = base ? getBasePage(base, pageId) : null
  const selectedSection = base
    ? selectedPage
      ? getBaseSection(base, selectedPage.sectionId)
      : getBaseSection(base, sectionId)
    : null

  const breadcrumbLabel = selectedPage?.title ?? selectedSection?.title ?? base?.title ?? 'База знаний'
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
    setViewMode('edit')
    navigate(`/bases/${base.id}/page/${page.id}`)
  }

  const updatePageContent = (page: KnowledgePage, contentMd: string) => {
    updateBase({
      ...base,
      pages: base.pages.map((candidate) =>
        candidate.id === page.id
          ? {
              ...candidate,
              contentMd,
              updatedAt: new Date().toISOString(),
            }
          : candidate,
      ),
    })
  }

  const askQuestion = (question: string) => {
    const results = searchKnowledgeBase(base, question)
    const answer =
      results.length > 0
        ? `Нашел ${results.length} источника по запросу "${question}". Самый близкий фрагмент: ${results[0].excerpt}`
        : `По запросу "${question}" в markdown-файлах ничего не найдено.`

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: question,
      },
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        sourcePageIds: results.map((result) => result.page.id),
        text: answer,
      },
    ])
  }

  const openPageFromChat = (nextPageId: string) => {
    setViewMode('preview')
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
          chatOpen={chatOpen}
          onCreateRequest={setCreateTarget}
          onToggleChat={() => setChatOpen((open) => !open)}
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

                  {selectedPage ? (
                    <ToggleGroup
                      aria-label="Режим просмотра markdown"
                      onValueChange={(value) => {
                        if (value === 'edit' || value === 'preview') {
                          setViewMode(value)
                        }
                      }}
                      type="single"
                      value={viewMode}
                      variant="outline"
                    >
                      <ToggleGroupItem value="edit">Редактировать</ToggleGroupItem>
                      <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
                    </ToggleGroup>
                  ) : null}
                </header>

                <ScrollArea className="kb-content-scroll">
                  <div className="kb-content">
                    {selectedPage ? (
                      viewMode === 'edit' ? (
                        <Field className="markdown-editor-field">
                          <FieldLabel htmlFor="markdown-editor">{selectedPage.title}.md</FieldLabel>
                          <Textarea
                            id="markdown-editor"
                            onChange={(event) => updatePageContent(selectedPage, event.target.value)}
                            spellCheck="false"
                            value={selectedPage.contentMd}
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
