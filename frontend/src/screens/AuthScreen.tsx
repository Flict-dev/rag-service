import { type FormEvent, useId } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { AuthMode, CurrentUser } from '../types'

export type AuthFormValues = {
  email: string
  name?: string
  password: string
}

type AuthScreenProps = {
  authMode: AuthMode
  currentUser: CurrentUser | null
  error?: string | null
  isSubmitting?: boolean
  onAuthModeChange: (mode: AuthMode) => void
  onBack: () => void
  onSubmit: (values: AuthFormValues) => void
}

function AuthScreen({
  authMode,
  currentUser,
  error,
  isSubmitting = false,
  onAuthModeChange,
  onBack,
  onSubmit,
}: AuthScreenProps) {
  const isSignup = authMode === 'signup'
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    onSubmit({
      email: String(formData.get('email') || ''),
      name: isSignup ? String(formData.get('name') || '') : undefined,
      password: String(formData.get('password') || ''),
    })
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-copy">
          <Button className="auth-back" onClick={onBack} type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            На главную
          </Button>

          <span className="ui-kicker">Вход в рабочее пространство</span>
          <h1 id="auth-title">{isSignup ? 'Создайте аккаунт' : 'Войдите в базу знаний'}</h1>
          <p>
            Доступ открывает список ваших баз знаний. Внутри остаются только разделы,
            markdown-файлы и чат-поиск по документам.
          </p>
        </div>

        <div className="auth-card">
          <ToggleGroup
            aria-label="Тип авторизации"
            className="auth-tabs"
            onValueChange={(value) => {
              if (value === 'signin' || value === 'signup') {
                onAuthModeChange(value)
              }
            }}
            type="single"
            value={authMode}
            variant="outline"
          >
            <ToggleGroupItem value="signin">
              Вход
            </ToggleGroupItem>
            <ToggleGroupItem value="signup">
              Регистрация
            </ToggleGroupItem>
          </ToggleGroup>

          <form className="auth-form" onSubmit={submitForm}>
            <FieldGroup>
              {isSignup ? (
                <Field>
                  <FieldLabel htmlFor={nameId}>Имя</FieldLabel>
                  <div className="icon-field">
                    <UserRound aria-hidden="true" />
                    <Input id={nameId} name="name" placeholder="Имя" type="text" />
                  </div>
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor={emailId}>Почта</FieldLabel>
                <div className="icon-field">
                  <Mail aria-hidden="true" />
                  <Input
                    autoComplete="email"
                    defaultValue={isSignup ? '' : 'demo@ragbase.local'}
                    id={emailId}
                    name="email"
                    placeholder="you@company.ru"
                    type="email"
                  />
                </div>
              </Field>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={passwordId}>Пароль</FieldLabel>
                <div className="icon-field">
                  <KeyRound aria-hidden="true" />
                  <Input
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    defaultValue={isSignup ? '' : 'demo-password'}
                    id={passwordId}
                    name="password"
                    placeholder="Минимум 8 символов"
                    type="password"
                    aria-invalid={Boolean(error)}
                  />
                </div>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </FieldGroup>

            <Button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Проверяем...' : isSignup ? 'Зарегистрироваться' : 'Войти'}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          </form>

          {currentUser ? (
            <div className="session-note" aria-live="polite">
              Уже вошли как {currentUser.name}. <Link to="/bases">Открыть базы знаний</Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default AuthScreen
