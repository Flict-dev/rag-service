import type { IngestionJob, KnowledgeDocument } from '../types'
import { apiFormRequest, apiRequest } from './client'

type DocumentsResponse = {
  documents: KnowledgeDocument[]
}

type UploadDocumentResponse = {
  document: KnowledgeDocument
  job: IngestionJob
}

export async function fetchApiDocuments(token: string) {
  const data = await apiRequest<DocumentsResponse>('/documents', {
    token,
  })

  return data.documents
}

export async function fetchBaseDocumentsApi(token: string, baseId: string) {
  const data = await apiRequest<DocumentsResponse>(`/knowledge-bases/${baseId}/documents`, {
    token,
  })

  return data.documents
}

export async function uploadApiDocument(token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiFormRequest<UploadDocumentResponse>('/documents', formData, token)
}

export async function uploadBaseDocumentApi(token: string, baseId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiFormRequest<UploadDocumentResponse>(`/knowledge-bases/${baseId}/documents`, formData, token)
}
