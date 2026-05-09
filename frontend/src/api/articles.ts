import type { KnowledgeArticle } from '../types'
import { apiRequest } from './client'

type ArticlesResponse = {
  articles: KnowledgeArticle[]
}

type ArticleResponse = {
  article: KnowledgeArticle
}

export async function fetchApiArticles(token: string) {
  const data = await apiRequest<ArticlesResponse>('/articles', {
    token,
  })

  return data.articles
}

export async function createApiArticle(token: string, article: KnowledgeArticle) {
  const data = await apiRequest<ArticleResponse>('/articles', {
    body: article,
    method: 'POST',
    token,
  })

  return data.article
}

export async function updateApiArticle(token: string, article: KnowledgeArticle) {
  const data = await apiRequest<ArticleResponse>(`/articles/${article.id}`, {
    body: article,
    method: 'PATCH',
    token,
  })

  return data.article
}

export function deleteApiArticle(token: string, articleId: string) {
  return apiRequest<void>(`/articles/${articleId}`, {
    method: 'DELETE',
    token,
  })
}
