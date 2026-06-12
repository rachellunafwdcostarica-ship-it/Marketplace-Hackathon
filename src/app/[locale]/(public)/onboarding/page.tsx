import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingRoleForm } from '@/components/features/auth/OnboardingRoleForm'

type OnboardingRole = 'junior' | 'empresa'

/**
 * El registro guarda el rol elegido en el user metadata ('junior' | 'empresa').
 * Lo leemos en el servidor y lo pasamos como preselección al formulario; el
 * usuario confirma en vez de re-elegir desde cero (RF-01). La asignación real
 * sigue ocurriendo en assignRole → assign_my_role.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const metadataRole: unknown = user?.user_metadata?.role
  const initialRole: OnboardingRole =
    metadataRole === 'empresa' ? 'empresa' : 'junior'

  return <OnboardingRoleForm initialRole={initialRole} />
}
