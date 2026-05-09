import { knowledgeArticles } from '../data/demoData'
import type { ArticleStatus, KnowledgeArticle, UserRole } from '../types'

const ARTICLE_STORAGE_KEY = 'rag-base/articles/v1'
const ARTICLE_STORE_VERSION = 1
const ARTICLE_STATUSES = new Set<ArticleStatus>(['draft', 'review', 'published'])
const USER_ROLES = new Set<UserRole>(['reader', 'editor', 'admin'])

type StoredArticles = {
  version: typeof ARTICLE_STORE_VERSION
  articles: KnowledgeArticle[]
}

type LegacyArticle = Partial<KnowledgeArticle> & {
  updated?: string
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function cloneArticles(articles: KnowledgeArticle[]) {
  return articles.map((article) => ({
    ...article,
    access: [...article.access],
    tags: [...article.tags],
    sections: article.sections.map((section) => ({
      ...section,
      paragraphs: [...section.paragraphs],
      bullets: section.bullets ? [...section.bullets] : undefined,
    })),
  }))
}

function normalizeDate(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  const trimmedValue = value.trim()
  const legacyDateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmedValue)

  if (legacyDateMatch) {
    const [, day, month, year] = legacyDateMatch
    return `${year}-${month}-${day}`
  }

  return trimmedValue
}

function normalizeStatus(value: unknown): ArticleStatus {
  return typeof value === 'string' && ARTICLE_STATUSES.has(value as ArticleStatus)
    ? (value as ArticleStatus)
    : 'published'
}

function normalizeAccess(value: unknown): UserRole[] {
  if (!Array.isArray(value)) {
    return ['editor', 'admin']
  }

  const roles = value.filter(
    (role): role is UserRole => typeof role === 'string' && USER_ROLES.has(role as UserRole),
  )

  return roles.length > 0 ? roles : ['editor', 'admin']
}

function normalizeArticle(value: unknown, index: number): KnowledgeArticle | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as LegacyArticle

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.group !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.owner !== 'string' ||
    !Array.isArray(candidate.tags) ||
    !Array.isArray(candidate.sections)
  ) {
    return null
  }

  const fallbackDate = '2026-05-08'
  const updatedAt = normalizeDate(candidate.updatedAt ?? candidate.updated, fallbackDate)

  return {
    id: candidate.id,
    group: candidate.group,
    title: candidate.title,
    description: candidate.description,
    owner: candidate.owner,
    ownerId:
      typeof candidate.ownerId === 'string' && candidate.ownerId.trim()
        ? candidate.ownerId
        : `seed-owner-${index}`,
    createdAt: normalizeDate(candidate.createdAt, updatedAt),
    updatedAt,
    status: normalizeStatus(candidate.status),
    access: normalizeAccess(candidate.access),
    tags: candidate.tags.filter((tag): tag is string => typeof tag === 'string'),
    sections: candidate.sections
      .filter(
        (section): section is KnowledgeArticle['sections'][number] =>
          !!section &&
          typeof section === 'object' &&
          typeof section.heading === 'string' &&
          Array.isArray(section.paragraphs),
      )
      .map((section) => ({
        heading: section.heading,
        paragraphs: section.paragraphs.filter(
          (paragraph): paragraph is string => typeof paragraph === 'string',
        ),
        bullets: Array.isArray(section.bullets)
          ? section.bullets.filter((bullet): bullet is string => typeof bullet === 'string')
          : undefined,
      })),
  }
}

export function getSeedArticles() {
  return cloneArticles(knowledgeArticles)
}

export function saveArticles(articles: KnowledgeArticle[]) {
  if (!hasLocalStorage()) {
    return
  }

  const storedArticles: StoredArticles = {
    version: ARTICLE_STORE_VERSION,
    articles,
  }

  window.localStorage.setItem(ARTICLE_STORAGE_KEY, JSON.stringify(storedArticles))
}

export function loadArticles() {
  if (!hasLocalStorage()) {
    return getSeedArticles()
  }

  try {
    const rawValue = window.localStorage.getItem(ARTICLE_STORAGE_KEY)

    if (!rawValue) {
      const seedArticles = getSeedArticles()
      saveArticles(seedArticles)
      return seedArticles
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredArticles> | KnowledgeArticle[]
    const articleCandidates = Array.isArray(parsedValue)
      ? parsedValue
      : Array.isArray(parsedValue.articles)
        ? parsedValue.articles
        : []
    const articles = articleCandidates
      .map((article, index) => normalizeArticle(article, index))
      .filter((article): article is KnowledgeArticle => Boolean(article))

    if (articles.length === 0) {
      const seedArticles = getSeedArticles()
      saveArticles(seedArticles)
      return seedArticles
    }

    saveArticles(articles)
    return articles
  } catch {
    const seedArticles = getSeedArticles()
    saveArticles(seedArticles)
    return seedArticles
  }
}

export function resetArticles() {
  const seedArticles = getSeedArticles()
  saveArticles(seedArticles)
  return seedArticles
}
