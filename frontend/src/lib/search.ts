import type { KnowledgeArticle, UserRole } from '../types'

export type HighlightSegment = {
  highlighted: boolean
  text: string
}

export type ArticleSearchResult = {
  article: KnowledgeArticle
  matchLabel: string
  snippet: HighlightSegment[]
  title: HighlightSegment[]
}

type SearchField = {
  label: string
  value: string
}

const FIELD_LABELS = {
  title: 'Название',
  description: 'Описание',
  group: 'Раздел',
  owner: 'Владелец',
  tags: 'Теги',
  sectionHeading: 'Заголовок раздела',
  paragraph: 'Текст статьи',
  bullet: 'Список',
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function matchesQuery(value: string, query: string) {
  return normalizeSearchValue(value).includes(query)
}

function collectArticleFields(article: KnowledgeArticle): SearchField[] {
  return [
    { label: FIELD_LABELS.title, value: article.title },
    { label: FIELD_LABELS.description, value: article.description },
    { label: FIELD_LABELS.group, value: article.group },
    { label: FIELD_LABELS.owner, value: article.owner },
    { label: FIELD_LABELS.tags, value: article.tags.join(', ') },
    ...article.sections.flatMap((section) => [
      { label: FIELD_LABELS.sectionHeading, value: section.heading },
      ...section.paragraphs.map((paragraph) => ({
        label: FIELD_LABELS.paragraph,
        value: paragraph,
      })),
      ...(section.bullets ?? []).map((bullet) => ({
        label: FIELD_LABELS.bullet,
        value: bullet,
      })),
    ]),
  ]
}

function createSnippet(value: string, normalizedQuery: string) {
  const trimmedValue = value.trim()
  const normalizedValue = normalizeSearchValue(trimmedValue)
  const matchIndex = normalizedValue.indexOf(normalizedQuery)

  if (matchIndex < 0 || trimmedValue.length <= 170) {
    return trimmedValue
  }

  const startIndex = Math.max(0, matchIndex - 52)
  const endIndex = Math.min(trimmedValue.length, matchIndex + normalizedQuery.length + 92)
  const prefix = startIndex > 0 ? '...' : ''
  const suffix = endIndex < trimmedValue.length ? '...' : ''

  return `${prefix}${trimmedValue.slice(startIndex, endIndex)}${suffix}`
}

export function canReadArticle(article: KnowledgeArticle, role: UserRole) {
  if (role === 'admin') {
    return true
  }

  if (article.status === 'published') {
    return true
  }

  return article.access.includes(role)
}

export function createHighlightSegments(value: string, query: string): HighlightSegment[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return [{ highlighted: false, text: value }]
  }

  const normalizedValue = value.toLocaleLowerCase('ru-RU')
  const segments: HighlightSegment[] = []
  let currentIndex = 0
  let matchIndex = normalizedValue.indexOf(normalizedQuery)

  while (matchIndex >= 0) {
    if (matchIndex > currentIndex) {
      segments.push({
        highlighted: false,
        text: value.slice(currentIndex, matchIndex),
      })
    }

    const matchEndIndex = matchIndex + normalizedQuery.length
    segments.push({
      highlighted: true,
      text: value.slice(matchIndex, matchEndIndex),
    })

    currentIndex = matchEndIndex
    matchIndex = normalizedValue.indexOf(normalizedQuery, currentIndex)
  }

  if (currentIndex < value.length) {
    segments.push({
      highlighted: false,
      text: value.slice(currentIndex),
    })
  }

  return segments.length > 0 ? segments : [{ highlighted: false, text: value }]
}

export function searchArticles(
  articles: KnowledgeArticle[],
  query: string,
  currentUserRole: UserRole,
): ArticleSearchResult[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return []
  }

  return articles
    .filter((article) => canReadArticle(article, currentUserRole))
    .flatMap((article) => {
      const matchedField = collectArticleFields(article).find((field) =>
        matchesQuery(field.value, normalizedQuery),
      )

      if (!matchedField) {
        return []
      }

      const snippet = createSnippet(matchedField.value, normalizedQuery)

      return [
        {
          article,
          matchLabel: matchedField.label,
          snippet: createHighlightSegments(snippet, query),
          title: createHighlightSegments(article.title, query),
        },
      ]
    })
}
