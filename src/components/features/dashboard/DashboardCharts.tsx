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
import { BarChart as BarChartIcon, Code2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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
    name: p.titulo.length > 20 ? p.titulo.substring(0, 20) + '...' : p.titulo,
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

  // Usaremos colores HEX fijos para evitar problemas de SVG con variables CSS de Tailwind
  const primaryColor = '#2563eb' // blue-600
  const accentColor = '#8b5cf6' // violet-500

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
      {/* Chart 1: Postulaciones por Proyecto */}
      <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="pb-4 bg-muted/20 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <BarChartIcon className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">
              Postulaciones por Proyecto
            </CardTitle>
          </div>
          <CardDescription className="pt-1">
            Cantidad de candidatos que han aplicado a cada una de tus
            publicaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 h-[350px] w-full min-h-[350px] flex-1">
          {postulationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={postulationsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '8px',
                    color: '#111827',
                  }}
                  itemStyle={{ color: primaryColor, fontWeight: 'bold' }}
                />
                <Bar
                  dataKey="postulaciones"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  {postulationsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={primaryColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground text-center flex items-center justify-center h-full">
              No hay datos suficientes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Tecnologías más solicitadas */}
      <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="pb-4 bg-muted/20 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent/10 rounded-md">
              <Code2 className="w-5 h-5 text-accent" />
            </div>
            <CardTitle className="text-lg">Top 5 Tecnologías</CardTitle>
          </div>
          <CardDescription className="pt-1">
            Lenguajes y herramientas más solicitados en tus requerimientos.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 h-[350px] w-full min-h-[350px] flex-1">
          {techData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={techData}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: '#111827', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '8px',
                    color: '#111827',
                  }}
                  itemStyle={{ color: accentColor, fontWeight: 'bold' }}
                />
                <Bar dataKey="proyectos" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {techData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={accentColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground text-center flex items-center justify-center h-full">
              Aún no has especificado tecnologías.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
