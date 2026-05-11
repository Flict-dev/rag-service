import type {
  BaseRole,
  IngestionJob,
  KnowledgeBase,
  KnowledgeBaseMember,
  KnowledgePage,
  KnowledgeSection,
} from '../types'
import { apiRequest } from './client'

type BasesResponse = {
  bases: KnowledgeBase[]
}

type BaseResponse = {
  base: KnowledgeBase
}

type SectionResponse = {
  section: KnowledgeSection
}

type PageResponse = {
  job?: IngestionJob
  page: KnowledgePage
}

type MemberResponse = {
  member: KnowledgeBaseMember
}

export async function fetchKnowledgeBasesApi(token: string) {
  const data = await apiRequest<BasesResponse>('/knowledge-bases', { token })
  return data.bases
}

export async function fetchKnowledgeBaseApi(token: string, baseId: string) {
  const data = await apiRequest<BaseResponse>(`/knowledge-bases/${baseId}`, { token })
  return data.base
}

export async function createKnowledgeBaseApi(token: string, title: string) {
  const data = await apiRequest<BaseResponse>('/knowledge-bases', {
    body: { title },
    method: 'POST',
    token,
  })
  return data.base
}

export async function createKnowledgeSectionApi(token: string, baseId: string, title: string) {
  const data = await apiRequest<SectionResponse>(`/knowledge-bases/${baseId}/sections`, {
    body: { title },
    method: 'POST',
    token,
  })
  return data.section
}

export async function createKnowledgePageApi(
  token: string,
  baseId: string,
  sectionId: string | undefined,
  title: string,
) {
  const data = await apiRequest<PageResponse>(`/knowledge-bases/${baseId}/pages`, {
    body: { sectionId, title },
    method: 'POST',
    token,
  })
  return data.page
}

export async function updateKnowledgePageApi(
  token: string,
  baseId: string,
  pageId: string,
  payload: Partial<Pick<KnowledgePage, 'contentMd' | 'sectionId' | 'title'>>,
) {
  const data = await apiRequest<PageResponse>(`/knowledge-bases/${baseId}/pages/${pageId}`, {
    body: payload,
    method: 'PATCH',
    token,
  })
  return data.page
}

export async function inviteKnowledgeBaseMemberApi(token: string, baseId: string, email: string) {
  const data = await apiRequest<MemberResponse>(`/knowledge-bases/${baseId}/members`, {
    body: { email },
    method: 'POST',
    token,
  })
  return data.member
}

export async function updateKnowledgeBaseMemberRoleApi(
  token: string,
  baseId: string,
  userId: string,
  role: BaseRole,
) {
  const data = await apiRequest<MemberResponse>(`/knowledge-bases/${baseId}/members/${userId}`, {
    body: { role },
    method: 'PATCH',
    token,
  })
  return data.member
}
