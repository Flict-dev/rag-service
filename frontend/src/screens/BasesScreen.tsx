import { BookOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateNameDialog from '../components/CreateNameDialog'
import { pageSummary } from '../lib/knowledge'
import type { BaseRole, CurrentUser, KnowledgeBase } from '../types'

type BasesScreenProps = {
  bases: KnowledgeBase[]
  currentUser: CurrentUser
  error?: string | null
  isLoading?: boolean
  onCreateBase: (title: string) => Promise<KnowledgeBase>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function roleLabel(role: BaseRole) {
  return {
    admin: 'Админ',
    editor: 'Редактор',
    reader: 'Читатель',
  }[role]
}

function BasesScreen({ bases, currentUser, error, isLoading = false, onCreateBase }: BasesScreenProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const ownBases = bases.filter((base) => base.ownerId === currentUser.id)
  const externalBases = bases.filter((base) => base.ownerId !== currentUser.id)

  const createBase = async (title: string) => {
    const base = await onCreateBase(title)
    navigate(`/bases/${base.id}`)
  }

  return (
    <main className="bases-page">
      <section className="bases-hero">
        <div>
          <span className="ui-kicker">Базы знаний</span>
          <h1>Ваши рабочие базы</h1>
          <p>Откройте существующую базу или создайте новую одним названием.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} type="button">
          <Plus aria-hidden="true" data-icon="inline-start" />
          Создать базу знаний
        </Button>
      </section>

      {error ? <p className="bases-status">{error}</p> : null}
      {isLoading ? <p className="bases-status">Загружаем базы знаний...</p> : null}

      {bases.length > 0 ? (
        <Tabs className="bases-tabs" defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">Мои базы</TabsTrigger>
            <TabsTrigger value="external">Внешние</TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <BaseList bases={ownBases} emptyDescription="Создайте первую базу знаний и добавьте markdown-файлы." />
          </TabsContent>
          <TabsContent value="external">
            <BaseList bases={externalBases} emptyDescription="Здесь появятся базы, куда вас добавили по почте." />
          </TabsContent>
        </Tabs>
      ) : (
        <BaseEmpty
          description="Создайте первую базу знаний и добавьте markdown-файлы."
          onCreate={() => setCreateOpen(true)}
        />
      )}

      <CreateNameDialog
        description="У базы знаний на этом этапе есть только название."
        label="Название базы"
        open={createOpen}
        placeholder="Например: Поддержка клиентов"
        submitLabel="Создать"
        title="Создать базу знаний"
        onOpenChange={setCreateOpen}
        onSubmit={createBase}
      />
    </main>
  )
}

function BaseList({ bases, emptyDescription }: { bases: KnowledgeBase[]; emptyDescription: string }) {
  if (bases.length === 0) {
    return <BaseEmpty description={emptyDescription} />
  }

  return (
        <section className="bases-list" aria-label="Список баз знаний">
          {bases.map((base) => {
            const firstPage = base.pages[0]

            return (
              <Link className="base-row" key={base.id} to={`/bases/${base.id}`}>
                <span className="base-row-icon">
                  <BookOpen aria-hidden="true" />
                </span>
                <span className="base-row-main">
                  <strong>{base.title}</strong>
                  <small>{firstPage ? pageSummary(firstPage) : 'В базе пока нет markdown-файлов.'}</small>
                </span>
                <span className="base-row-meta">
                  <Badge variant={base.myRole === 'admin' ? 'default' : 'secondary'}>
                    {roleLabel(base.myRole)}
                  </Badge>
                  <span>{base.sections.length} раздела</span>
                  <span>{base.pages.length} файла</span>
                  <span>{base.ownerName}</span>
                  <span>{formatDate(base.updatedAt)}</span>
                </span>
              </Link>
            )
          })}
        </section>
  )
}

function BaseEmpty({ description, onCreate }: { description: string; onCreate?: () => void }) {
  return (
        <Empty className="bases-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Баз пока нет</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          {onCreate ? (
            <EmptyContent>
              <Button onClick={onCreate} type="button">
                <Plus aria-hidden="true" data-icon="inline-start" />
                Создать базу знаний
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
  )
}

export default BasesScreen
