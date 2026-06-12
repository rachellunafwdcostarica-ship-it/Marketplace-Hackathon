'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
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
  Compass,
  Send,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react'

export function SidebarEmpresaNuevo() {
  const t = useTranslations('EmpresaPerfil')
  const [activeMenu, setActiveMenu] = useState<string>('explorar')
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

  const menuItems = [
    { id: 'explorar', label: t('menuExplorar'), icon: Compass },
    { id: 'postulaciones', label: t('menuPostulaciones'), icon: Send },
    { id: 'mensajes', label: t('menuMensajes'), icon: MessageSquare },
    { id: 'configuracion', label: t('menuConfiguracion'), icon: Settings },
  ]

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
      {/* Menú de navegación principal */}
      <nav className="flex flex-col gap-1 px-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveMenu(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}

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
      </nav>

      {/* Botón de Actualizar Plan (Estilo botón púrpura del mockup) */}
      <div className="pt-2 px-1">
        <button
          type="button"
          onClick={() => {
            toast.info(t('actualizarPlanToast'))
          }}
          className="w-full bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold py-3.5 px-4 rounded-xl text-sm text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {t('menuActualizarPlan')}
        </button>
      </div>
    </aside>
  )
}
