import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CurrentUser } from '../types'

type TopbarProps = {
  currentUser: CurrentUser | null
  onOpenBases: () => void
  onSignOut: () => void
}

function Topbar({
  currentUser,
  onOpenBases,
  onSignOut,
}: TopbarProps) {
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

export default Topbar
