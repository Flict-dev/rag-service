import type { AskSource } from '../types'
import { apiRequest } from './client'

export type AskResponse = {
  answer: string
  confidence?: number
  question: string
  sources: AskSource[]
  threadId?: string
  traceId?: string
  warning?: string
}

export function askApi(token: string, question: string) {
  return apiRequest<AskResponse>('/ask', {
    body: { question },
    method: 'POST',
    token,
  })
}

export function askKnowledgeBaseApi(token: string, baseId: string, question: string, threadId?: string) {
  return apiRequest<AskResponse>(`/knowledge-bases/${baseId}/ask`, {
    body: { question, threadId },
    method: 'POST',
    token,
  })
}
