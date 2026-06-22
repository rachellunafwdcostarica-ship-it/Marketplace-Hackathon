'use client'

import { useState } from 'react'
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

export function AdminReportsInterface() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState<
    'usuarios' | 'proyectos' | 'auditoria' | null
  >(null)

  const handleDownload = async (
    tipo: 'usuarios' | 'proyectos' | 'auditoria',
  ) => {
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
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Reporte de ${tipo} descargado con éxito.`)
      } else {
        toast.error(`Error al generar el reporte: ${result.error}`)
      }
    } catch {
      toast.error('Ocurrió un error inesperado al procesar la descarga.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-ink-strong">
          Filtros de Reporte
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha de Inicio (Opcional)</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha de Fin (Opcional)</Label>
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
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-surface p-6 shadow-soft text-center hover:-translate-y-0.5 transition-transform duration-fast">
          <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">Usuarios</h4>
          <p className="mb-6 text-sm text-ink-muted">
            Exporta el listado completo de usuarios registrados, incluyendo su
            rol, estado y fecha de registro.
          </p>
          <Button
            className="w-full mt-auto"
            disabled={loading !== null}
            onClick={() => handleDownload('usuarios')}
          >
            {loading === 'usuarios' ? 'Generando...' : 'Descargar CSV'}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Tarjeta Proyectos */}
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-surface p-6 shadow-soft text-center hover:-translate-y-0.5 transition-transform duration-fast">
          <div className="mb-4 rounded-full bg-secondary/10 p-3 text-secondary">
            <Briefcase className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">Proyectos</h4>
          <p className="mb-6 text-sm text-ink-muted">
            Exporta el historial de proyectos, su modalidad, presupuesto y
            estado actual.
          </p>
          <Button
            className="w-full mt-auto"
            disabled={loading !== null}
            onClick={() => handleDownload('proyectos')}
          >
            {loading === 'proyectos' ? 'Generando...' : 'Descargar CSV'}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Tarjeta Auditoría */}
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-surface p-6 shadow-soft text-center hover:-translate-y-0.5 transition-transform duration-fast">
          <div className="mb-4 rounded-full bg-accent/10 p-3 text-accent">
            <Activity className="h-6 w-6" />
          </div>
          <h4 className="mb-2 font-heading text-lg font-bold">Actividad</h4>
          <p className="mb-6 text-sm text-ink-muted">
            Exporta el log de auditoría del sistema para revisar acciones
            administrativas y cambios de estado.
          </p>
          <Button
            className="w-full mt-auto"
            disabled={loading !== null}
            onClick={() => handleDownload('auditoria')}
          >
            {loading === 'auditoria' ? 'Generando...' : 'Descargar CSV'}
            <Download className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
