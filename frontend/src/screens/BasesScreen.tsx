import { BookOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import CreateNameDialog from '../components/CreateNameDialog'
import { pageSummary } from '../lib/knowledge'
import type { KnowledgeBase } from '../types'

type BasesScreenProps = {
  bases: KnowledgeBase[]
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

function BasesScreen({ bases, error, isLoading = false, onCreateBase }: BasesScreenProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

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
                  <span>{base.sections.length} раздела</span>
                  <span>{base.pages.length} файла</span>
                  <span>{formatDate(base.updatedAt)}</span>
                </span>
              </Link>
            )
          })}
        </section>
      ) : (
        <Empty className="bases-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Баз пока нет</EmptyTitle>
            <EmptyDescription>Создайте первую базу знаний и добавьте markdown-файлы.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)} type="button">
              <Plus aria-hidden="true" data-icon="inline-start" />
              Создать базу знаний
            </Button>
          </EmptyContent>
        </Empty>
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

export default BasesScreen
