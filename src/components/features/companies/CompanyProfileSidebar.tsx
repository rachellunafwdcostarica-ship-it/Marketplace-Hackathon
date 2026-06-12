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
import { Loader2 } from 'lucide-react'

interface CompanyProfileSidebarProps {
  company: Company | undefined
  activeTab: 'profile' | 'projects'
  setActiveTab: (tab: 'profile' | 'projects') => void
}

export function CompanyProfileSidebar({
  company,
  activeTab,
  setActiveTab,
}: CompanyProfileSidebarProps) {
  const t = useTranslations('EmpresaPerfil')

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

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
      {/* Header del Sidebar */}
      <div className="bg-surface border border-border p-5 rounded-2xl flex items-center gap-3">
        {/* Logo de FWD estilizado geométricamente con CSS */}
        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0 border border-primary overflow-hidden">
          {company?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo}
              alt={company.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-secondary-foreground font-bold text-lg tracking-wider">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'F'}
            </span>
          )}
        </div>
        <div className="text-left">
          <h3 className="font-bold text-foreground text-sm leading-tight">
            {company?.name || t('sidebarHeader')}
          </h3>
          <span className="inline-block text-[10px] text-accent font-bold uppercase tracking-wider">
            {t('verifiedCompany')}
          </span>
        </div>
      </div>

      {/* Menú de navegación principal (sin iconos) */}
      <nav className="bg-surface border border-border p-3 rounded-2xl flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
            activeTab === 'profile'
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <span>{t('tabProfile')}</span>
          {activeTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
            activeTab === 'projects'
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <span>{t('tabProjects')}</span>
          {activeTab === 'projects' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabHistory')}
        </button>
        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabTeam')}
        </button>
        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabAnalytics')}
        </button>
      </nav>

      {/* Botones de acción del Sidebar */}
      <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                {t('support')}
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
                    {supportDescription.length}/15 caracteres mínimo
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
                    Cancelar
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
            className="w-full text-left px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 rounded px-1.5 transition-all"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
  )
}
