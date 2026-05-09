import type { KnowledgeArticle } from '../types'

export function groupArticlesByGroup(articles: KnowledgeArticle[]) {
  return articles.reduce<Record<string, KnowledgeArticle[]>>((groups, article) => {
    const groupArticles = groups[article.group] ?? []

    return {
      ...groups,
      [article.group]: [...groupArticles, article],
    }
  }, {})
}

export function formatArticleDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
