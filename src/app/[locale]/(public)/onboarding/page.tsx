import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EgresadoConsentScreen } from '@/components/features/auth/EgresadoConsentScreen'
import { EmpresarioOnboardingForm } from '@/components/features/auth/EmpresarioOnboardingForm'
import { getCountryOptions } from '@/lib/geo/catalog'

function safeOnboardingRole(
  raw: string | undefined,
): 'egresado' | 'empresario' | null {
  if (raw === 'egresado') return 'egresado'
  if (raw === 'empresario' || raw === 'empresa') return 'empresario'
  return null
}

/**
 * Onboarding unificado (Camino B / OAuth). El usuario llega con sesión y correo
 * confirmado por el proveedor, pero sin rol ni perfil. Según el rol elegido en
 * el registro (`user_metadata.role`, fijado por el callback) muestra el form de
 * egresado o el de empresario; ambos llaman a `completarOnboarding`
 * (`crearPerfilUsuario` con service_role). El registro por contraseña (Camino A)
 * NO pasa por aquí: crea su perfil en el alta.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const locale = await getLocale()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const metaRole = safeOnboardingRole(
    user.user_metadata?.role as string | undefined,
  )

  if (!metaRole) {
    await supabase.auth.signOut()
    redirect(`/${locale}/register?error=missing_role`)
  }

  if (metaRole === 'empresario') {
    const countries = getCountryOptions(locale).map((country) => ({
      value: country.code,
      label: country.name,
    }))
    return <EmpresarioOnboardingForm userId={user.id} countries={countries} />
  }

  return <EgresadoConsentScreen />
}
