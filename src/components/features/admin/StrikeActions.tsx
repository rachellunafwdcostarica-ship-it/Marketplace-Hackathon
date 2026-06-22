'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Plus, Minus, RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  addStrike,
  removeStrike,
  resetStrikes,
  restoreAccess,
} from '@/lib/admin/strike-actions'
import type { Database } from '@/types/database'

type MotivoStrikeEnum = Database['public']['Enums']['motivo_strike_enum']

interface StrikeActionsProps {
  userId: string
  userName: string
  cantidadStrikes: number
  isSelf: boolean
  isExpelled?: boolean
}

type ActionType = 'add' | 'remove' | 'reset'

// Mapeo legible de cada motivo enum para el selector
const MOTIVO_LABELS: Record<MotivoStrikeEnum, string> = {
  no_entrego: 'No entregó el proyecto',
  abandono_proyecto: 'Abandonó el proyecto',
  conducta_inapropiada: 'Conducta inapropiada',
  calificacion_baja_repetida: 'Calificación baja repetida',
  fraude: 'Fraude o engaño',
  ghosting: 'Ghosting (sin respuesta)',
  otro: 'Otro motivo',
}

const MOTIVOS = Object.keys(MOTIVO_LABELS) as MotivoStrikeEnum[]

/**
 * Acciones de moderación de strikes por usuario (panel de moderación).
 * Añadir (con motivo enum + descripción), reducir y resetear.
 * Self-guard: oculta las acciones si el usuario es el propio admin.
 */
export function StrikeActions({
  userId,
  userName,
  cantidadStrikes,
  isSelf,
  isExpelled = false,
}: StrikeActionsProps) {
  const t = useTranslations('Admin')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [openAction, setOpenAction] = useState<ActionType | null>(null)
  const [motivoEnum, setMotivoEnum] = useState<MotivoStrikeEnum>('otro')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">{t('selfRow')}</span>
  }

  const handleOpen = (action: ActionType | 'restore') => {
    if (action === 'restore') {
      handleRestore()
      return
    }
    setMotivoEnum('otro')
    setDescripcion('')
    setOpenAction(action as ActionType)
  }

  const handleRestore = async () => {
    if (!confirm('¿Estás seguro de que quieres permitir el acceso a este usuario y resetear sus strikes?')) return
    setLoading(true)
    const result = await restoreAccess(userId)
    setLoading(false)
    if (result.ok) {
      toast.success('El acceso ha sido restaurado correctamente.')
      router.refresh()
    } else {
      toast.error('Ocurrió un error al intentar restaurar el acceso.')
    }
  }

  const handleClose = () => {
    if (!loading) setOpenAction(null)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      let result

      if (openAction === 'add') {
        result = await addStrike(
          userId,
          motivoEnum,
          descripcion.trim() || undefined,
        )
        if (result.ok) toast.success(t('strikeAdded', { name: userName }))
      } else if (openAction === 'remove') {
        result = await removeStrike(userId, descripcion.trim() || undefined)
        if (result.ok) toast.success(t('strikeRemoved', { name: userName }))
      } else if (openAction === 'reset') {
        result = await resetStrikes(userId, descripcion.trim())
        if (result.ok) toast.success(t('strikesReset', { name: userName }))
      } else {
        return
      }

      if (result && !result.ok) {
        if (result.error === 'motivo_requerido') {
          toast.error(t('strikeResetMotivoRequired'))
        } else if (result.error === 'user_not_found') {
          toast.error(t('strikeUserNotFound'))
        } else {
          toast.error(t('strikeError'))
        }
        return
      }

      setOpenAction(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const isResetDisabled =
    openAction === 'reset' && descripcion.trim().length < 5
  const isConfirmDisabled = loading || isResetDisabled

  if (isExpelled) {
    return (
      <Button
        size="sm"
        onClick={() => handleOpen('restore' as any)}
        disabled={loading}
        className="flex items-center gap-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        title="Permitir el acceso a este usuario"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Permitir acceso</span>
      </Button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Añadir strike */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpen('add')}
          className="flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={t('addStrike')}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('addStrike')}</span>
        </Button>

        {/* Reducir strike — solo si tiene strikes */}
        {cantidadStrikes > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpen('remove')}
            className="flex items-center gap-1 border-accent/20 text-accent hover:bg-accent/10 hover:text-accent"
            title={t('removeStrike')}
          >
            <Minus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('removeStrike')}</span>
          </Button>
        )}

        {/* Resetear — solo si tiene 2+ strikes */}
        {cantidadStrikes >= 2 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpen('reset')}
            className="flex items-center gap-1 border-warning/20 text-warning hover:bg-warning/10 hover:text-warning"
            title={t('resetStrikes')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('resetStrikes')}</span>
          </Button>
        )}
      </div>

      {/* Diálogo compartido */}
      <Dialog open={openAction !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border border-border">
          {openAction && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {openAction === 'add'
                    ? t('addStrikeTitle', { name: userName })
                    : openAction === 'remove'
                      ? t('removeStrikeTitle', { name: userName })
                      : t('resetStrikesTitle', { name: userName })}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  {openAction === 'add'
                    ? t('addStrikeDesc', { name: userName })
                    : openAction === 'remove'
                      ? t('removeStrikeDesc', {
                          name: userName,
                          count: cantidadStrikes,
                        })
                      : t('resetStrikesDesc', {
                          name: userName,
                          count: cantidadStrikes,
                        })}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-4">
                {/* Selector de motivo — solo para añadir */}
                {openAction === 'add' && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="strike-motivo-enum"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Motivo del strike *
                    </Label>
                    <Select
                      value={motivoEnum}
                      onValueChange={(v) =>
                        setMotivoEnum(v as MotivoStrikeEnum)
                      }
                    >
                      <SelectTrigger id="strike-motivo-enum" className="w-full">
                        <SelectValue placeholder="Seleccioná el motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVOS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {MOTIVO_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Descripción libre */}
                {(openAction === 'add' || openAction === 'reset') && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="strike-descripcion"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      {openAction === 'reset'
                        ? 'Justificación del reseteo *'
                        : 'Descripción adicional (opcional)'}
                    </Label>
                    <Textarea
                      id="strike-descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder={
                        openAction === 'reset'
                          ? 'Explicá por qué se resetean los strikes...'
                          : 'Describí brevemente el incidente...'
                      }
                      rows={3}
                      className="resize-none text-sm"
                      maxLength={500}
                    />
                    {openAction === 'reset' &&
                      descripcion.trim().length < 5 &&
                      descripcion.length > 0 && (
                        <p className="text-xs text-destructive">
                          {t('strikeMotivoMin')}
                        </p>
                      )}
                    <p className="text-right text-[10px] text-muted-foreground">
                      {descripcion.length}/500
                    </p>
                  </div>
                )}

                {/* Descripción para "reducir" */}
                {openAction === 'remove' && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="strike-remove-motivo"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Motivo de reducción (opcional)
                    </Label>
                    <Textarea
                      id="strike-remove-motivo"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Indicá por qué se reduce el strike..."
                      rows={2}
                      className="resize-none text-sm"
                      maxLength={500}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={
                    openAction === 'add'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : openAction === 'remove'
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'bg-warning text-warning-foreground hover:bg-warning/90'
                  }
                >
                  {loading
                    ? tCommon('loading')
                    : openAction === 'add'
                      ? t('addStrike')
                      : openAction === 'remove'
                        ? t('removeStrike')
                        : t('resetStrikes')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
