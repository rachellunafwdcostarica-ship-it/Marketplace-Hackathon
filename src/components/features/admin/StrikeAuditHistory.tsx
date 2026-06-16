'use client'

import { useTranslations } from 'next-intl'

interface AuditLogItem {
  id: string
  userName: string
  action: string
  motivo: string
  fecha: string
}

// Datos de auditoría simulados en el cliente para el administrador
const SIMULATED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-1',
    userName: 'Carlos Mendoza',
    action: 'Añadir Strike (+1)',
    motivo:
      'Incumplimiento repetido de los plazos de entrega pactados sin justificación.',
    fecha: '2026-06-15T14:32:00Z',
  },
  {
    id: 'log-2',
    userName: 'Ana Carolina Ortiz',
    action: 'Resetear Strikes (-> 0)',
    motivo:
      'Apelación de strikes aceptada tras presentar justificante de salud válido.',
    fecha: '2026-06-14T09:15:00Z',
  },
  {
    id: 'log-3',
    userName: 'Esteban Rojas',
    action: 'Añadir Strike (+1)',
    motivo:
      'Spam de postulaciones idénticas a múltiples proyectos desatendiendo stack técnico.',
    fecha: '2026-06-12T18:44:00Z',
  },
]

export function StrikeAuditHistory() {
  const t = useTranslations('Admin')

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground bg-card/60">
        Historial de Auditoría de Moderación
      </div>
      <div className="divide-y divide-border/40">
        {SIMULATED_AUDIT_LOGS.map((log) => (
          <div key={log.id} className="p-4 hover:bg-card/20 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-foreground">
                  {log.userName}
                </span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                  {log.action}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(log.fecha).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 bg-background/30 p-2.5 rounded border border-border/20">
              <span className="font-medium text-xs text-foreground block mb-0.5 uppercase tracking-wider">
                Motivo:
              </span>
              {log.motivo}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
