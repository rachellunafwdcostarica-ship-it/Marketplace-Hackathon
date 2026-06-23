'use client'

import React from 'react'
import { Star, Briefcase, Eye, FileText, FileCheck2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ParticipacionConProyecto } from '@/lib/projects/project-detail'

interface ContratacionesListProps {
  contrataciones: ParticipacionConProyecto[]
}

function InitialsAvatar({
  nombre,
  apellidos,
}: {
  nombre: string
  apellidos: string
}) {
  const iniciales =
    `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase() || '?'
  return (
    <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner">
      {iniciales}
    </div>
  )
}

function ReputacionStars({ rating }: { rating: number | null }) {
  const t = useTranslations('EmpresaPerfil')
  if (rating === null) {
    return (
      <span className="text-xs text-muted-foreground">{t('noRatings')}</span>
    )
  }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < rating
              ? 'text-highlight fill-highlight'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const t = useTranslations('EmpresaPerfil')
  const isActive = estado === 'contratada'
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        isActive
          ? 'bg-warning/15 text-warning border-warning/30'
          : 'bg-accent/15 text-accent border-accent/30'
      }`}
    >
      {isActive ? t('estadoEnDesarrollo') : t('estadoFinalizado')}
    </span>
  )
}

export function ContratacionesList({
  contrataciones,
}: ContratacionesListProps) {
  const t = useTranslations('EmpresaPerfil')
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null)
  const [selectedMotivacion, setSelectedMotivacion] =
    React.useState<ParticipacionConProyecto | null>(null)

  const tituloLabels: Record<string, string> = {
    frontend: t('tituloFrontend'),
    backend: t('tituloBackend'),
    fullstack: t('tituloFullstack'),
  }

  if (contrataciones.length === 0) {
    return (
      <div className="p-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center bg-card/20 w-full">
        <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold text-foreground">
          {t('sinContrataciones')}
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          {t('sinContratacionesDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {contrataciones.map((item) => (
        <Card
          key={item.idParticipacion}
          className="overflow-hidden hover:shadow-md transition-shadow border-border/60"
        >
          <CardContent className="p-5 space-y-4">
            {/* Header: avatar + identidad + estado + reputación */}
            <div className="flex items-center gap-3">
              {item.fotoPerfil ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.fotoPerfil}
                  alt={item.estudianteNombre}
                  className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <InitialsAvatar
                  nombre={item.estudianteNombre}
                  apellidos={item.estudianteApellidos}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-foreground leading-tight">
                    {item.estudianteNombre} {item.estudianteApellidos}
                  </h4>
                  <Badge
                    variant="secondary"
                    className="px-2 py-0 text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary border-primary/20"
                  >
                    {tituloLabels[item.tituloFwd ?? ''] ?? t('tituloEgresado')}
                  </Badge>
                  <EstadoBadge estado={item.estado} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <ReputacionStars rating={item.reputacion} />
                  <span className="text-xs text-muted-foreground">
                    {t('postuloEl')}{' '}
                    {new Date(item.fechaPostulacion).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Proyecto */}
            <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
              <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  {t('contratadoPara')}
                </span>
                <span className="text-sm font-semibold text-foreground truncate block">
                  {item.proyecto.titulo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTitle(item.proyecto.titulo)}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus:outline-none"
                title={t('verTituloCompleto')}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Footer: acciones */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-xs border-primary/20 text-primary hover:bg-primary/10 font-semibold"
              >
                <Link
                  href={`/empresario/portafolio-egresado/${item.idParticipacion}`}
                >
                  {t('viewProfile')}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedMotivacion(item)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                {t('verMotivacion')}
              </Button>
              <Button
                asChild
                size="sm"
                variant="default"
                className="h-8 text-xs font-semibold gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground ml-auto"
              >
                <Link
                  href={`/empresario/proyecto/${item.proyecto.id}/entregables`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  {t('viewEntregables')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog: título completo */}
      <Dialog
        open={selectedTitle !== null}
        onOpenChange={(open) => !open && setSelectedTitle(null)}
      >
        <DialogContent className="sm:max-w-[425px] border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {t('tituloProyectoLabel')}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 text-sm font-medium text-foreground leading-relaxed break-words">
            {selectedTitle}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: motivación */}
      <Dialog
        open={selectedMotivacion !== null}
        onOpenChange={(open) => !open && setSelectedMotivacion(null)}
      >
        <DialogContent className="sm:max-w-[600px] border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b border-border/50">
            <DialogTitle className="font-heading text-xl">
              {t('motivacionYSolucion')}
            </DialogTitle>
            {selectedMotivacion && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('postulacionDe', {
                  nombre: selectedMotivacion.estudianteNombre,
                })}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            {selectedMotivacion?.cartaPostulacion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-primary">
                  {t('cartaPresentacion')}
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-xl border border-border/40">
                  {selectedMotivacion.cartaPostulacion}
                </div>
              </div>
            ) : null}
            {selectedMotivacion?.planteamientoSolucion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-accent">
                  {t('planteamientoSolucionLabel')}
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-accent/5 p-4 rounded-xl border border-accent/10">
                  {selectedMotivacion.planteamientoSolucion}
                </div>
              </div>
            ) : null}
            {!selectedMotivacion?.cartaPostulacion &&
              !selectedMotivacion?.planteamientoSolucion && (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{t('sinMotivacion')}</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
