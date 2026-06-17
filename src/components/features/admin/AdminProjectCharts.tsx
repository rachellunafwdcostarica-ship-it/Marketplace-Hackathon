'use client'

import { useState } from 'react'

interface AdminProjectChartsProps {
  stats: {
    total: number
    borrador: number
    abierto: number
    en_recepcion: number
    adjudicado: number
    en_desarrollo: number
    finalizado: number
    cancelado: number
  }
}

export function AdminProjectCharts({ stats }: AdminProjectChartsProps) {
  const [activeBar, setActiveBar] = useState<string | null>(null)
  const [activeSlice, setActiveSlice] = useState<string | null>(null)

  // Datos para gráfico de barras (Estados principales)
  const barData = [
    { label: 'Borrador', value: stats.borrador, color: 'bg-muted fill-muted' },
    { label: 'Abierto', value: stats.abierto, color: 'bg-accent fill-accent' },
    {
      label: 'En Recepción',
      value: stats.en_recepcion,
      color: 'bg-warning fill-warning',
    },
    {
      label: 'Adjudicado',
      value: stats.adjudicado,
      color: 'bg-primary fill-primary',
    },
    {
      label: 'En Desarrollo',
      value: stats.en_desarrollo,
      color: 'bg-secondary fill-secondary',
    },
    {
      label: 'Finalizado',
      value: stats.finalizado,
      color: 'bg-highlight fill-highlight',
    },
    {
      label: 'Cancelado',
      value: stats.cancelado,
      color: 'bg-destructive fill-destructive',
    },
  ]

  const maxValue = Math.max(...barData.map((d) => d.value), 1)

  // Gráfico circular / Donut (Proyectos activos vs inactivos/finalizados)
  const activeCount =
    stats.abierto + stats.en_recepcion + stats.en_desarrollo + stats.adjudicado
  const inactiveCount = stats.finalizado + stats.cancelado + stats.borrador
  const donutTotal = activeCount + inactiveCount || 1

  const activePercent = Math.round((activeCount / donutTotal) * 100)
  const inactivePercent = 100 - activePercent

  // Configuración SVG de la Dona
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const activeOffset = circumference - (activePercent / 100) * circumference
  const inactiveOffset = circumference - (inactivePercent / 100) * circumference

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <style>{`
        @keyframes barHoverRainbow {
          0% { background-color: #008fd4; }
          17% { background-color: #662d91; }
          33% { background-color: #20bec6; }
          50% { background-color: #ffcb05; }
          67% { background-color: #f7901e; }
          83% { background-color: #ec008c; }
          100% { background-color: #008fd4; }
        }
        .animate-bar-hover {
          animation: barHoverRainbow 2s linear infinite !important;
        }
      `}</style>
      {/* Gráfico de Barras */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-6 backdrop-blur-sm">
        <h3 className="text-base font-semibold font-heading text-foreground mb-4">
          Distribución de Proyectos por Estado
        </h3>
        <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-border/40 relative">
          {barData.map((bar) => {
            const barHeightPercent = (bar.value / maxValue) * 100
            const isHovered = activeBar === bar.label

            return (
              <div
                key={bar.label}
                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                onMouseEnter={() => setActiveBar(bar.label)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {/* Tooltip flotante */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded shadow border border-border/60 z-10 transition-all duration-200">
                    <span className="font-semibold">{bar.label}:</span>{' '}
                    {bar.value}
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${bar.color} ${
                    isHovered
                      ? 'opacity-100 scale-x-105 filter brightness-110 animate-bar-hover'
                      : 'opacity-80'
                  }`}
                  style={{ height: `${Math.max(barHeightPercent, 4)}%` }}
                />
              </div>
            )
          })}
        </div>
        {/* Leyendas */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] text-muted-foreground">
          {barData.map((bar) => (
            <div key={bar.label} className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${bar.color.split(' ')[0]}`}
              />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Dona / Circular */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-6 backdrop-blur-sm flex flex-col justify-between">
        <h3 className="text-base font-semibold font-heading text-foreground mb-4">
          Estado Operativo de Proyectos
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
          {/* SVG del donut */}
          <div className="relative w-40 h-40">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-muted fill-none"
                strokeWidth="12"
              />
              {/* Sección Activos (Accent color) */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-accent fill-none transition-all duration-500 ease-out cursor-pointer"
                strokeWidth={activeSlice === 'active' ? '16' : '12'}
                strokeDasharray={circumference}
                strokeDashoffset={activeOffset}
                strokeLinecap="round"
                onMouseEnter={() => setActiveSlice('active')}
                onMouseLeave={() => setActiveSlice(null)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold text-foreground">
                {donutTotal === 1 && stats.total === 0 ? 0 : stats.total}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Detalles */}
          <div className="space-y-4 w-full sm:w-auto">
            <div
              className={`p-3 rounded-lg border transition-all ${
                activeSlice === 'active'
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-accent" />
                <span className="text-sm font-medium text-foreground">
                  Activos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeCount} proyectos ({activePercent}%) en fase de recepción,
                adjudicación o desarrollo.
              </p>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all ${
                activeSlice === 'inactive'
                  ? 'border-muted/40 bg-muted/5'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-muted" />
                <span className="text-sm font-medium text-foreground">
                  Inactivos / Finalizados
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {inactiveCount} proyectos ({inactivePercent}%) completados,
                cancelados o en borrador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
