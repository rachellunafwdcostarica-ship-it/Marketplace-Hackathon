'use client'

import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface CompanyShellProps {
  children: ReactNode
}

/**
 * Shell para la vista de Empresario (Empresa) que mantiene la Navbar principal en la parte superior.
 */
export function CompanyShell({ children }: CompanyShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
