import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { SidebarEgresado } from './SidebarEgresado'

interface EgresadoShellProps {
  children: ReactNode
}

export function EgresadoShell({ children }: EgresadoShellProps) {
  return (
    <div className="flex h-screen flex-col bg-canvas overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <SidebarEgresado />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {/* Ocultamos el Footer global en layouts con sidebar si es necesario, o lo metemos en el main */}
      <div className="hidden">
        <Footer />
      </div>
    </div>
  )
}
