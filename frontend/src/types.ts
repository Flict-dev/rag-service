export type AuthMode = 'signin' | 'signup'
export type UserRole = 'reader' | 'editor' | 'admin'
export type ArticleStatus = 'draft' | 'review' | 'published'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type AuthSession = {
  token: string
  user: CurrentUser
}

export type ArticleSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type KnowledgeArticle = {
  id: string
  group: string
  title: string
  description: string
  owner: string
  ownerId: string
  createdAt: string
  updatedAt: string
  status: ArticleStatus
  access: UserRole[]
  tags: string[]
  sections: ArticleSection[]
}

export type EditorAccess = {
  name: string
  role: UserRole
  scope: string
  status: string
}

export type NavItem = {
  label: string
  sectionId?: string
  opensDocs?: boolean
}
