import type { CurrentUser, KnowledgeArticle } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000'

type ArticlesResponse = {
  articles?: KnowledgeArticle[]
}

export async function fetchApiArticles(currentUser: CurrentUser) {
  const response = await fetch(`${API_BASE_URL}/articles`, {
    headers: {
      'x-user-id': currentUser.id,
    },
  })

  if (!response.ok) {
    throw new Error(`API articles request failed with status ${response.status}`)
  }

  const data = (await response.json()) as ArticlesResponse

  if (!Array.isArray(data.articles)) {
    throw new Error('API articles response is invalid')
  }

  return data.articles
}
