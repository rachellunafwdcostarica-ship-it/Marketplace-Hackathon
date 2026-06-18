'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowRight, Database } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { assignRole } from '@/lib/auth/actions'
import { registrarConsentimientoCotejo } from '@/lib/auth/actions'

export function EgresadoConsentScreen() {
  const tO = useTranslations('Onboarding')
  const router = useRouter()

  const [consentFWD, setConsentFWD] = useState(false)
  const [consentTerminos, setConsentTerminos] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!consentFWD) {
      toast.error(tO('consentRequired'))
      return
    }
    if (!consentTerminos) {
      toast.error(tO('terminosRequired'))
      return
    }

    setLoading(true)

    const consentResult = await registrarConsentimientoCotejo()
    if (!consentResult.ok) {
      setLoading(false)
      toast.error(tO('errorGeneric'))
      return
    }

    const roleResult = await assignRole({ role: 'egresado' })
    setLoading(false)

    if (roleResult.ok || roleResult.error === 'role_already_assigned') {
      router.push('/pending-approval')
      return
    }

    toast.error(tO('errorGeneric'))
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Database className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold font-heading text-ink-strong">
            {tO('egresadoTitle')}
            <span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            {tO('egresadoMessage')}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={consentFWD}
              onChange={(e) => setConsentFWD(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              {tO('consentLabel')}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={consentTerminos}
              onChange={(e) => setConsentTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              {tO('terminosLabel')}
            </span>
          </label>
        </div>

        <Button
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] cursor-pointer"
        >
          {loading ? tO('loading') : tO('saveProfile')}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </AuthCard>
  )
}
