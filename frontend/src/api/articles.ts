import type { CurrentUser, KnowledgeArticle } from '../types'
import { apiRequest } from './client'

type ArticlesResponse = {
  articles: KnowledgeArticle[]
}

type ArticleResponse = {
  article: KnowledgeArticle
}

export async function fetchApiArticles(currentUser: CurrentUser) {
  const data = await apiRequest<ArticlesResponse>('/articles', {
    token: currentUser.id,
  })

  return data.articles
}

export async function createApiArticle(currentUser: CurrentUser, article: KnowledgeArticle) {
  const data = await apiRequest<ArticleResponse>('/articles', {
    body: article,
    method: 'POST',
    token: currentUser.id,
  })

  return data.article
}

export async function updateApiArticle(currentUser: CurrentUser, article: KnowledgeArticle) {
  const data = await apiRequest<ArticleResponse>(`/articles/${article.id}`, {
    body: article,
    method: 'PATCH',
    token: currentUser.id,
  })

  return data.article
}

export function deleteApiArticle(currentUser: CurrentUser, articleId: string) {
  return apiRequest<void>(`/articles/${articleId}`, {
    method: 'DELETE',
    token: currentUser.id,
  })
}
