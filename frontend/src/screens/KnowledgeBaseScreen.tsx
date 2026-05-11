import {
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
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
  Share2,
  ShieldAlert,
  Undo2,
  Upload,
  Users,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
} from '../lib/knowledge'
import type { AskResponse } from '../api/ask'
import type {
  BaseRole,
  ChatMessage,
  CreateTarget,
  CurrentUser,
  KnowledgeBase,
  KnowledgeBaseMember,
  KnowledgePage,
  KnowledgeSection,
} from '../types'

type KnowledgeBaseScreenProps = {
  bases: KnowledgeBase[]
  currentUser: CurrentUser
  onAsk: (baseId: string, question: string) => Promise<AskResponse>
  onCreatePage: (baseId: string, sectionId: string | undefined, title: string) => Promise<KnowledgePage>
  onCreateSection: (baseId: string, title: string) => Promise<KnowledgeSection>
  onInviteMember: (baseId: string, email: string) => Promise<KnowledgeBaseMember>
  onSavePage: (
    baseId: string,
    pageId: string,
    payload: Partial<Pick<KnowledgePage, 'contentMd' | 'sectionId' | 'title'>>,
  ) => Promise<KnowledgePage>
  onUpdateMemberRole: (baseId: string, userId: string, role: BaseRole) => Promise<KnowledgeBaseMember>
  onUpdateBase: (base: KnowledgeBase) => void
  onUploadDocument: (baseId: string, file: File) => Promise<unknown>
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
  canEdit: boolean
  onCreateRequest: (target: CreateTarget) => void
}

type ChatPanelProps = {
  isAnswering: boolean
  messages: ChatMessage[]
  onAsk: (question: string) => void
  onOpenPage: (pageId: string) => void
}

const baseRoles: BaseRole[] = ['reader', 'editor', 'admin']

function roleLabel(role: BaseRole) {
  return {
    admin: 'Админ',
    editor: 'Редактор',
    reader: 'Читатель',
  }[role]
}

function canEditBase(role: BaseRole) {
  return role === 'editor' || role === 'admin'
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
  bases,
  canEdit,
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
          {canEdit ? (
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
          ) : null}
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
                    {canEdit ? (
                      <ActionMenu
                        onCreatePage={() => onCreateRequest({ parentSectionId: section.id, type: 'page' })}
                        onCreateSection={() => onCreateRequest({ type: 'section' })}
                      />
                    ) : null}

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

function ChatPanel({ isAnswering, messages, onAsk, onOpenPage }: ChatPanelProps) {
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
                  {message.sources?.length ? (
                    <div className="chat-sources">
                      {message.sources.map((source) => {
                        return (
                          <button
                            disabled={source.sourceType !== 'page'}
                            key={`${source.sourceType}-${source.sourceId}`}
                            onClick={() => {
                              if (source.sourceType === 'page') {
                                onOpenPage(source.sourceId)
                              }
                            }}
                            title={source.excerpt}
                            type="button"
                          >
                            {source.title}
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

function AccessDeniedScreen() {
  return (
    <main className="access-denied-page">
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Нет доступа</AlertTitle>
        <AlertDescription>
          Эта база доступна только участникам команды. Попросите администратора добавить вашу почту.
        </AlertDescription>
      </Alert>
      <Button asChild variant="outline">
        <Link to="/bases">К списку баз</Link>
      </Button>
    </main>
  )
}

function TeamSheet({
  base,
  currentUser,
  onInviteMember,
  onOpenChange,
  onUpdateMemberRole,
  open,
}: {
  base: KnowledgeBase
  currentUser: CurrentUser
  onInviteMember: (baseId: string, email: string) => Promise<KnowledgeBaseMember>
  onOpenChange: (open: boolean) => void
  onUpdateMemberRole: (baseId: string, userId: string, role: BaseRole) => Promise<KnowledgeBaseMember>
  open: boolean
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const emailId = 'team-member-email'
  const isAdmin = base.myRole === 'admin'

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Введите почту зарегистрированного пользователя.')
      return
    }

    setIsInviting(true)
    setError(null)
    setStatus(null)

    try {
      await onInviteMember(base.id, normalizedEmail)
      setEmail('')
      setStatus('Пользователь добавлен в команду.')
    } catch {
      setError('Не удалось добавить пользователя.')
    } finally {
      setIsInviting(false)
    }
  }

  const updateRole = async (member: KnowledgeBaseMember, role: BaseRole) => {
    if (member.role === role || member.isOwner) {
      return
    }

    setUpdatingUserId(member.userId)
    setError(null)
    setStatus(null)

    try {
      await onUpdateMemberRole(base.id, member.userId, role)
      setStatus('Роль обновлена.')
    } catch {
      setError('Не удалось обновить роль.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="team-sheet">
        <SheetHeader>
          <SheetTitle>Команда базы</SheetTitle>
          <SheetDescription>{base.title}</SheetDescription>
        </SheetHeader>

        <div className="team-sheet-content">
          {isAdmin ? (
            <form className="team-invite-form" onSubmit={submitInvite}>
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={emailId}>Почта сотрудника</FieldLabel>
                  <Input
                    autoComplete="email"
                    id={emailId}
                    name="email"
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError(null)
                    }}
                    placeholder="user@company.ru"
                    type="email"
                    value={email}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
              </FieldGroup>
              <Button disabled={isInviting} type="submit">
                <Users aria-hidden="true" data-icon="inline-start" />
                {isInviting ? 'Добавляем...' : 'Добавить'}
              </Button>
            </form>
          ) : (
            <Alert>
              <Users aria-hidden="true" />
              <AlertTitle>Только просмотр</AlertTitle>
              <AlertDescription>Приглашать сотрудников и менять роли может админ базы.</AlertDescription>
            </Alert>
          )}

          {status ? <p className="team-status">{status}</p> : null}

          <div className="team-member-list">
            {base.members.map((member) => {
              const isCurrentUser = member.userId === currentUser.id
              const canChangeRole = isAdmin && !member.isOwner

              return (
                <div className="team-member-row" key={member.userId}>
                  <span className="team-member-avatar" aria-hidden="true">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="team-member-main">
                    <strong>
                      {member.name}
                      {isCurrentUser ? ' · вы' : ''}
                    </strong>
                    <small>{member.email}</small>
                  </span>
                  {canChangeRole ? (
                    <Select
                      disabled={updatingUserId === member.userId}
                      onValueChange={(value) => {
                        if (baseRoles.includes(value as BaseRole)) {
                          void updateRole(member, value as BaseRole)
                        }
                      }}
                      value={member.role}
                    >
                      <SelectTrigger className="team-role-select" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {baseRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {roleLabel(member.role)}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function KnowledgeBaseScreen({
  bases,
  currentUser,
  onAsk,
  onCreatePage,
  onCreateSection,
  onInviteMember,
  onSavePage,
  onUpdateMemberRole,
  onUpdateBase,
  onUploadDocument,
}: KnowledgeBaseScreenProps) {
  const { baseId, pageId, sectionId } = useParams<{
    baseId: string
    pageId?: string
    sectionId?: string
  }>()
  const navigate = useNavigate()
  const base = bases.find((candidate) => candidate.id === baseId)
  const [chatOpen, setChatOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAnswering, setIsAnswering] = useState(false)
  const [isSavingPage, setIsSavingPage] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

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

  if (!base) {
    return <AccessDeniedScreen />
  }

  const canEdit = canEditBase(base.myRole)

  const updateBase = (nextBase: KnowledgeBase) => {
    onUpdateBase(nextBase)
  }

  const createItem = async (name: string) => {
    if (!createTarget || !canEdit) {
      return
    }

    if (createTarget.type === 'section') {
      const section = await onCreateSection(base.id, name)
      updateBase({
        ...base,
        sections: [...base.sections, section],
        updatedAt: section.updatedAt,
      })
      navigate(`/bases/${base.id}/section/${section.id}`)
      return
    }

    const sectionIdForPage = createTarget.parentSectionId ?? base.sections[0]?.id

    if (!sectionIdForPage) {
      return
    }

    const page = await onCreatePage(base.id, sectionIdForPage, name)
    updateBase({
      ...base,
      pages: [page, ...base.pages],
      updatedAt: page.updatedAt,
    })
    setEditDraft({
      baselineContentMd: page.contentMd,
      contentMd: page.contentMd,
      pageId: page.id,
    })
    navigate(`/bases/${base.id}/page/${page.id}`)
  }

  const startPageEditing = () => {
    if (!selectedPage || !canEdit) {
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

  const savePageChanges = async () => {
    if (!selectedPage || editDraft?.pageId !== selectedPage.id) {
      return
    }

    if (hasEditChanges) {
      setIsSavingPage(true)
      try {
        const page = await onSavePage(base.id, selectedPage.id, { contentMd: editDraft.contentMd })
        updateBase({
          ...base,
          pages: base.pages.map((candidate) => (candidate.id === selectedPage.id ? page : candidate)),
          updatedAt: page.updatedAt,
        })
      } finally {
        setIsSavingPage(false)
      }
    }

    setEditDraft(null)
  }

  const askQuestion = async (question: string) => {
    if (isAnswering) {
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

    try {
      const response = await onAsk(base.id, question)
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${requestId}`,
          role: 'assistant',
          sources: response.sources,
          text: response.warning ? `${response.answer}\n\n${response.warning}` : response.answer,
        },
      ])
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${requestId}`,
          role: 'assistant',
          text: 'Не удалось получить ответ от backend. Проверьте, что API запущен.',
        },
      ])
    } finally {
      setIsAnswering(false)
    }
  }

  const openPageFromChat = (nextPageId: string) => {
    setEditDraft(null)
    navigate(`/bases/${base.id}/page/${nextPageId}`)
  }

  const pickDocument = () => {
    if (!canEdit) {
      return
    }

    uploadInputRef.current?.click()
  }

  const uploadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || isUploading || !canEdit) {
      return
    }

    setIsUploading(true)
    setUploadStatus(null)
    try {
      await onUploadDocument(base.id, file)
      setUploadStatus(`${file.name} загружен и поставлен в индексацию.`)
    } catch {
      setUploadStatus('Не удалось загрузить документ.')
    } finally {
      setIsUploading(false)
    }
  }

  const shareBase = async () => {
    const shareUrl = `${window.location.origin}/bases/${base.id}`
    setShareStatus(null)

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('Ссылка скопирована.')
    } catch {
      setShareStatus(shareUrl)
    }
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
          canEdit={canEdit}
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
                    {selectedPage && canEdit ? (
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
                          disabled={isSavingPage}
                          onClick={isEditingSelectedPage ? savePageChanges : startPageEditing}
                          type="button"
                          variant={isEditingSelectedPage ? 'default' : 'outline'}
                        >
                          {isEditingSelectedPage ? (
                            <Save aria-hidden="true" data-icon="inline-start" />
                          ) : (
                            <Pencil aria-hidden="true" data-icon="inline-start" />
                          )}
                          {isSavingPage ? 'Сохраняем...' : isEditingSelectedPage ? 'Сохранить' : 'Редактировать'}
                        </Button>
                      </>
                    ) : null}
                    {canEdit ? (
                      <>
                        <input
                          accept=".md,.txt,.csv,.json,.log,text/*,application/json"
                          className="sr-only"
                          onChange={uploadDocument}
                          ref={uploadInputRef}
                          type="file"
                        />
                        <Button disabled={isUploading} onClick={pickDocument} type="button" variant="outline">
                          <Upload aria-hidden="true" data-icon="inline-start" />
                          {isUploading ? 'Загружаем...' : 'Загрузить'}
                        </Button>
                      </>
                    ) : null}
                    <Button onClick={() => setTeamOpen(true)} type="button" variant="outline">
                      <Users aria-hidden="true" data-icon="inline-start" />
                      Команда
                    </Button>
                    <Button onClick={shareBase} type="button" variant="outline">
                      <Share2 aria-hidden="true" data-icon="inline-start" />
                      Поделиться
                    </Button>
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
                    {shareStatus ? <p className="kb-upload-status">{shareStatus}</p> : null}
                    {uploadStatus ? <p className="kb-upload-status">{uploadStatus}</p> : null}
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
      <TeamSheet
        base={base}
        currentUser={currentUser}
        onInviteMember={onInviteMember}
        onOpenChange={setTeamOpen}
        onUpdateMemberRole={onUpdateMemberRole}
        open={teamOpen}
      />
    </main>
  )
}

export default KnowledgeBaseScreen
