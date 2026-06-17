'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createSupportTicket } from '@/lib/company/actions'
import {
  Loader2,
  LayoutDashboard,
  Send,
  MessageSquare,
  Building2,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  id: string
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

interface SidebarEmpresaNuevoProps {
  className?: string
  onNavigate?: () => void
}

export function SidebarEmpresaNuevo({
  className,
  onNavigate,
}: SidebarEmpresaNuevoProps) {
  const t = useTranslations('EmpresaPerfil')
  const pathname = usePathname()
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [supportDescription, setSupportDescription] = useState('')
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false)

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (supportDescription.length < 15) {
      toast.error(t('supportMinLength'))
      return
    }
    setIsSubmittingSupport(true)
    const res = await createSupportTicket(supportDescription)
    setIsSubmittingSupport(true) // will be set to false below
    setIsSubmittingSupport(false)
    if (res.ok) {
      toast.success(t('supportSuccess'))
      setSupportDescription('')
      setIsSupportOpen(false)
    } else {
      toast.error(res.error)
    }
  }

  const navItems: NavItem[] = [
    {
      id: 'panel',
      href: '/empresario',
      label: t('menuPanel'),
      icon: LayoutDashboard,
      isActive: (path) =>
        path === '/empresario' ||
        path.startsWith('/empresario/proyecto') ||
        path.startsWith('/empresario/new-project'),
    },
    {
      id: 'postulaciones',
      href: '/empresario/postulaciones',
      label: t('menuPostulaciones'),
      icon: Send,
      isActive: (path) => path.startsWith('/empresario/postulaciones'),
    },
    {
      id: 'mensajes',
      href: '/empresario/mensajes',
      label: t('menuMensajes'),
      icon: MessageSquare,
      isActive: (path) => path.startsWith('/empresario/mensajes'),
    },
    {
      id: 'perfil',
      href: '/empresario/perfil',
      label: t('menuPerfil'),
      icon: Building2,
      isActive: (path) =>
        path.startsWith('/empresario/perfil') ||
        path.startsWith('/empresario/formulario-empresa'),
    },
  ]

  return (
    <aside
      className={cn(
        'w-full md:w-56 shrink-0 flex flex-col bg-[#3d1a6e] text-white py-6',
        className,
      )}
    >
      {/* Nav list */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                active
                  ? 'bg-gradient-to-r from-[#ec008c] to-[#ec008c]/80 text-white shadow-sm font-bold'
                  : 'text-white/65 hover:bg-white/8 hover:text-white/90',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-white' : 'text-white/55',
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Dialog for help/support */}
        <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate()
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white/90 transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-white/55" />
              <span>{t('menuAyuda')}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground font-heading font-extrabold text-lg text-left">
                {t('supportModalTitle')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1 text-left">
                {t('supportModalDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSupportSubmit} className="space-y-4 pt-4">
              <div className="space-y-2 text-left">
                <Label
                  htmlFor="description"
                  className="text-xs font-bold text-foreground"
                >
                  {t('supportFieldDesc')}
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder={t('supportPlaceholder')}
                  value={supportDescription}
                  onChange={(e) => setSupportDescription(e.target.value)}
                  className="bg-card/50 border-border focus-visible:ring-primary text-sm"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {supportDescription.length}/15 {t('supportMinCharsInfo')}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSupportOpen(false)}
                  className="text-xs font-semibold"
                >
                  {t('cancelar')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingSupport}
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
                >
                  {isSubmittingSupport && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {t('supportSubmit')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </nav>
    </aside>
  )
}
