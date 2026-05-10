import { type FormEvent, useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type CreateNameDialogProps = {
  description: string
  label: string
  open: boolean
  placeholder: string
  submitLabel: string
  title: string
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<void> | void
}

function CreateNameDialog({
  description,
  label,
  open,
  placeholder,
  submitLabel,
  title,
  onOpenChange,
  onSubmit,
}: CreateNameDialogProps) {
  const inputId = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('')
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()

    if (!normalizedName) {
      setError('Введите название.')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(normalizedName)
      setName('')
      setError(null)
      onOpenChange(false)
    } catch {
      setError('Не удалось сохранить. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="name-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submitForm}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
              <Input
                autoFocus
                id={inputId}
                name="name"
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
                placeholder={placeholder}
                value={name}
                aria-invalid={Boolean(error)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button disabled={isSubmitting} type="submit">
              <Plus aria-hidden="true" data-icon="inline-start" />
              {isSubmitting ? 'Сохраняем...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateNameDialog
