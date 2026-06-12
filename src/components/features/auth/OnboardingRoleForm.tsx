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
import { assignRole } from '@/lib/auth/actions'
import { ROLE_HOME } from '@/lib/auth/roles'
import type { UserRole } from '@/types'

type OnboardingRole = 'junior' | 'empresa'

interface OnboardingRoleFormProps {
  /** Rol elegido en el registro (user metadata); se usa como preselección. */
  initialRole: OnboardingRole
}

export function OnboardingRoleForm({ initialRole }: OnboardingRoleFormProps) {
  const tAuth = useTranslations('Auth')
  const tOnboarding = useTranslations('Onboarding')
  const router = useRouter()

  const [selected, setSelected] = useState<OnboardingRole>(initialRole)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    setLoading(true)

    // La BD usa 'empresario'; la UI usa 'empresa'
    const dbRole = selected === 'empresa' ? 'empresario' : 'junior'
    const result = await assignRole({ role: dbRole })

    setLoading(false)

    if (result.ok || result.error === 'role_already_assigned') {
      // Idempotente: si ya tenía rol, ir a su home igualmente
      router.push(ROLE_HOME[selected as UserRole])
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
            title={tAuth('roleJuniorTitle')}
            description={tAuth('roleJuniorDesc')}
            iconName="GraduationCap"
            selected={selected === 'junior'}
            onClick={() => setSelected('junior')}
          />

          <RoleCard
            title={tAuth('roleCompanyTitle')}
            description={tAuth('roleCompanyDesc')}
            iconName="Building2"
            selected={selected === 'empresa'}
            onClick={() => setSelected('empresa')}
          />
        </div>

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
