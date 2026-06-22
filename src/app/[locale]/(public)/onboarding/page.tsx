import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EgresadoConsentScreen } from '@/components/features/auth/EgresadoConsentScreen'
import { EmpresarioOnboardingForm } from '@/components/features/auth/EmpresarioOnboardingForm'
import { getCountryOptions } from '@/lib/geo/catalog'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const metaRole = user.user_metadata?.role as string | undefined

  if (metaRole === 'empresario' || metaRole === 'empresa') {
    const locale = await getLocale()
    const countries = getCountryOptions(locale).map((country) => ({
      value: country.code,
      label: country.name,
    }))
    return <EmpresarioOnboardingForm userId={user.id} countries={countries} />
  }

  return <EgresadoConsentScreen />
}
