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
        <main className="flex-1 overflow-y-auto flex flex-col relative min-h-0">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
