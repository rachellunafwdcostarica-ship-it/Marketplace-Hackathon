'use client'

import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { SidebarEmpresaNuevo } from './SidebarEmpresaNuevo'

interface CompanyShellProps {
  children: ReactNode
}

/**
 * Shell para la vista de Empresario (Empresa) que mantiene la Navbar principal y el Footer,
 * integrando el nuevo sidebar morado en el layout de dos columnas.
 */
export function CompanyShell({ children }: CompanyShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo className="rounded-2xl border border-border/40 shadow-sm" />

        <main className="flex-1 space-y-8">{children}</main>
      </div>

      <Footer />
    </div>
  )
}
