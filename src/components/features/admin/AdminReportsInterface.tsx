'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Download, Users, Briefcase, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  exportUsuariosCSV,
  exportProyectosCSV,
  exportAuditoriaCSV,
} from '@/lib/admin/report-actions'

type ReportTipo = 'usuarios' | 'proyectos' | 'auditoria'

export function AdminReportsInterface() {
  const t = useTranslations('Admin')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState<ReportTipo | null>(null)

  const handleDownload = async (tipo: ReportTipo) => {
    setLoading(tipo)
    try {
      const filters: { fechaInicio?: string; fechaFin?: string } = {}
      if (fechaInicio) filters.fechaInicio = new Date(fechaInicio).toISOString()
      if (fechaFin)
        filters.fechaFin = new Date(fechaFin + 'T23:59:59.999Z').toISOString()

      let result
      if (tipo === 'usuarios') {
        result = await exportUsuariosCSV(filters)
      } else if (tipo === 'proyectos') {
        result = await exportProyectosCSV(filters)
      } else {
        result = await exportAuditoriaCSV(filters)
      }

      if (result.ok) {
        const blob = new Blob([result.data], {
          type: 'text/csv;charset=utf-8;',
        })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)

        const entityLabel =
          tipo === 'usuarios'
            ? t('reportCardUsers')
            : tipo === 'proyectos'
              ? t('reportCardProjects')
              : t('reportCardActivity')
        toast.success(t('reportDownloadSuccess', { entity: entityLabel }))
      } else {
        toast.error(t('reportDownloadError', { error: result.error }))
      }
    } catch {
      toast.error(t('reportDownloadUnexpected'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-ink-strong">
          {t('reportFiltersTitle')}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">{t('reportDateFrom')}</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaFin">{t('reportDateTo')}</Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tarjeta Usuarios */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center shadow-soft transition-transform duration-fast hover:-translate-y-0.5">
          <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">
            {t('reportCardUsers')}
          </h4>
          <p className="mb-6 text-sm text-ink-muted">
            {t('reportCardUsersDesc')}
          </p>
          <Button
            className="mt-auto w-full"
            disabled={loading !== null}
            onClick={() => handleDownload('usuarios')}
          >
            {loading === 'usuarios'
              ? t('reportGenerating')
              : t('reportDownloadCsv')}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Tarjeta Proyectos */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center shadow-soft transition-transform duration-fast hover:-translate-y-0.5">
          <div className="mb-4 rounded-full bg-secondary/10 p-3 text-secondary">
            <Briefcase className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">
            {t('reportCardProjects')}
          </h4>
          <p className="mb-6 text-sm text-ink-muted">
            {t('reportCardProjectsDesc')}
          </p>
          <Button
            className="mt-auto w-full"
            disabled={loading !== null}
            onClick={() => handleDownload('proyectos')}
          >
            {loading === 'proyectos'
              ? t('reportGenerating')
              : t('reportDownloadCsv')}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Tarjeta Actividad */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center shadow-soft transition-transform duration-fast hover:-translate-y-0.5">
          <div className="mb-4 rounded-full bg-accent/10 p-3 text-accent">
            <Activity className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">
            {t('reportCardActivity')}
          </h4>
          <p className="mb-6 text-sm text-ink-muted">
            {t('reportCardActivityDesc')}
          </p>
          <Button
            className="mt-auto w-full"
            disabled={loading !== null}
            onClick={() => handleDownload('auditoria')}
          >
            {loading === 'auditoria'
              ? t('reportGenerating')
              : t('reportDownloadCsv')}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
