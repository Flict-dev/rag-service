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

export function searchArticles(articles: KnowledgeArticle[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return articles
  }

  return articles.filter((article) =>
    [article.title, article.description, article.group, article.owner, article.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}
