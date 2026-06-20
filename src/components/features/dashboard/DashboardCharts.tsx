'use client'

import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import type { PublishedProject } from '@/lib/projects/dashboard'
import { BarChart as BarChartIcon, Code2, TrendingUp, Cpu } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

interface DashboardChartsProps {
  projects: PublishedProject[]
  countsByProject: Record<string, number>
}

export function DashboardCharts({
  projects,
  countsByProject,
}: DashboardChartsProps) {
  if (projects.length === 0) return null

  // 1. Postulaciones por Proyecto
  const postulationsData = projects.map((p) => ({
    name: p.titulo.length > 22 ? p.titulo.substring(0, 22) + '...' : p.titulo,
    postulaciones: countsByProject[p.id] || 0,
  }))

  // 2. Tecnologías más solicitadas
  const techCounts: Record<string, number> = {}
  projects.forEach((p) => {
    p.tecnologias.forEach((t) => {
      techCounts[t] = (techCounts[t] || 0) + 1
    })
  })

  const techData = Object.entries(techCounts)
    .map(([tech, count]) => ({ name: tech.toUpperCase(), proyectos: count }))
    .sort((a, b) => b.proyectos - a.proyectos)
    .slice(0, 5)

  // 3. Distribución de Estados
  const statusCounts: Record<string, number> = {}
  projects.forEach((p) => {
    statusCounts[p.estadoEfectivo] = (statusCounts[p.estadoEfectivo] || 0) + 1
  })

  const statusMap: Record<string, { label: string; color: string }> = {
    abierto: { label: 'Recepción', color: '#3b82f6' },
    en_evaluacion: { label: 'Evaluación', color: '#eab308' },
    adjudicado: { label: 'Adjudicado', color: '#f97316' },
    en_desarrollo: { label: 'En Desarrollo', color: '#a855f7' },
    finalizado: { label: 'Finalizado', color: '#22c55e' },
    cancelado: { label: 'Cancelado', color: '#ef4444' },
    borrador: { label: 'Borrador', color: '#9ca3af' },
  }

  const statusData = Object.entries(statusCounts).map(([estado, count]) => ({
    name: statusMap[estado]?.label || estado,
    value: count,
    color: statusMap[estado]?.color || '#cbd5e1',
  }))

  // Custom Tooltip para Postulaciones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipPostulaciones = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>{payload[0].value} postulantes</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Tooltip para Tecnologías
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipTech = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-semibold text-foreground text-sm mb-1 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>
              {payload[0].value}{' '}
              {payload[0].value === 1 ? 'proyecto' : 'proyectos'}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Tooltip para Estados (Pie Chart)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <div>
            <p className="font-bold text-foreground text-sm">{data.name}</p>
            <p className="text-muted-foreground text-xs font-medium">
              {data.value} {data.value === 1 ? 'proyecto' : 'proyectos'}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
      {/* Chart 1: Postulaciones por Proyecto */}
      <Card className="border-border/40 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col bg-gradient-to-b from-card to-muted/10 rounded-2xl">
        <CardHeader className="pb-6 pt-7 px-7 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shadow-inner">
              <BarChartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Atracción de Talento
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                Volumen de postulaciones por proyecto publicado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-4 sm:px-6 h-[240px] w-full min-h-[240px] flex-1 relative">
          {postulationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={postulationsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                barCategoryGap="25%"
              >
                <defs>
                  <linearGradient
                    id="colorPostulaciones"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1.5 }}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                  content={<CustomTooltipPostulaciones />}
                />
                <Bar
                  dataKey="postulaciones"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                  animationDuration={1500}
                >
                  {postulationsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill="url(#colorPostulaciones)"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <BarChartIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                Aún no hay datos suficientes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Tecnologías más solicitadas */}
      <Card className="border-border/40 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col bg-gradient-to-b from-card to-muted/10 rounded-2xl">
        <CardHeader className="pb-6 pt-7 px-7 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-lg shadow-inner">
              <Code2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Stack Tecnológico
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                Top 5 de lenguajes y herramientas más requeridos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-4 sm:px-6 h-[240px] w-full min-h-[240px] flex-1 relative">
          {techData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={techData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="colorTech" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5e7eb"
                  strokeOpacity={0.4}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1.5 }}
                  allowDecimals={false}
                  dy={10}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#374151', fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={85}
                  dx={-5}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                  content={<CustomTooltipTech />}
                />
                <Bar
                  dataKey="proyectos"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={35}
                  animationDuration={1500}
                >
                  {techData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="url(#colorTech)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Code2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                Aún no has definido tu stack
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 3: Estado de Proyectos (Donut) */}
      <Card className="border-border/40 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col bg-gradient-to-b from-card to-muted/10 rounded-2xl lg:col-span-1">
        <CardHeader className="pb-6 pt-7 px-7 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg shadow-inner">
              <PieChartIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Estado General
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                Distribución de tu portafolio
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-4 sm:px-6 h-[240px] w-full min-h-[240px] flex-1 relative">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="40%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                   
                  formatter={(value: string) => (
                    <span className="text-xs font-semibold text-muted-foreground ml-1">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No hay proyectos activos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
