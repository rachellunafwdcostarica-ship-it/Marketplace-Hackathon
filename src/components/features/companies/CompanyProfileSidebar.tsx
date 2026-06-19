'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Company } from '@/types'
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
import { Loader2, LogOut, HelpCircle } from 'lucide-react'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { cn } from '@/lib/utils/cn'
import { useRouter } from '@/i18n/routing'
import { useAuth } from '@/lib/auth/AuthContext'

interface CompanyProfileSidebarProps {
  company: Company | undefined
  activeTab: 'profile' | 'projects'
  setActiveTab: (tab: 'profile' | 'projects') => void
  className?: string
  onNavigate?: () => void
  hideLogo?: boolean
}

export function CompanyProfileSidebar({
  company,
  activeTab,
  setActiveTab,
  className,
  onNavigate,
  hideLogo = false,
}: CompanyProfileSidebarProps) {
  const t = useTranslations('EmpresaPerfil')
  const router = useRouter()
  const { resetAuth } = useAuth()

  const verifKey =
    company?.status === 'approved'
      ? 'verifVerified'
      : company?.status === 'rejected'
        ? 'verifRejected'
        : 'verifPending'

  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [supportDescription, setSupportDescription] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (supportDescription.length < 15) {
      toast.error(t('supportMinLength'))
      return
    }
    setSubmittingSupport(true)
    const res = await createSupportTicket(supportDescription)
    setSubmittingSupport(false)
    if (res.ok) {
      toast.success(t('supportSuccess'))
      setSupportDescription('')
      setIsSupportOpen(false)
    } else {
      toast.error(res.error)
    }
  }

  const handleLogout = async () => {
    const { signOut } = await import('@/lib/auth/actions')
    await signOut()
    resetAuth()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'w-full lg:w-64 shrink-0 flex flex-col gap-6 text-white p-5 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden',
        className,
      )}
      style={{
        backgroundColor: 'var(--secondary)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0 L30 30 L0 60 Z M60 0 L30 30 L60 60 Z' fill='%23f7f9fa' fill-opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Brand logo header */}
      {!hideLogo && (
        <div className="flex items-center gap-3 px-5 py-5 hover:opacity-90 transition-opacity z-10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <FwdLogo className="h-6 w-6" />
          </div>
          <span className="font-heading text-base font-bold tracking-tight leading-tight text-white">
            Marketplace<span className="text-magenta"> FWD</span>
          </span>
        </div>
      )}

      {/* Divider */}
      {!hideLogo && <div className="mx-4 mb-3 h-px bg-white/10 z-10" />}

      {/* Header del Sidebar (Información de la empresa) */}
      <div className="mx-3 mb-3 bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-2.5 z-10">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/20 overflow-hidden">
          {company?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo}
              alt={company.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-lg tracking-wider">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'F'}
            </span>
          )}
        </div>
        <div className="text-left min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">
            {company?.name || t('sidebarHeader')}
          </h3>
          <span
            className={cn(
              'inline-block text-[10px] font-bold uppercase tracking-wider mt-0.5',
              company?.status === 'approved'
                ? 'text-success'
                : company?.status === 'rejected'
                  ? 'text-destructive'
                  : 'text-warning',
            )}
          >
            {t(verifKey)}
          </span>
        </div>
      </div>

      {/* Menú de navegación principal (morado premium) */}
      <nav className="flex flex-col gap-1.5 px-3 flex-1 z-10">
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile')
            onNavigate?.()
          }}
          className={cn(
            'w-full text-left px-4 py-2.5 rounded-full text-sm font-semibold flex items-center justify-between transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-secondary to-magenta text-white shadow-md font-bold'
              : 'text-white/75 hover:bg-white/10 hover:text-white/90',
          )}
        >
          <span>{t('tabProfile')}</span>
          {activeTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('projects')
            onNavigate?.()
          }}
          className={cn(
            'w-full text-left px-4 py-2.5 rounded-full text-sm font-semibold flex items-center justify-between transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            activeTab === 'projects'
              ? 'bg-gradient-to-r from-secondary to-magenta text-white shadow-md font-bold'
              : 'text-white/75 hover:bg-white/10 hover:text-white/90',
          )}
        >
          <span>{t('tabProjects')}</span>
          {activeTab === 'projects' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </nav>

      {/* Botones de acción del Sidebar */}
      <div className="p-3 pt-0 z-10">
        <div className="h-px bg-white/10 mb-3" />
        <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white/65 hover:bg-white/8 hover:text-white/90 transition-all cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('support')}</span>
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
                  disabled={submittingSupport}
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
                >
                  {submittingSupport && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {t('supportSubmit')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2 cursor-pointer mt-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  )
}
