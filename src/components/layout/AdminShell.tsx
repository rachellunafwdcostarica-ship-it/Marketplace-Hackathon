import type { ReactNode } from 'react'
import { SidebarAdmin } from './SidebarAdmin'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <SidebarAdmin className="hidden md:flex" />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}
