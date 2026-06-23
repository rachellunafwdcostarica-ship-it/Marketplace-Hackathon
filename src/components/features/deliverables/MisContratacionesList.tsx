'use client'

import { useTranslations } from 'next-intl'
import { Briefcase, Building2, CalendarDays, FileCheck2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/features/shared/EmptyState'
import type { ContratacionResumen } from '@/lib/deliverables/queries'

interface MisContratacionesListProps {
  contrataciones: ContratacionResumen[]
}

const ESTADO_PERIODO_KEYS: Record<string, string> = {
  vigente: 'contractActive',
  finalizado: 'contractFinished',
  pausado: 'contractPaused',
  cancelado: 'contractCancelled',
}

const ESTADO_PERIODO_COLORS: Record<string, string> = {
  vigente: 'text-accent border-accent/40 bg-accent/10',
  finalizado: 'text-primary border-primary/40 bg-primary/10',
  pausado: 'text-warning border-warning/40 bg-warning/10',
  cancelado: 'text-magenta border-magenta/40 bg-magenta/10',
}

export function MisContratacionesList({
  contrataciones,
}: MisContratacionesListProps) {
  const tEgresado = useTranslations('Egresado')

  if (contrataciones.length === 0) {
    return (
      <EmptyState
        title={tEgresado('emptyContracts')}
        description={tEgresado('emptyContractsDesc')}
        icon={Briefcase}
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contrataciones.map((c) => {
        const estadoKey =
          ESTADO_PERIODO_KEYS[c.estado_periodo] ?? 'contractActive'
        const estadoColor =
          ESTADO_PERIODO_COLORS[c.estado_periodo] ??
          'text-muted-foreground border-border bg-muted/20'

        return (
          <li key={c.id_contratacion}>
            <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md h-full flex flex-col">
              <CardContent className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                    {c.titulo_proyecto}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${estadoColor}`}
                  >
                    {tEgresado(estadoKey)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {c.fecha_inicio && (
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      {tEgresado('contractStart')}:{' '}
                      {new Date(c.fecha_inicio).toLocaleDateString()}
                    </p>
                  )}
                  {c.fecha_fin_estimada && (
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      {tEgresado('contractEnd')}:{' '}
                      {new Date(c.fecha_fin_estimada).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full font-semibold gap-1.5"
                  >
                    <Link
                      href={`/egresado/projects/${c.id_proyecto}/entregables`}
                    >
                      <FileCheck2 className="w-4 h-4" />
                      {tEgresado('viewDeliverables')}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full font-semibold gap-1.5 text-muted-foreground"
                  >
                    <Link href={`/egresado/empresa/${c.id_empresario}`}>
                      <Building2 className="w-4 h-4" />
                      {tEgresado('viewCompanyProfile')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
