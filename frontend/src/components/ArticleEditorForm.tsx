import { type FormEvent, useState } from 'react'
import { FileText, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  articleToMarkdown,
  createFolderTag,
  getFallbackFolder,
  markdownSummary,
  markdownToArticleSections,
} from '../lib/markdownArticle'
import type { CurrentUser, KnowledgeArticle } from '../types'

type ArticleEditorMode = 'create' | 'edit'

type ArticleFormValue = {
  folder: string
  markdown: string
  title: string
}

type ArticleEditorFormProps = {
  article: KnowledgeArticle | null
  currentUser: CurrentUser
  existingGroups: string[]
  initialGroup?: string
  mode: ArticleEditorMode
  onCancel: () => void
  onDelete?: (articleId: string) => void
  onSubmit: (article: KnowledgeArticle) => Promise<void> | void
}

function createInitialForm(
  article: KnowledgeArticle | null,
  initialGroup?: string,
): ArticleFormValue {
  if (!article) {
    return {
      folder: initialGroup || getFallbackFolder(),
      markdown: '# Новая страница\n\nНачните писать здесь.',
      title: '',
    }
  }

  return {
    folder: article.group,
    markdown: articleToMarkdown(article),
    title: article.title,
  }
}

function getValidationErrors(formValue: ArticleFormValue) {
  const errors: string[] = []

  if (!formValue.title.trim()) {
    errors.push('Добавьте название страницы.')
  }

  if (!formValue.folder.trim()) {
    errors.push('Выберите или создайте папку.')
  }

  if (!formValue.markdown.trim()) {
    errors.push('Markdown-файл не должен быть пустым.')
  }

  return errors
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function ArticleEditorForm({
  article,
  currentUser,
  existingGroups,
  initialGroup,
  mode,
  onCancel,
  onDelete,
  onSubmit,
}: ArticleEditorFormProps) {
  const [formValue, setFormValue] = useState(() =>
    createInitialForm(article, initialGroup),
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const isCreateMode = mode === 'create'

  const updateField = (field: keyof ArticleFormValue, value: string) => {
    setFormValue((currentValue) => ({
      ...currentValue,
      [field]: value,
    }))
  }

  const submitMarkdownFile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextValidationErrors = getValidationErrors(formValue)

    if (nextValidationErrors.length > 0) {
      setValidationErrors(nextValidationErrors)
      return
    }

    const title = formValue.title.trim()
    const folder = formValue.folder.trim()
    const markdown = formValue.markdown.trim()
    const now = todayIsoDate()
    const nextArticle: KnowledgeArticle = {
      id: article?.id ?? '',
      access: article?.access ?? ['reader', 'editor', 'admin'],
      createdAt: article?.createdAt ?? now,
      description: markdownSummary(markdown, title),
      group: folder,
      owner: article?.owner ?? currentUser.name,
      ownerId: article?.ownerId ?? currentUser.id,
      sections: markdownToArticleSections(title, markdown),
      status: article?.status ?? 'published',
      tags: article?.tags.length ? article.tags : [createFolderTag(folder)],
      title,
      updatedAt: now,
    }

    setValidationErrors([])
    void onSubmit(nextArticle)
  }

  return (
    <form className="article-editor markdown-editor" onSubmit={submitMarkdownFile}>
      <header className="markdown-editor-header">
        <div className="markdown-file-label">
          <FileText aria-hidden="true" />
          <span>{formValue.title.trim() || 'untitled'}.md</span>
        </div>
        <Button onClick={onCancel} type="button" variant="ghost" size="icon-sm" aria-label="Закрыть редактор">
          <X aria-hidden="true" />
        </Button>
      </header>

      {validationErrors.length > 0 && (
        <div className="validation-summary" role="alert">
          <strong>Проверьте страницу</strong>
          <ul>
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="markdown-title-grid">
        <label className="editor-field">
          <span>Название страницы</span>
          <Input
            autoFocus
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Например: Регламент публикации"
            type="text"
            value={formValue.title}
          />
        </label>

        <label className="editor-field">
          <span>Папка</span>
          <Input
            list="article-groups"
            onChange={(event) => updateField('folder', event.target.value)}
            placeholder={getFallbackFolder()}
            type="text"
            value={formValue.folder}
          />
          <datalist id="article-groups">
            {existingGroups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="editor-field markdown-body-field">
        <span>Markdown</span>
        <Textarea
          onChange={(event) => updateField('markdown', event.target.value)}
          spellCheck="false"
          value={formValue.markdown}
        />
      </label>

      <footer className="markdown-editor-actions">
        {!isCreateMode && article && onDelete && (
          <Button variant="destructive" onClick={() => onDelete(article.id)} type="button">
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            <span>Удалить</span>
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} type="button">
          <X aria-hidden="true" data-icon="inline-start" />
          <span>Отмена</span>
        </Button>
        <Button type="submit">
          <Save aria-hidden="true" data-icon="inline-start" />
          <span>Сохранить .md</span>
        </Button>
      </footer>
    </form>
  )
}

export default ArticleEditorForm
