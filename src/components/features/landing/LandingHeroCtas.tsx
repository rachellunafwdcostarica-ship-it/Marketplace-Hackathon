'use client'

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import type { UserRole } from '@/types'

interface HeroCta {
  href: string
  labelKey: string
}

// CTA principal del hero por rol: lleva a la acción central de cada perfil.
const PRIMARY_CTA_BY_ROLE: Record<UserRole, HeroCta> = {
  egresado: { href: '/egresado/projects', labelKey: 'ctaFindProjects' },
  empresario: {
    href: '/empresario/new-project',
    labelKey: 'ctaPublishProject',
  },
  administrador: { href: '/admin', labelKey: 'ctaGoToPanel' },
}

// CTA secundario (estilo contorno): atajo al panel propio. El admin no lo usa.
const SECONDARY_CTA_BY_ROLE: Record<UserRole, HeroCta | null> = {
  egresado: { href: '/egresado', labelKey: 'ctaGoToPanel' },
  empresario: { href: '/empresario', labelKey: 'ctaGoToPanel' },
  administrador: null,
}

/**
 * Botones del hero de la landing, adaptados al rol de la sesión actual.
 * Sin rol asignado → CTA al onboarding (defensa en profundidad; el middleware
 * ya redirige, pero evita enlaces rotos si el cliente adelanta el render).
 */
export function LandingHeroCtas() {
  const t = useTranslations('Landing')
  const { userRole } = useAuth()

  if (!userRole) {
    return (
      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          href="/onboarding"
          className="shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          {t('ctaCompleteOnboarding')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const primary = PRIMARY_CTA_BY_ROLE[userRole]
  const secondary = SECONDARY_CTA_BY_ROLE[userRole]

  return (
    <div className="flex flex-wrap gap-4 pt-2">
      <Link
        href={primary.href}
        className="shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
        style={{
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
      >
        {t(primary.labelKey)}
        <ArrowRight className="w-4 h-4" />
      </Link>
      {secondary && (
        <Link
          href={secondary.href}
          className="transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            border:
              '1.5px solid color-mix(in oklch, var(--surface) 60%, transparent)',
            color: 'var(--surface)',
            background: 'color-mix(in oklch, var(--surface) 8%, transparent)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {t(secondary.labelKey)}
        </Link>
      )}
    </div>
  )
}
