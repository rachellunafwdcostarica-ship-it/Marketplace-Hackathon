'use client'

import { Calendar, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type { EstadoParticipacion } from '@/lib/projects/project-detail-logic'

export interface PostulacionPropia {
  id_participacion: string
  id_proyecto: string
  projectTitle: string
  companyName: string
  carta_postulacion: string | null
  /** Estado real almacenado en la BD. */
  estado: EstadoParticipacion
  /** Estado EFECTIVO de cara al estudiante (RF-32): si el proyecto ya se cerró,
   *  una oferta viva se ve `no_seleccionada`/`cancelada` aunque la columna siga
   *  en `enviada`. Es lo que se PINTA; ver `computeEstadoParticipacionEfectivo`. */
  estadoEfectivo: EstadoParticipacion
  fecha_postulacion: string
}

const ESTADO_STYLE: Record<EstadoParticipacion, string> = {
  enviada: 'bg-primary/10 text-primary border-primary/20',
  en_revision: 'bg-warning/10 text-warning border-warning/20',
  contratada: 'bg-accent/10 text-accent border-accent/20',
  no_seleccionada: 'bg-destructive/10 text-destructive border-destructive/20',
  retirada: 'bg-muted text-muted-foreground border-border',
  finalizada: 'bg-secondary/10 text-secondary border-secondary/20',
  cancelada: 'bg-destructive/10 text-destructive border-destructive/20',
}

const RETIRABLE: EstadoParticipacion[] = ['enviada', 'en_revision']

interface PostulacionCardProps {
  postulacion: PostulacionPropia
  onWithdraw?: () => void
}

export function PostulacionCard({
  postulacion,
  onWithdraw,
}: PostulacionCardProps) {
  const tEgresado = useTranslations('Egresado')
  const tDetail = useTranslations('ProjectDetail')

  const canWithdraw = RETIRABLE.includes(postulacion.estadoEfectivo)

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm hover:shadow-sm transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]">
      <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {postulacion.projectTitle}
            </h3>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                ESTADO_STYLE[postulacion.estadoEfectivo],
              )}
            >
              {tDetail(`pstatus_${postulacion.estadoEfectivo}`)}
            </span>
          </div>
          <p className="text-sm font-semibold text-primary font-heading">
            {postulacion.companyName}
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mt-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(postulacion.fecha_postulacion).toLocaleDateString()}
        </span>
      </CardHeader>

      {postulacion.carta_postulacion && (
        <CardContent className="p-6 pt-0">
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {tEgresado('coverLetter')}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line italic">
              &quot;{postulacion.carta_postulacion}&quot;
            </p>
          </div>
        </CardContent>
      )}

      {canWithdraw && onWithdraw && (
        <CardFooter className="p-6 pt-4 border-t border-border/40 bg-muted/10 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onWithdraw}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-1.5 px-4"
          >
            <X className="w-4 h-4" />
            {tEgresado('withdrawOffer')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
