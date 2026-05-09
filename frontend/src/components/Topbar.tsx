import { ArrowRight, BookOpen, LogOut, UserCheck } from 'lucide-react'
import { navItems, roleLabels } from '../data/demoData'
import type { AuthMode, CurrentUser, NavItem } from '../types'

type TopbarProps = {
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenDocs: () => void
  onOpenLanding: () => void
  onSignOut: () => void
}

function Topbar({
  currentUser,
  onOpenAuth,
  onOpenDocs,
  onOpenLanding,
  onSignOut,
}: TopbarProps) {
  const handleNavItemClick = (item: NavItem) => {
    if (item.opensDocs) {
      onOpenDocs()
      return
    }

    onOpenLanding()

    const sectionId = item.sectionId

    window.setTimeout(() => {
      document.getElementById(sectionId ?? 'home')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  return (
    <header className="topbar" aria-label="Главная навигация">
      <button className="brand" onClick={onOpenLanding} type="button">
        <span className="brand-mark">R</span>
        <span>RAG Base</span>
      </button>

      <nav className="desktop-nav" aria-label="Разделы продукта">
        {navItems.map((item) => (
          <button key={item.label} onClick={() => handleNavItemClick(item)} type="button">
            {item.label}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        {currentUser ? (
          <>
            <button className="primary-button compact" onClick={onOpenDocs} type="button">
              <BookOpen aria-hidden="true" size={16} />
              <span>База</span>
            </button>
            <span className="user-chip">
              <UserCheck aria-hidden="true" size={15} />
              {roleLabels[currentUser.role]}
            </span>
            <button className="ghost-link icon-link" onClick={onSignOut} type="button">
              <LogOut aria-hidden="true" size={16} />
              <span>Выйти</span>
            </button>
          </>
        ) : (
          <>
            <button className="ghost-link" onClick={() => onOpenAuth('signin')} type="button">
              Войти
            </button>
            <button className="primary-button" onClick={() => onOpenAuth('signup')} type="button">
              <span>Начать</span>
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Topbar
