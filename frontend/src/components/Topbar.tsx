import { ArrowRight, BookOpen, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navItems } from '../data/demoData'
import type { AuthMode, CurrentUser, NavItem } from '../types'

type TopbarProps = {
  currentUser: CurrentUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenBases: () => void
  onOpenLanding: () => void
  onSignOut: () => void
  variant?: 'app' | 'landing'
}

function Topbar({
  currentUser,
  onOpenAuth,
  onOpenBases,
  onOpenLanding,
  onSignOut,
  variant = 'landing',
}: TopbarProps) {
  if (variant === 'app') {
    return (
      <header className="topbar app-topbar" aria-label="Профиль пользователя">
        <button
          aria-label="Открыть список баз"
          className="brand"
          onClick={onOpenBases}
          type="button"
        >
          <span className="brand-mark">R</span>
          <span>RAG Base</span>
        </button>

        <div className="topbar-actions app-topbar-actions">
          {currentUser ? (
            <>
              <span className="user-chip" title={currentUser.email}>{currentUser.name}</span>
              <Button onClick={onSignOut} type="button" variant="ghost">
                <LogOut aria-hidden="true" data-icon="inline-start" />
                Выйти
              </Button>
            </>
          ) : null}
        </div>
      </header>
    )
  }

  const handleNavItemClick = (item: NavItem) => {
    if (item.opensBases) {
      onOpenBases()
      return
    }

    onOpenLanding()

    window.setTimeout(() => {
      document.getElementById(item.sectionId ?? 'home')?.scrollIntoView({
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
            <Button onClick={onOpenBases} type="button">
              <BookOpen aria-hidden="true" data-icon="inline-start" />
              Базы
            </Button>
            <span className="user-chip">{currentUser.name}</span>
            <Button onClick={onSignOut} type="button" variant="ghost">
              <LogOut aria-hidden="true" data-icon="inline-start" />
              Выйти
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => onOpenAuth('signin')} type="button" variant="ghost">
              Войти
            </Button>
            <Button onClick={() => onOpenAuth('signup')} type="button">
              Начать
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

export default Topbar
