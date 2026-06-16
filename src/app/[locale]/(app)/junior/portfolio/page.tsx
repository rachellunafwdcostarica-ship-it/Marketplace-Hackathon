import React from 'react'
import { PortfolioManager } from '@/components/features/marketplace/PortfolioManager'

export default function PortfolioPage() {
  return (
    <div className="container mx-auto py-10 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Mi Portafolio Profesional
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los proyectos de tu portafolio para mostrar tu experiencia,
          habilidades y proyectos completados a las empresas reclutadoras.
        </p>
      </div>

      <PortfolioManager />
    </div>
  )
}
