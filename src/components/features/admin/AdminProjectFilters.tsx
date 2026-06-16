'use client'

import { useState } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

interface AdminProjectFiltersProps {
  initialEstado: string
  initialModalidad: string
}

/**
 * Filtros de proyectos para el panel de administración (estado y modalidad).
 * Sincroniza el estado con la URL (searchParams) para recargar el RSC.
 */
export function AdminProjectFilters({
  initialEstado,
  initialModalidad,
}: AdminProjectFiltersProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const pathname = usePathname()

  const [estado, setEstado] = useState(initialEstado || ALL)
  const [modalidad, setModalidad] = useState(initialModalidad || ALL)

  const apply = (next: { estado?: string; modalidad?: string }) => {
    const nextEstado = next.estado ?? estado
    const nextModalidad = next.modalidad ?? modalidad

    const params = new URLSearchParams()
    if (nextEstado && nextEstado !== ALL) params.set('estado', nextEstado)
    if (nextModalidad && nextModalidad !== ALL) params.set('modalidad', nextModalidad)

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end bg-card/25 p-4 rounded-xl border border-border/40">
      <div className="space-y-1.5 flex-1 sm:flex-initial">
        <label
          htmlFor="project-estado"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t('filterEstado')}
        </label>
        <Select
          value={estado}
          onValueChange={(value) => {
            setEstado(value)
            apply({ estado: value })
          }}
        >
          <SelectTrigger id="project-estado" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterEstadoAll')}</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="abierto">Abierto</SelectItem>
            <SelectItem value="en_recepcion">En Recepción</SelectItem>
            <SelectItem value="adjudicado">Adjudicado</SelectItem>
            <SelectItem value="en_desarrollo">En Desarrollo</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 flex-1 sm:flex-initial">
        <label
          htmlFor="project-modalidad"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t('filterModalidad')}
        </label>
        <Select
          value={modalidad}
          onValueChange={(value) => {
            setModalidad(value)
            apply({ modalidad: value })
          }}
        >
          <SelectTrigger id="project-modalidad" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterModalidadAll')}</SelectItem>
            <SelectItem value="remoto">Remoto</SelectItem>
            <SelectItem value="hibrido">Híbrido</SelectItem>
            <SelectItem value="presencial">Presencial</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
