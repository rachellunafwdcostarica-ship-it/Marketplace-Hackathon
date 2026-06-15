import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface EgresadoShellProps {
  children: ReactNode
}

export function EgresadoShell({ children }: EgresadoShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
