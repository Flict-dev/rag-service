import { apiRequest } from './client'

type ArticleAskSource = {
  articleId: string
  sectionHeading: string
  title: string
}

type DocumentAskSource = {
  documentId: string
  sectionHeading: string
  title: string
}

export type AskSource = ArticleAskSource | DocumentAskSource

export type AskResponse = {
  answer: string
  question: string
  sources: AskSource[]
}

export function askApi(token: string, question: string) {
  return apiRequest<AskResponse>('/ask', {
    body: { question },
    method: 'POST',
    token,
  })
}
