import type { CurrentUser } from '../types'
import { apiRequest } from './client'

export type AskSource = {
  articleId: string
  sectionHeading: string
  title: string
}

export type AskResponse = {
  answer: string
  question: string
  sources: AskSource[]
}

export function askApi(currentUser: CurrentUser, question: string) {
  return apiRequest<AskResponse>('/ask', {
    body: { question },
    method: 'POST',
    token: currentUser.id,
  })
}
