'use client'

import React from 'react'
import { ParticipacionConProyecto } from '@/lib/projects/project-detail'
import { Star, Briefcase, Award, Calendar, Eye, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
    <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-inner">
      {iniciales}
    </div>
  )
}

function renderStars(rating: number | null) {
  if (rating === null) {
    return (
      <span className="text-xs text-muted-foreground ml-1">Sin calificar</span>
    )
  }
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function getTituloLabel(titulo: string | null) {
  switch (titulo) {
    case 'frontend':
      return 'Frontend'
    case 'backend':
      return 'Backend'
    case 'fullstack':
      return 'Fullstack'
    default:
      return 'Egresado'
  }
}

export function ContratacionesList({
  contrataciones,
}: ContratacionesListProps) {
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null)
  const [selectedMotivacion, setSelectedMotivacion] =
    React.useState<ParticipacionConProyecto | null>(null)

  if (contrataciones.length === 0) {
    return (
      <div className="p-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center bg-card/20 w-full">
        <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold text-foreground">
          Sin contrataciones
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Aún no has contratado a ningún egresado para tus proyectos.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
      {contrataciones.map((item) => (
        <Card
          key={item.idParticipacion}
          className="overflow-hidden hover:shadow-md transition-shadow border-border/60"
        >
          <CardContent className="p-5 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {item.fotoPerfil ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.fotoPerfil}
                  alt={item.estudianteNombre}
                  className="w-12 h-12 rounded-full object-cover shadow-sm border border-border"
                />
              ) : (
                <InitialsAvatar
                  nombre={item.estudianteNombre}
                  apellidos={item.estudianteApellidos}
                />
              )}
              <div className="flex flex-col min-w-0">
                <h4 className="font-bold text-base text-foreground truncate">
                  {item.estudianteNombre} {item.estudianteApellidos}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary border-primary/20"
                  >
                    {getTituloLabel(item.tituloFwd)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Award className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    Reputación
                  </span>
                </div>
                {renderStars(item.reputacion)}
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    Postuló el
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {new Date(item.fechaPostulacion).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-start gap-3 bg-secondary/20 p-3 rounded-xl border border-secondary/30 mt-1">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-border">
                  <Briefcase className="w-4 h-4 text-foreground/70" />
                </div>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    Contratado para
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {item.proyecto.titulo}
                    </span>
                    <button
                      onClick={() => setSelectedTitle(item.proyecto.titulo)}
                      className="shrink-0 text-primary hover:text-primary/80 transition-colors focus:outline-none"
                      title="Ver título completo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-2 gap-2 text-xs font-semibold h-8 border-border hover:bg-secondary/20"
                onClick={() => setSelectedMotivacion(item)}
              >
                <FileText className="w-4 h-4" />
                Ver Motivación
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={selectedTitle !== null}
        onOpenChange={(open) => !open && setSelectedTitle(null)}
      >
        <DialogContent className="sm:max-w-[425px] border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Título del Proyecto
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 text-sm font-medium text-foreground leading-relaxed break-words">
            {selectedTitle}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedMotivacion !== null}
        onOpenChange={(open) => !open && setSelectedMotivacion(null)}
      >
        <DialogContent className="sm:max-w-[600px] border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b border-border/50">
            <DialogTitle className="font-heading text-xl">
              Motivación y Solución
            </DialogTitle>
            {selectedMotivacion && (
              <p className="text-sm text-muted-foreground mt-1">
                Postulación de{' '}
                <span className="font-semibold text-foreground">
                  {selectedMotivacion.estudianteNombre}
                </span>
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            {selectedMotivacion?.cartaPostulacion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-primary">
                  Carta de Presentación
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-xl border border-border/40">
                  {selectedMotivacion.cartaPostulacion}
                </div>
              </div>
            ) : null}

            {selectedMotivacion?.planteamientoSolucion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-accent">
                  Planteamiento de Solución
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
                  <p>
                    El estudiante no adjuntó una carta de motivación o
                    planteamiento de solución.
                  </p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
