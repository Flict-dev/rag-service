export type View = 'landing' | 'auth' | 'docs'
export type AuthMode = 'signin' | 'signup'
export type UserRole = 'reader' | 'editor' | 'admin'

export type CurrentUser = {
  name: string
  email: string
  role: UserRole
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
  updated: string
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
