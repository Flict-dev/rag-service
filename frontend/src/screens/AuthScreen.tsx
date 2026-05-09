import type { FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { authBenefits, demoUsers, roleDescriptions, roleLabels } from '../data/demoData'
import type { AuthMode, CurrentUser, UserRole } from '../types'

type AuthScreenProps = {
  authMode: AuthMode
  currentUser: CurrentUser | null
  selectedRole: UserRole
  onAuthModeChange: (mode: AuthMode) => void
  onBack: () => void
  onRoleChange: (role: UserRole) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function AuthScreen({
  authMode,
  currentUser,
  selectedRole,
  onAuthModeChange,
  onBack,
  onRoleChange,
  onSubmit,
}: AuthScreenProps) {
  const isSignup = authMode === 'signup'
  const selectedDemoUser =
    demoUsers.find((user) => user.role === selectedRole) ?? demoUsers[1]

  return (
    <main className="auth-page">
      <section className="auth-section" aria-labelledby="auth-title">
        <div className="auth-copy">
          <button className="back-button" onClick={onBack} type="button">
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Вернуться на лендинг</span>
          </button>

          <span className="eyebrow">Вход</span>
          <h1 id="auth-title">
            {isSignup ? 'Создайте рабочий доступ' : 'Войдите в базу знаний'}
          </h1>
          <p>
            Защищённый вход открывает персональную роль и сразу включает нужный
            набор действий в базе знаний.
          </p>

          <div className="auth-benefits">
            {authBenefits.map((benefit) => (
              <span key={benefit}>
                <CheckCircle2 aria-hidden="true" size={16} />
                {benefit}
              </span>
            ))}
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Тип авторизации">
            <button
              aria-selected={!isSignup}
              className={!isSignup ? 'active' : ''}
              onClick={() => onAuthModeChange('signin')}
              role="tab"
              type="button"
            >
              Вход
            </button>
            <button
              aria-selected={isSignup}
              className={isSignup ? 'active' : ''}
              onClick={() => onAuthModeChange('signup')}
              role="tab"
              type="button"
            >
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {isSignup && (
              <label className="field-label">
                <span>Имя</span>
                <span className="input-shell">
                  <UserPlus aria-hidden="true" size={18} />
                  <input name="name" placeholder="Максим Зданов" type="text" />
                </span>
              </label>
            )}

            <label className="field-label">
              <span>Email</span>
              <span className="input-shell">
                <Mail aria-hidden="true" size={18} />
                <input
                  defaultValue={isSignup ? '' : selectedDemoUser.email}
                  key={isSignup ? 'signup-email' : selectedDemoUser.email}
                  name="email"
                  placeholder="you@company.ru"
                  type="email"
                />
              </span>
            </label>

            <label className="field-label">
              <span>Пароль</span>
              <span className="input-shell">
                <KeyRound aria-hidden="true" size={18} />
                <input
                  defaultValue={isSignup ? '' : 'demo-password'}
                  name="password"
                  placeholder="Минимум 8 символов"
                  type="password"
                />
              </span>
            </label>

            {!isSignup && (
              <fieldset className="role-fieldset">
                <legend>Быстрый выбор демо-роли</legend>
                {demoUsers.map((user) => (
                  <label
                    className={selectedRole === user.role ? 'role-option active' : 'role-option'}
                    key={user.id}
                  >
                    <input
                      checked={selectedRole === user.role}
                      name="demoRole"
                      onChange={() => onRoleChange(user.role)}
                      type="radio"
                      value={user.role}
                    />
                    <span>
                      <strong>{roleLabels[user.role]}</strong>
                      <small>
                        {user.email} · {roleDescriptions[user.role]}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {isSignup && (
              <fieldset className="role-fieldset">
                <legend>Роль в базе знаний</legend>
                {(['reader', 'editor', 'admin'] as UserRole[]).map((role) => (
                  <label
                    className={selectedRole === role ? 'role-option active' : 'role-option'}
                    key={role}
                  >
                    <input
                      checked={selectedRole === role}
                      name="role"
                      onChange={() => onRoleChange(role)}
                      type="radio"
                      value={role}
                    />
                    <span>
                      <strong>{roleLabels[role]}</strong>
                      <small>{roleDescriptions[role]}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <button className="primary-button wide" type="submit">
              <span>{isSignup ? 'Создать доступ' : 'Войти в демо'}</span>
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </form>

          {currentUser && (
            <div className="session-card" aria-live="polite">
              <span className="session-icon">
                <UserCheck aria-hidden="true" size={20} />
              </span>
              <div>
                <strong>{currentUser.name}</strong>
                <span>
                  {currentUser.email} · {roleLabels[currentUser.role]}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default AuthScreen
