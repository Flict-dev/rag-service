export type AuthMode = 'signin' | 'signup'
export type BaseRole = 'admin' | 'editor' | 'reader'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: BaseRole
}

export type AuthSession = {
  token: string
  user: CurrentUser
}

export type LocalAccount = CurrentUser & {
  password: string
}

export type KnowledgePage = {
  id: string
  sectionId: string
  title: string
  contentMd: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeSection = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeBaseMember = {
  userId: string
  name: string
  email: string
  role: BaseRole
  createdAt: string
  updatedAt: string
  isOwner: boolean
}

export type KnowledgeBase = {
  id: string
  title: string
  ownerId: string
  ownerName: string
  myRole: BaseRole
  members: KnowledgeBaseMember[]
  createdAt: string
  updatedAt: string
  sections: KnowledgeSection[]
  pages: KnowledgePage[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  sources?: AskSource[]
  text: string
  sourcePageIds?: string[]
}

export type CreateTarget =
  | {
      parentSectionId?: string
      type: 'page'
    }
  | {
      parentSectionId?: string
      type: 'section'
    }

export type DocumentStatus = 'queued' | 'processing' | 'indexed' | 'failed'
export type IngestionJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type KnowledgeDocument = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  storagePath: string
  uploadedBy: string
  uploadedAt: string
  status: DocumentStatus
  metadata: Record<string, unknown>
}

export type IngestionJob = {
  id: string
  documentId: string
  status: IngestionJobStatus
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

export type AskSource = {
  excerpt?: string
  score?: number
  sectionHeading: string
  sourceId: string
  sourceType: 'document' | 'page'
  title: string
}
