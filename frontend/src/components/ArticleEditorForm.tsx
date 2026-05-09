import { useState } from 'react'
import { Save, Send, Trash2, X } from 'lucide-react'
import { articleStatusLabels, roleLabels } from '../data/demoData'
import type { ArticleStatus, CurrentUser, KnowledgeArticle, UserRole } from '../types'

type ArticleEditorMode = 'create' | 'edit'
type SubmitIntent = Extract<ArticleStatus, 'draft' | 'published'>

type SectionFormValue = {
  id: string
  heading: string
  paragraphs: string
  bullets: string
}

type ArticleFormValue = {
  title: string
  description: string
  group: string
  owner: string
  tags: string
  access: UserRole[]
  sections: SectionFormValue[]
}

type ArticleEditorFormProps = {
  article: KnowledgeArticle | null
  canManageAccess: boolean
  currentUser: CurrentUser
  existingGroups: string[]
  mode: ArticleEditorMode
  onCancel: () => void
  onDelete?: (articleId: string) => void
  onSubmit: (article: KnowledgeArticle, status: SubmitIntent) => void
}

const editableRoles: UserRole[] = ['reader', 'editor', 'admin']

function createSectionId(index: number) {
  return `section-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`
}

function createEmptySection(index = 0): SectionFormValue {
  return {
    id: createSectionId(index),
    heading: '',
    paragraphs: '',
    bullets: '',
  }
}

function formatTextList(value: string[]) {
  return value.join('\n')
}

function parseCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseLineList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function createInitialForm(
  article: KnowledgeArticle | null,
  currentUser: CurrentUser,
): ArticleFormValue {
  if (!article) {
    return {
      title: '',
      description: '',
      group: '',
      owner: currentUser.name,
      tags: '',
      access: ['reader', 'editor', 'admin'],
      sections: [createEmptySection()],
    }
  }

  return {
    title: article.title,
    description: article.description,
    group: article.group,
    owner: article.owner,
    tags: article.tags.join(', '),
    access: [...article.access],
    sections: article.sections.map((section, index) => ({
      id: createSectionId(index),
      heading: section.heading,
      paragraphs: formatTextList(section.paragraphs),
      bullets: formatTextList(section.bullets ?? []),
    })),
  }
}

function getValidationErrors(formValue: ArticleFormValue) {
  const errors: string[] = []
  const normalizedSections = formValue.sections.map((section) => ({
    heading: section.heading.trim(),
    paragraphs: parseLineList(section.paragraphs),
    bullets: parseLineList(section.bullets),
  }))

  if (!formValue.title.trim()) {
    errors.push('Добавьте название статьи.')
  }

  if (!formValue.description.trim()) {
    errors.push('Добавьте краткое описание.')
  }

  if (!formValue.group.trim()) {
    errors.push('Укажите раздел базы знаний.')
  }

  if (!formValue.owner.trim()) {
    errors.push('Укажите владельца статьи.')
  }

  if (parseCommaList(formValue.tags).length === 0) {
    errors.push('Добавьте хотя бы один тег через запятую.')
  }

  if (formValue.access.length === 0) {
    errors.push('Выберите хотя бы одну роль доступа.')
  }

  if (normalizedSections.length === 0) {
    errors.push('Добавьте хотя бы один раздел статьи.')
  }

  normalizedSections.forEach((section, index) => {
    const sectionNumber = index + 1

    if (!section.heading) {
      errors.push(`Раздел ${sectionNumber}: добавьте заголовок.`)
    }

    if (section.paragraphs.length === 0) {
      errors.push(`Раздел ${sectionNumber}: добавьте хотя бы один абзац.`)
    }
  })

  return errors
}

function ArticleEditorForm({
  article,
  canManageAccess,
  currentUser,
  existingGroups,
  mode,
  onCancel,
  onDelete,
  onSubmit,
}: ArticleEditorFormProps) {
  const [formValue, setFormValue] = useState(() => createInitialForm(article, currentUser))
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const isCreateMode = mode === 'create'

  const updateField = (field: keyof Omit<ArticleFormValue, 'sections' | 'access'>, value: string) => {
    setFormValue((currentValue) => ({
      ...currentValue,
      [field]: value,
    }))
  }

  const updateSection = (
    sectionId: string,
    field: keyof Omit<SectionFormValue, 'id'>,
    value: string,
  ) => {
    setFormValue((currentValue) => ({
      ...currentValue,
      sections: currentValue.sections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    }))
  }

  const toggleAccessRole = (role: UserRole, checked: boolean) => {
    if (!canManageAccess) {
      return
    }

    setFormValue((currentValue) => {
      const nextAccess = checked
        ? [...currentValue.access, role]
        : currentValue.access.filter((accessRole) => accessRole !== role)

      return {
        ...currentValue,
        access: editableRoles.filter((accessRole) => nextAccess.includes(accessRole)),
      }
    })
  }

  const addSection = () => {
    setFormValue((currentValue) => ({
      ...currentValue,
      sections: [...currentValue.sections, createEmptySection(currentValue.sections.length)],
    }))
  }

  const removeSection = (sectionId: string) => {
    setFormValue((currentValue) => ({
      ...currentValue,
      sections:
        currentValue.sections.length > 1
          ? currentValue.sections.filter((section) => section.id !== sectionId)
          : currentValue.sections,
    }))
  }

  const submitArticle = (status: SubmitIntent) => {
    const nextValidationErrors = getValidationErrors(formValue)

    if (nextValidationErrors.length > 0) {
      setValidationErrors(nextValidationErrors)
      return
    }

    const normalizedSections = formValue.sections.map((section) => {
      const bullets = parseLineList(section.bullets)

      return {
        heading: section.heading.trim(),
        paragraphs: parseLineList(section.paragraphs),
        bullets: bullets.length > 0 ? bullets : undefined,
      }
    })

    const now = todayIsoDate()
    const nextArticle: KnowledgeArticle = {
      id: article?.id ?? '',
      group: formValue.group.trim(),
      title: formValue.title.trim(),
      description: formValue.description.trim(),
      owner: formValue.owner.trim(),
      ownerId: article?.ownerId ?? currentUser.id,
      createdAt: article?.createdAt ?? now,
      updatedAt: now,
      status,
      access: canManageAccess ? formValue.access : (article?.access ?? formValue.access),
      tags: parseCommaList(formValue.tags),
      sections: normalizedSections,
    }

    setValidationErrors([])
    onSubmit(nextArticle, status)
  }

  return (
    <form className="article-editor" onSubmit={(event) => event.preventDefault()}>
      <div className="editor-title-row">
        <div>
          <span className="eyebrow">{isCreateMode ? 'Новая статья' : 'Редактирование'}</span>
          <h1>{isCreateMode ? 'Создать материал' : article?.title}</h1>
          <p>
            {isCreateMode
              ? 'Заполните структуру, сохраните черновик или сразу опубликуйте статью.'
              : `Текущий статус: ${article ? articleStatusLabels[article.status] : 'черновик'}.`}
          </p>
        </div>
        <button className="icon-button" onClick={onCancel} type="button" aria-label="Закрыть форму">
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div className="validation-summary" role="alert">
          <strong>Проверьте форму</strong>
          <ul>
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-grid">
        <label className="editor-field">
          <span>Название</span>
          <input
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Например: Регламент публикации"
            type="text"
            value={formValue.title}
          />
        </label>

        <label className="editor-field">
          <span>Раздел</span>
          <input
            list="article-groups"
            onChange={(event) => updateField('group', event.target.value)}
            placeholder="Материалы"
            type="text"
            value={formValue.group}
          />
          <datalist id="article-groups">
            {existingGroups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>

        <label className="editor-field editor-field-wide">
          <span>Описание</span>
          <textarea
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Коротко объясните, когда и кому нужна эта статья."
            rows={3}
            value={formValue.description}
          />
        </label>

        <label className="editor-field">
          <span>Владелец</span>
          <input
            onChange={(event) => updateField('owner', event.target.value)}
            placeholder="Имя владельца процесса"
            type="text"
            value={formValue.owner}
          />
        </label>

        <label className="editor-field">
          <span>Теги</span>
          <input
            onChange={(event) => updateField('tags', event.target.value)}
            placeholder="publish, workflow, docs"
            type="text"
            value={formValue.tags}
          />
        </label>
      </div>

      <fieldset className="editor-fieldset">
        <legend>Роли доступа</legend>
        <div className="access-role-grid">
          {editableRoles.map((role) => (
            <label className="access-role-option" key={role}>
              <input
                checked={formValue.access.includes(role)}
                disabled={!canManageAccess}
                onChange={(event) => toggleAccessRole(role, event.target.checked)}
                type="checkbox"
              />
              <span>{roleLabels[role]}</span>
            </label>
          ))}
        </div>
        {!canManageAccess && <small>Менять доступы может только администратор.</small>}
      </fieldset>

      <div className="sections-editor">
        <div className="sections-editor-heading">
          <div>
            <span className="eyebrow">Содержимое</span>
            <h2>Разделы статьи</h2>
          </div>
          <button className="secondary-button compact" onClick={addSection} type="button">
            Добавить раздел
          </button>
        </div>

        {formValue.sections.map((section, index) => (
          <section className="section-editor-card" key={section.id}>
            <div className="section-editor-top">
              <strong>Раздел {index + 1}</strong>
              <button
                disabled={formValue.sections.length === 1}
                onClick={() => removeSection(section.id)}
                type="button"
              >
                Удалить
              </button>
            </div>

            <label className="editor-field">
              <span>Заголовок</span>
              <input
                onChange={(event) => updateSection(section.id, 'heading', event.target.value)}
                placeholder="Например: Проверка перед публикацией"
                type="text"
                value={section.heading}
              />
            </label>

            <label className="editor-field">
              <span>Абзацы</span>
              <textarea
                onChange={(event) => updateSection(section.id, 'paragraphs', event.target.value)}
                placeholder="Каждый абзац с новой строки"
                rows={5}
                value={section.paragraphs}
              />
            </label>

            <label className="editor-field">
              <span>Список</span>
              <textarea
                onChange={(event) => updateSection(section.id, 'bullets', event.target.value)}
                placeholder="Необязательные пункты, каждый с новой строки"
                rows={3}
                value={section.bullets}
              />
            </label>
          </section>
        ))}
      </div>

      <div className="editor-actions">
        {!isCreateMode && article && onDelete && (
          <button className="danger-button" onClick={() => onDelete(article.id)} type="button">
            <Trash2 aria-hidden="true" size={16} />
            <span>Удалить</span>
          </button>
        )}
        <span />
        <button className="secondary-button" onClick={() => submitArticle('draft')} type="button">
          <Save aria-hidden="true" size={16} />
          <span>Сохранить черновик</span>
        </button>
        <button className="primary-button" onClick={() => submitArticle('published')} type="button">
          <Send aria-hidden="true" size={16} />
          <span>Опубликовать</span>
        </button>
      </div>
    </form>
  )
}

export default ArticleEditorForm
