'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flag } from 'lucide-react'
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
import { crearReporteUsuario } from '@/lib/moderation/report-actions'
import { TIPO_REPORTE_VALUES, type TipoReporte } from '@/lib/moderation/schemas'

const MIN_DESC = 10
const MAX_DESC = 1000

interface ReportUserButtonProps {
  idReportado: string
}

/**
 * RF-69 — Botón "Reportar usuario" + diálogo de denuncia. Cualquier usuario
 * autenticado puede reportar a otro por conducta o contenido. El intento de
 * auto-reporte lo bloquea el server action.
 */
export function ReportUserButton({ idReportado }: ReportUserButtonProps) {
  const t = useTranslations('Admin')
  const tCommon = useTranslations('Common')

  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoReporte>('conducta_abusiva')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  const close = () => {
    if (!loading) setOpen(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const result = await crearReporteUsuario({
      idReportado,
      tipoReporte: tipo,
      descripcion: descripcion.trim(),
    })
    setLoading(false)

    if (result.ok) {
      toast.success(t('reportSent'))
      setOpen(false)
      setTipo('conducta_abusiva')
      setDescripcion('')
    } else if (result.error === 'cannot_report_self') {
      toast.error(t('reportSelfError'))
    } else {
      toast.error(t('reportSendError'))
    }
  }

  const isDisabled = loading || descripcion.trim().length < MIN_DESC

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-ink-muted hover:text-destructive"
      >
        <Flag className="h-4 w-4" />
        {t('reportButton')}
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              {t('reportUserTitle')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('reportUserDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="report-tipo"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t('reportTypeLabel')}
              </Label>
              <Select
                value={tipo}
                onValueChange={(value) => setTipo(value as TipoReporte)}
              >
                <SelectTrigger id="report-tipo" className="w-full">
                  <SelectValue placeholder={t('reportTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_REPORTE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`tipoReporte_${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="report-desc"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t('reportDescriptionLabel')}
              </Label>
              <Textarea
                id="report-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t('reportDescriptionPlaceholder')}
                rows={4}
                className="resize-none text-sm"
                maxLength={MAX_DESC}
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {descripcion.length}/{MAX_DESC}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
            <Button variant="outline" onClick={close} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isDisabled}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? tCommon('loading') : t('reportSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
