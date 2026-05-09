import express from 'express'
import {
  deleteArticle,
  getArticleById,
  getUserByEmail,
  getUserById,
  getUserByRole,
  initDatabase,
  listArticles,
  saveArticle,
  seedDatabase,
} from './db.js'

const validRoles = new Set(['reader', 'editor', 'admin'])
const validStatuses = new Set(['draft', 'review', 'published'])
const defaultAccess = ['reader', 'editor', 'admin']
const port = Number(process.env.PORT ?? 4000)

initDatabase()
seedDatabase()

export const app = express()

app.use(express.json({ limit: '1mb' }))
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-User-Id')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeTextList(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalizedItems = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  return normalizedItems.length > 0 ? normalizedItems : fallback
}

function normalizeAccess(value, fallback = defaultAccess) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const roles = value.filter((role) => typeof role === 'string' && validRoles.has(role))
  return roles.length > 0 ? [...new Set(roles)] : fallback
}

function normalizeSections(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value.map((section) => ({
    heading: normalizeText(section?.heading),
    paragraphs: normalizeTextList(section?.paragraphs),
    bullets: normalizeTextList(section?.bullets, []),
  }))
}

function normalizeStatus(value, fallback = 'draft') {
  return typeof value === 'string' && validStatuses.has(value) ? value : fallback
}

function slugifyTitle(title) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedTitle || 'article'
}

function createUniqueArticleId(title) {
  const baseId = slugifyTitle(title)
  const existingIds = new Set(listArticles().map((article) => article.id))
  let candidateId = baseId
  let counter = 2

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${counter}`
    counter += 1
  }

  return candidateId
}

function canReadArticle(article, user) {
  if (user.role === 'admin') {
    return true
  }

  if (article.status === 'published') {
    return true
  }

  return article.access.includes(user.role)
}

function canWriteArticle(article, user) {
  if (user.role === 'admin') {
    return true
  }

  if (user.role !== 'editor') {
    return false
  }

  if (!article) {
    return true
  }

  return article.ownerId === user.id || article.access.includes(user.role)
}

function getRequestUser(request) {
  const authorization = request.get('authorization')
  const bearerUserId = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  const userId = request.get('x-user-id') ?? bearerUserId

  return userId ? getUserById(userId) : null
}

function requireUser(request, response, next) {
  const user = getRequestUser(request)

  if (!user) {
    response.status(401).json({ error: 'Auth required' })
    return
  }

  request.user = user
  next()
}

function validateArticle(article) {
  const errors = []

  if (!article.title) {
    errors.push('title is required')
  }

  if (!article.description) {
    errors.push('description is required')
  }

  if (!article.group) {
    errors.push('group is required')
  }

  if (!article.owner) {
    errors.push('owner is required')
  }

  if (!validStatuses.has(article.status)) {
    errors.push('status is invalid')
  }

  if (article.tags.length === 0) {
    errors.push('at least one tag is required')
  }

  if (article.access.length === 0) {
    errors.push('at least one access role is required')
  }

  if (article.sections.length === 0) {
    errors.push('at least one section is required')
  }

  article.sections.forEach((section, index) => {
    if (!section.heading) {
      errors.push(`section ${index + 1} heading is required`)
    }

    if (section.paragraphs.length === 0) {
      errors.push(`section ${index + 1} needs at least one paragraph`)
    }
  })

  return errors
}

function buildArticleFromPayload(payload, user, existingArticle = null) {
  const now = todayIsoDate()
  const status = normalizeStatus(payload.status, existingArticle?.status ?? 'draft')
  const requestedAccess = normalizeAccess(payload.access, existingArticle?.access ?? defaultAccess)

  return {
    id: existingArticle?.id ?? normalizeText(payload.id, createUniqueArticleId(payload.title ?? 'article')),
    group: normalizeText(payload.group, existingArticle?.group),
    title: normalizeText(payload.title, existingArticle?.title),
    description: normalizeText(payload.description, existingArticle?.description),
    owner: normalizeText(payload.owner, existingArticle?.owner ?? user.name),
    ownerId:
      user.role === 'admin'
        ? normalizeText(payload.ownerId, existingArticle?.ownerId ?? user.id)
        : (existingArticle?.ownerId ?? user.id),
    createdAt: existingArticle?.createdAt ?? normalizeText(payload.createdAt, now),
    updatedAt: now,
    status,
    access: user.role === 'admin' ? requestedAccess : (existingArticle?.access ?? defaultAccess),
    tags: normalizeTextList(payload.tags, existingArticle?.tags ?? []),
    sections: normalizeSections(payload.sections, existingArticle?.sections ?? []),
  }
}

function normalizeQuery(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ru-RU')
}

function collectSearchFields(article) {
  return [
    { field: 'title', sectionHeading: article.sections[0]?.heading ?? 'Статья', value: article.title },
    {
      field: 'description',
      sectionHeading: article.sections[0]?.heading ?? 'Статья',
      value: article.description,
    },
    { field: 'group', sectionHeading: article.sections[0]?.heading ?? 'Статья', value: article.group },
    { field: 'owner', sectionHeading: article.sections[0]?.heading ?? 'Статья', value: article.owner },
    { field: 'tags', sectionHeading: article.sections[0]?.heading ?? 'Статья', value: article.tags.join(', ') },
    ...article.sections.flatMap((section) => [
      { field: 'sectionHeading', sectionHeading: section.heading, value: section.heading },
      ...section.paragraphs.map((paragraph) => ({
        field: 'paragraph',
        sectionHeading: section.heading,
        value: paragraph,
      })),
    ]),
  ]
}

function searchReadableArticles(articles, query) {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return []
  }

  return articles.flatMap((article) => {
    const matchedField = collectSearchFields(article).find((field) =>
      normalizeQuery(field.value).includes(normalizedQuery),
    )

    return matchedField ? [{ article, match: matchedField }] : []
  })
}

function buildAnswerFromResults(question, results) {
  if (results.length === 0) {
    return {
      answer:
        'По доступным статьям не нашлось уверенного ответа. Попробуйте уточнить вопрос или проверьте права доступа.',
      sources: [],
    }
  }

  const sources = results.slice(0, 3).map((result) => ({
    articleId: result.article.id,
    sectionHeading: result.match.sectionHeading,
    title: result.article.title,
  }))
  const sourceTitles = sources.map((source) => source.title).join(', ')

  return {
    answer: `По запросу “${question}” ближе всего подходят материалы: ${sourceTitles}. Это черновой ответ по поисковому индексу, без LLM-обобщения.`,
    sources,
  }
}

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/auth/login', (request, response) => {
  const email = normalizeText(request.body?.email)
  const role = normalizeText(request.body?.role)
  const user = email ? getUserByEmail(email) : getUserByRole(role)

  if (!user) {
    response.status(401).json({ error: 'Demo user not found' })
    return
  }

  response.json({ token: user.id, user })
})

app.get('/me', requireUser, (request, response) => {
  response.json({ user: request.user })
})

app.get('/articles', requireUser, (request, response) => {
  const articles = listArticles().filter((article) => canReadArticle(article, request.user))
  response.json({ articles })
})

app.get('/articles/:articleId', requireUser, (request, response) => {
  const article = getArticleById(request.params.articleId)

  if (!article) {
    response.status(404).json({ error: 'Article not found' })
    return
  }

  if (!canReadArticle(article, request.user)) {
    response.status(403).json({ error: 'Article is not available for this role' })
    return
  }

  response.json({ article })
})

app.post('/articles', requireUser, (request, response) => {
  if (!canWriteArticle(null, request.user)) {
    response.status(403).json({ error: 'Only editor and admin can create articles' })
    return
  }

  const article = buildArticleFromPayload(request.body ?? {}, request.user)
  const errors = validateArticle(article)

  if (errors.length > 0) {
    response.status(400).json({ errors })
    return
  }

  response.status(201).json({ article: saveArticle(article) })
})

app.patch('/articles/:articleId', requireUser, (request, response) => {
  const existingArticle = getArticleById(request.params.articleId)

  if (!existingArticle) {
    response.status(404).json({ error: 'Article not found' })
    return
  }

  if (!canWriteArticle(existingArticle, request.user)) {
    response.status(403).json({ error: 'Article cannot be edited by this role' })
    return
  }

  const article = buildArticleFromPayload(request.body ?? {}, request.user, existingArticle)
  const errors = validateArticle(article)

  if (errors.length > 0) {
    response.status(400).json({ errors })
    return
  }

  response.json({ article: saveArticle(article) })
})

app.delete('/articles/:articleId', requireUser, (request, response) => {
  const article = getArticleById(request.params.articleId)

  if (!article) {
    response.status(404).json({ error: 'Article not found' })
    return
  }

  if (!canWriteArticle(article, request.user)) {
    response.status(403).json({ error: 'Article cannot be deleted by this role' })
    return
  }

  deleteArticle(article.id)
  response.sendStatus(204)
})

app.get('/search', requireUser, (request, response) => {
  const articles = listArticles().filter((article) => canReadArticle(article, request.user))
  const results = searchReadableArticles(articles, request.query.q)

  response.json({ query: String(request.query.q ?? ''), results })
})

app.post('/ask', requireUser, (request, response) => {
  const question = normalizeText(request.body?.question)

  if (!question) {
    response.status(400).json({ error: 'question is required' })
    return
  }

  const articles = listArticles().filter((article) => canReadArticle(article, request.user))
  const results = searchReadableArticles(articles, question)

  response.json({
    question,
    ...buildAnswerFromResults(question, results),
  })
})

app.use((error, _request, response, _next) => {
  response.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`RAG Base API is running on http://127.0.0.1:${port}`)
  })
}
