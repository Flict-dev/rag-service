import type { NavItem } from '../types'

export const navItems: NavItem[] = [
  { label: 'Продукт', sectionId: 'home' },
  { label: 'Работа с базой', sectionId: 'workspace' },
  { label: 'Markdown', sectionId: 'markdown' },
  { label: 'Базы знаний', opensBases: true },
]

export const productTeams = ['Поддержка', 'Продукт', 'Операции', 'HR', 'Юристы']

export const productStats = [
  {
    label: 'локальные markdown-файлы в базе',
    value: '.md',
  },
  {
    label: 'быстрый чат-поиск по текущей базе',
    value: 'AI',
  },
]

export const featureCards = [
  {
    title: 'Базы вместо админки',
    description:
      'После входа пользователь видит только список баз знаний и рабочие документы. Никаких лишних панелей.',
  },
  {
    title: 'Файлы как markdown',
    description:
      'Каждая страница хранится как простой markdown-текст: его легко читать, редактировать и индексировать позже.',
  },
  {
    title: 'Поиск рядом с текстом',
    description:
      'Чат открывается правым столбцом внутри базы и ищет источники по текущим markdown-файлам.',
  },
]

export const docSections = ['Начало', 'Процессы', 'FAQ', 'Инструкции']
