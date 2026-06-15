'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ButtonProps = React.ComponentProps<typeof Button>

interface ConfirmButtonProps {
  /** Acción a ejecutar al confirmar. Puede ser async. */
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel: string
  /** Clase del botón de confirmación del diálogo (color por acción). */
  confirmClassName?: string
  /** Estilo del botón disparador (el visible en la fila). */
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  children: ReactNode
}

/**
 * Botón con confirmación: muestra un diálogo (shadcn) antes de ejecutar la
 * acción. Centraliza el estado de carga. Para decisiones importantes (aprobar,
 * rechazar, verificar, desactivar, cerrar sesión).
 */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmClassName,
  className,
  variant,
  size = 'sm',
  disabled,
  children,
}: ConfirmButtonProps) {
  const t = useTranslations('Common')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={confirmClassName}
            >
              {loading ? t('loading') : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
