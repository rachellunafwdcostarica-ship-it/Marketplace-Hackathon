import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EgresadoConsentScreen } from '@/components/features/auth/EgresadoConsentScreen'

/**
 * Onboarding genérico: egresados y usuarios OAuth sin rol en BD todavía.
 *
 * Prioridad de enrutado:
 * 1. Sin usuario → /login
 * 2. Metadata dice 'empresario' (OAuth con rol elegido en register) → /onboarding/empresario
 * 3. Todo lo demás → formulario de egresado (cotejo FWD + T&C)
 *
 * El middleware (CASO D) garantiza que cuentas con rol 'empresario' ya asignado
 * en BD sean redirigidas a /onboarding/empresario antes de llegar aquí.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const metaRole = user.user_metadata?.role as string | undefined
  if (metaRole === 'empresario' || metaRole === 'empresa') {
    redirect('/onboarding/empresario')
  }

  return <EgresadoConsentScreen />
}
