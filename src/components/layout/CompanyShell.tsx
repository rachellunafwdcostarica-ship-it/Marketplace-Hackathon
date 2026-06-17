'use client'

import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { SidebarEmpresaNuevo } from './SidebarEmpresaNuevo'

interface CompanyShellProps {
  children: ReactNode
}

/**
 * Shell para la vista de Empresario (Empresa) que mantiene la Navbar principal en la parte superior.
 * El sidebar morado se posiciona a la izquierda, ocupando todo el alto disponible debajo de la Navbar en escritorio.
 */
export function CompanyShell({ children }: CompanyShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f6fa]">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Sidebar morado de alto completo debajo de la Navbar en desktop */}
        <SidebarEmpresaNuevo className="w-full md:w-56 bg-[#3d1a6e] text-white shrink-0 md:sticky md:top-16 md:h-[calc(100vh-64px)]" />

        {/* Área de contenido principal */}
        <main className="flex-1 p-6 md:p-8 min-w-0 bg-[#f5f6fa]">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  )
}
