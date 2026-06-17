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

interface NavItem {
  id: string
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

export function SidebarEmpresaNuevo() {
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
    setIsSubmittingSupport(false)
    if (res.ok) {
      toast.success(t('supportSuccess'))
      setSupportDescription('')
      setIsSupportOpen(false)
    } else {
      toast.error(res.error)
    }
  }

  // El highlight sigue la SECCIÓN, no solo la URL exacta: las subrutas de
  // proyecto/new-project cuentan como Panel; formulario-empresa como Perfil.
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
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
      <nav className="flex flex-col gap-1 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Mensajes: fuera del MVP. Se muestra deshabilitado con "Próximamente". */}
        <div
          aria-disabled="true"
          title={t('comingSoon')}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 text-muted-foreground/50 cursor-not-allowed select-none"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>{t('menuMensajes')}</span>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground/70 px-1.5 py-0.5 rounded">
            {t('comingSoon')}
          </span>
        </div>

        {/* Ayuda / Soporte Técnico abre el Dialog */}
        <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
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
