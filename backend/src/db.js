import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { demoUsers, roles, seedArticles } from './seedData.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const dataDir = join(currentDir, '..', 'data')

export const databasePath = process.env.DB_PATH ?? join(dataDir, 'rag-base.sqlite')

mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA foreign_keys = ON')

function parseJsonList(value) {
  if (!value) {
    return []
  }

  try {
    const parsedValue = JSON.parse(value)
    return Array.isArray(parsedValue) ? parsedValue.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function toApiArticle(articleRow) {
  const sections = db
    .prepare(
      `
      SELECT heading, paragraphs_json, bullets_json
      FROM article_sections
      WHERE article_id = ?
      ORDER BY position ASC
    `,
    )
    .all(articleRow.id)
    .map((section) => {
      const bullets = parseJsonList(section.bullets_json)

      return {
        heading: section.heading,
        paragraphs: parseJsonList(section.paragraphs_json),
        bullets: bullets.length > 0 ? bullets : undefined,
      }
    })

  return {
    id: articleRow.id,
    group: articleRow.group_name,
    title: articleRow.title,
    description: articleRow.description,
    owner: articleRow.owner_name,
    ownerId: articleRow.owner_id,
    createdAt: articleRow.created_at,
    updatedAt: articleRow.updated_at,
    status: articleRow.status,
    access: db
      .prepare(
        `
        SELECT role_id
        FROM article_access
        WHERE article_id = ?
        ORDER BY role_id ASC
      `,
      )
      .all(articleRow.id)
      .map((row) => row.role_id),
    tags: db
      .prepare(
        `
        SELECT tag
        FROM article_tags
        WHERE article_id = ?
        ORDER BY tag ASC
      `,
      )
      .all(articleRow.id)
      .map((row) => row.tag),
    sections,
  }
}

function runTransaction(action) {
  db.exec('BEGIN')

  try {
    const result = action()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function replaceArticleDetails(article) {
  db.prepare('DELETE FROM article_sections WHERE article_id = ?').run(article.id)
  db.prepare('DELETE FROM article_tags WHERE article_id = ?').run(article.id)
  db.prepare('DELETE FROM article_access WHERE article_id = ?').run(article.id)

  const insertSection = db.prepare(`
    INSERT INTO article_sections (article_id, position, heading, paragraphs_json, bullets_json)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertTag = db.prepare('INSERT INTO article_tags (article_id, tag) VALUES (?, ?)')
  const insertAccess = db.prepare('INSERT INTO article_access (article_id, role_id) VALUES (?, ?)')

  article.sections.forEach((section, index) => {
    insertSection.run(
      article.id,
      index,
      section.heading,
      JSON.stringify(section.paragraphs),
      JSON.stringify(section.bullets ?? []),
    )
  })

  article.tags.forEach((tag) => insertTag.run(article.id, tag))
  article.access.forEach((role) => insertAccess.run(article.id, role))
}

function upsertArticle(article) {
  db.prepare(`
    INSERT INTO articles (
      id,
      group_name,
      title,
      description,
      owner_id,
      owner_name,
      created_at,
      updated_at,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      group_name = excluded.group_name,
      title = excluded.title,
      description = excluded.description,
      owner_id = excluded.owner_id,
      owner_name = excluded.owner_name,
      updated_at = excluded.updated_at,
      status = excluded.status
  `).run(
    article.id,
    article.group,
    article.title,
    article.description,
    article.ownerId,
    article.owner,
    article.createdAt,
    article.updatedAt,
    article.status,
  )

  replaceArticleDetails(article)
  return getArticleById(article.id)
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role_id TEXT NOT NULL REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      group_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published'))
    );

    CREATE TABLE IF NOT EXISTS article_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      heading TEXT NOT NULL,
      paragraphs_json TEXT NOT NULL,
      bullets_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (article_id, tag)
    );

    CREATE TABLE IF NOT EXISTS article_access (
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id),
      PRIMARY KEY (article_id, role_id)
    );
  `)
}

export function seedDatabase({ reset = false } = {}) {
  runTransaction(() => {
    if (reset) {
      db.prepare('DELETE FROM articles').run()
      db.prepare('DELETE FROM users').run()
      db.prepare('DELETE FROM roles').run()
    }

    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count

    if (!reset && userCount > 0) {
      return
    }

    const insertRole = db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)')
    const insertUser = db.prepare('INSERT INTO users (id, name, email, role_id) VALUES (?, ?, ?, ?)')

    roles.forEach((role) => insertRole.run(role.id, role.name))
    demoUsers.forEach((user) => insertUser.run(user.id, user.name, user.email, user.role))
    seedArticles.forEach((article) => upsertArticle(article))
  })
}

export function listArticles() {
  return db
    .prepare(
      `
      SELECT
        articles.id,
        articles.group_name,
        articles.title,
        articles.description,
        articles.owner_id,
        articles.owner_name,
        articles.created_at,
        articles.updated_at,
        articles.status
      FROM articles
      ORDER BY articles.updated_at DESC, articles.title ASC
    `,
    )
    .all()
    .map(toApiArticle)
}

export function getArticleById(articleId) {
  const articleRow = db
    .prepare(
      `
      SELECT
        articles.id,
        articles.group_name,
        articles.title,
        articles.description,
        articles.owner_id,
        articles.owner_name,
        articles.created_at,
        articles.updated_at,
        articles.status
      FROM articles
      WHERE articles.id = ?
    `,
    )
    .get(articleId)

  return articleRow ? toApiArticle(articleRow) : null
}

export function saveArticle(article) {
  return runTransaction(() => upsertArticle(article))
}

export function deleteArticle(articleId) {
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(articleId)
  return result.changes > 0
}

export function getUserById(userId) {
  return db
    .prepare(
      `
      SELECT users.id, users.name, users.email, users.role_id AS role
      FROM users
      WHERE users.id = ?
    `,
    )
    .get(userId)
}

export function getUserByEmail(email) {
  return db
    .prepare(
      `
      SELECT users.id, users.name, users.email, users.role_id AS role
      FROM users
      WHERE LOWER(users.email) = LOWER(?)
    `,
    )
    .get(email)
}

export function getUserByRole(role) {
  return db
    .prepare(
      `
      SELECT users.id, users.name, users.email, users.role_id AS role
      FROM users
      WHERE users.role_id = ?
      ORDER BY users.id ASC
      LIMIT 1
    `,
    )
    .get(role)
}
