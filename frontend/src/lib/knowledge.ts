import type { KnowledgeBase, KnowledgePage, KnowledgeSection } from '../types'

export type KnowledgeSearchResult = {
  excerpt: string
  page: KnowledgePage
  section: KnowledgeSection | null
}

export function getBaseSection(base: KnowledgeBase, sectionId: string | undefined) {
  return base.sections.find((section) => section.id === sectionId) ?? null
}

export function getBasePage(base: KnowledgeBase, pageId: string | undefined) {
  return base.pages.find((page) => page.id === pageId) ?? null
}

export function getSectionPages(base: KnowledgeBase, sectionId: string) {
  return base.pages.filter((page) => page.sectionId === sectionId)
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function pageSummary(page: KnowledgePage) {
  const summary = stripMarkdown(page.contentMd)
  return summary.length > 150 ? `${summary.slice(0, 147)}...` : summary || 'Пустой markdown-файл.'
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function createExcerpt(markdown: string, query: string) {
  const text = stripMarkdown(markdown)
  const normalizedText = normalizeSearchValue(text)
  const normalizedQuery = normalizeSearchValue(query)
  const index = normalizedText.indexOf(normalizedQuery)

  if (index < 0) {
    return text.length > 180 ? `${text.slice(0, 177)}...` : text
  }

  const start = Math.max(0, index - 60)
  const end = Math.min(text.length, index + normalizedQuery.length + 120)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return `${prefix}${text.slice(start, end)}${suffix}`
}

export function searchKnowledgeBase(base: KnowledgeBase, query: string): KnowledgeSearchResult[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return []
  }

  return base.pages
    .filter((page) => {
      const haystack = normalizeSearchValue(`${page.title} ${stripMarkdown(page.contentMd)}`)
      return haystack.includes(normalizedQuery)
    })
    .map((page) => ({
      excerpt: createExcerpt(page.contentMd, query),
      page,
      section: getBaseSection(base, page.sectionId),
    }))
}
