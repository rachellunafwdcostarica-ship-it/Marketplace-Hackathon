'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { RoleCard } from '@/components/features/auth/RoleCard'
import { useAppState } from '@/lib/stateContext'
import { UserRole } from '@/types'
import { ArrowRight } from 'lucide-react'

export default function RoleSelectPage() {
  const tAuth = useTranslations('Auth')
  const router = useRouter()
  const { userRole, setUserRole } = useAppState()
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    userRole || 'junior',
  )

  const handleContinue = () => {
    setUserRole(selectedRole)
    // Redirigir directamente al dashboard del rol seleccionado
    router.push(`/${selectedRole}`)
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <AuthHeader
          welcomeText={tAuth('welcome')}
          title="Adelante"
          subtitle={tAuth('roleTitle')}
        />

        <div className="space-y-3.5 my-6">
          <RoleCard
            title={tAuth('roleJuniorTitle')}
            description={tAuth('roleJuniorDesc')}
            iconName="GraduationCap"
            selected={selectedRole === 'junior'}
            onClick={() => setSelectedRole('junior')}
          />

          <RoleCard
            title={tAuth('roleCompanyTitle')}
            description={tAuth('roleCompanyDesc')}
            iconName="Building2"
            selected={selectedRole === 'empresa'}
            onClick={() => setSelectedRole('empresa')}
          />

          <RoleCard
            title={tAuth('roleAdminTitle')}
            description={tAuth('roleAdminDesc')}
            iconName="ShieldCheck"
            selected={selectedRole === 'admin'}
            onClick={() => setSelectedRole('admin')}
          />
        </div>

        <Button
          onClick={handleContinue}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer"
        >
          {tAuth('continue')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </AuthCard>
  )
}
