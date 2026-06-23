'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
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
  type TooltipContentProps,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

interface DashboardChartsProps {
  projects: PublishedProject[]
  countsByProject: Record<string, number>
}

interface StatusDatum {
  name: string
  value: number
  color: string
}

// Estado de proyecto -> token de color FWD (mismo criterio que
// PublishedProjectsBoard, la otra superficie del empresario). Se usan variables
// CSS porque Recharts pinta SVG con valores de color, no con clases Tailwind.
const STATUS_COLOR_TOKENS: Record<string, string> = {
  abierto: 'var(--accent)',
  en_recepcion: 'var(--primary)',
  en_evaluacion: 'var(--warning)',
  adjudicado: 'var(--secondary)',
  en_desarrollo: 'var(--primary)',
  finalizado: 'var(--color-foreground)',
  cancelado: 'var(--destructive)',
  borrador: 'var(--color-muted-foreground)',
}
const STATUS_COLOR_FALLBACK = 'var(--color-muted-foreground)'

const CHART_GRID_COLOR = 'var(--color-border)'
const CHART_AXIS_TEXT_COLOR = 'var(--color-muted-foreground)'
const CHART_AXIS_TEXT_STRONG_COLOR = 'var(--color-foreground)'
const CHART_CURSOR_COLOR = 'var(--color-muted)'

const PROJECT_TITLE_MAX_LENGTH = 22

export function DashboardCharts({
  projects,
  countsByProject,
}: DashboardChartsProps) {
  const t = useTranslations('CompanyDashboardCharts')
  const tStatus = useTranslations('ProjectsBoard')

  if (projects.length === 0) return null

  // 1. Postulaciones por proyecto
  const postulationsData = projects.map((p) => ({
    name:
      p.titulo.length > PROJECT_TITLE_MAX_LENGTH
        ? p.titulo.substring(0, PROJECT_TITLE_MAX_LENGTH) + '...'
        : p.titulo,
    postulaciones: countsByProject[p.id] || 0,
  }))

  // 2. Tecnologías más solicitadas
  const techCounts: Record<string, number> = {}
  projects.forEach((p) => {
    p.tecnologias.forEach((tech) => {
      techCounts[tech] = (techCounts[tech] || 0) + 1
    })
  })

  const techData = Object.entries(techCounts)
    .map(([tech, count]) => ({ name: tech.toUpperCase(), proyectos: count }))
    .sort((a, b) => b.proyectos - a.proyectos)
    .slice(0, 5)

  // 3. Distribución de estados
  const statusCounts: Record<string, number> = {}
  projects.forEach((p) => {
    statusCounts[p.estadoEfectivo] = (statusCounts[p.estadoEfectivo] || 0) + 1
  })

  const statusData: StatusDatum[] = Object.entries(statusCounts).map(
    ([estado, count]) => ({
      name: tStatus(`status_${estado}`),
      value: count,
      color: STATUS_COLOR_TOKENS[estado] ?? STATUS_COLOR_FALLBACK,
    }),
  )

  // Custom Tooltip para Postulaciones
  const CustomTooltipPostulaciones = ({
    active,
    payload,
    label,
  }: Partial<TooltipContentProps>) => {
    const entry = payload?.[0]
    if (active && entry) {
      const count = typeof entry.value === 'number' ? entry.value : 0
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
          <div className="flex items-center gap-2 text-primary font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>{t('applicantsCount', { count })}</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Tooltip para Tecnologías
  const CustomTooltipTech = ({
    active,
    payload,
    label,
  }: Partial<TooltipContentProps>) => {
    const entry = payload?.[0]
    if (active && entry) {
      const count = typeof entry.value === 'number' ? entry.value : 0
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-semibold text-foreground text-sm mb-1 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-center gap-2 text-secondary font-bold">
            <Cpu className="w-4 h-4" />
            <span>{t('projectsCount', { count })}</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Tooltip para Estados (Pie Chart)
  const CustomTooltipPie = ({
    active,
    payload,
  }: Partial<TooltipContentProps>) => {
    const entry = payload?.[0]
    if (active && entry) {
      const datum = entry.payload as StatusDatum
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: datum.color }}
          />
          <div>
            <p className="font-bold text-foreground text-sm">{datum.name}</p>
            <p className="text-muted-foreground text-xs font-medium">
              {t('projectsCount', { count: datum.value })}
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
            <div className="p-2 bg-primary/10 rounded-lg shadow-inner">
              <BarChartIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('chartApplicationsTitle')}
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                {t('chartApplicationsDesc')}
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
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0.55}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={CHART_GRID_COLOR}
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                    fill: CHART_AXIS_TEXT_COLOR,
                    fontWeight: 500,
                  }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_GRID_COLOR, strokeWidth: 1.5 }}
                  dy={10}
                />
                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: CHART_AXIS_TEXT_COLOR,
                    fontWeight: 500,
                  }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: CHART_CURSOR_COLOR, opacity: 0.4 }}
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
                {t('chartApplicationsEmpty')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Tecnologías más solicitadas */}
      <Card className="border-border/40 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col bg-gradient-to-b from-card to-muted/10 rounded-2xl">
        <CardHeader className="pb-6 pt-7 px-7 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg shadow-inner">
              <Code2 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('chartTechTitle')}
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                {t('chartTechDesc')}
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
                    <stop
                      offset="0%"
                      stopColor="var(--secondary)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--secondary)"
                      stopOpacity={1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={CHART_GRID_COLOR}
                  strokeOpacity={0.4}
                />
                <XAxis
                  type="number"
                  tick={{
                    fontSize: 12,
                    fill: CHART_AXIS_TEXT_COLOR,
                    fontWeight: 500,
                  }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_GRID_COLOR, strokeWidth: 1.5 }}
                  allowDecimals={false}
                  dy={10}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{
                    fontSize: 11,
                    fill: CHART_AXIS_TEXT_STRONG_COLOR,
                    fontWeight: 700,
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={85}
                  dx={-5}
                />
                <Tooltip
                  cursor={{ fill: CHART_CURSOR_COLOR, opacity: 0.4 }}
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
              <p className="text-sm font-medium">{t('chartTechEmpty')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 3: Estado de Proyectos (Donut) */}
      <Card className="border-border/40 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col bg-gradient-to-b from-card to-muted/10 rounded-2xl lg:col-span-1">
        <CardHeader className="pb-6 pt-7 px-7 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg shadow-inner">
              <PieChartIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('chartStatusTitle')}
              </CardTitle>
              <CardDescription className="pt-1.5 text-xs font-medium text-muted-foreground/80">
                {t('chartStatusDesc')}
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
              <p className="text-sm font-medium">{t('chartStatusEmpty')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
