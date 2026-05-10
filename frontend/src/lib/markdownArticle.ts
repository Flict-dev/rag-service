import type { ArticleSection, KnowledgeArticle } from '../types'

const fallbackFolder = 'Документация'

function normalizeLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

function slugifyValue(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'docs'
}

export function getFallbackFolder() {
  return fallbackFolder
}

export function createFolderTag(folder: string) {
  return slugifyValue(folder)
}

export function articleToMarkdown(article: KnowledgeArticle) {
  if (
    article.sections.length === 1 &&
    article.sections[0]?.heading === article.title &&
    article.sections[0]?.paragraphs.length === 1
  ) {
    return normalizeLines(article.sections[0].paragraphs[0])
  }

  const markdown = article.sections
    .map((section) => {
      const blocks = [section.heading ? `## ${section.heading}` : '', ...section.paragraphs].filter(
        Boolean,
      )
      const bulletBlock = section.bullets?.map((bullet) => `- ${bullet}`).join('\n')

      if (bulletBlock) {
        blocks.push(bulletBlock)
      }

      return blocks.join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n')

  return normalizeLines(markdown)
}

export function markdownToArticleSections(title: string, markdown: string): ArticleSection[] {
  const content = normalizeLines(markdown)

  return [
    {
      heading: title.trim() || 'Страница',
      paragraphs: [content || '# Страница'],
    },
  ]
}

export function markdownSummary(markdown: string, title: string) {
  const firstContentLine = markdown
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '').trim())
    .find(Boolean)

  return firstContentLine ?? title.trim() ?? 'Markdown-страница'
}
