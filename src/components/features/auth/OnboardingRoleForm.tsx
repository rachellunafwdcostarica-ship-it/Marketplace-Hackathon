'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { RoleCard } from '@/components/features/auth/RoleCard'
import { assignRole, registrarConsentimientoCotejo } from '@/lib/auth/actions'

type OnboardingRole = 'egresado' | 'empresario'

interface OnboardingRoleFormProps {
  /** Rol elegido en el registro (user metadata); se usa como preselección. */
  initialRole: OnboardingRole
}

export function OnboardingRoleForm({ initialRole }: OnboardingRoleFormProps) {
  const tAuth = useTranslations('Auth')
  const tOnboarding = useTranslations('Onboarding')
  const router = useRouter()

  const [selected, setSelected] = useState<OnboardingRole>(initialRole)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    // RNF-38: el egresado debe consentir el cotejo de su correo contra la base
    // de egresados FWD antes de continuar.
    if (selected === 'egresado' && !consent) {
      toast.error(tOnboarding('consentRequired'))
      return
    }

    setLoading(true)

    if (selected === 'egresado') {
      const consentResult = await registrarConsentimientoCotejo()
      if (!consentResult.ok) {
        setLoading(false)
        toast.error(tOnboarding('errorGeneric'))
        return
      }
    }

    const result = await assignRole({ role: selected })

    setLoading(false)

    if (result.ok || result.error === 'role_already_assigned') {
      if (selected === 'empresario') {
        // El empresario completa su perfil antes de ir a la pantalla de espera.
        router.push('/onboarding/empresario')
      } else {
        // El egresado queda en espera de verificación de su correo FWD.
        router.push('/pending-approval')
      }
      return
    }

    toast.error(tOnboarding('errorGeneric'))
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <AuthHeader
          welcomeText={tAuth('welcome')}
          title="Adelante"
          subtitle={tOnboarding('subtitle')}
        />

        <div className="space-y-3.5 my-6">
          <RoleCard
            title={tAuth('roleEgresadoTitle')}
            description={tAuth('roleEgresadoDesc')}
            iconName="GraduationCap"
            selected={selected === 'egresado'}
            onClick={() => setSelected('egresado')}
          />

          <RoleCard
            title={tAuth('roleCompanyTitle')}
            description={tAuth('roleCompanyDesc')}
            iconName="Building2"
            selected={selected === 'empresario'}
            onClick={() => setSelected('empresario')}
          />
        </div>

        {selected === 'egresado' && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>{tOnboarding('consentLabel')}</span>
          </label>
        )}

        <Button
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer"
        >
          {loading ? tOnboarding('loading') : tAuth('continue')}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </AuthCard>
  )
}
