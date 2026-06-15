import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingRoleForm } from '@/components/features/auth/OnboardingRoleForm'

type OnboardingRole = 'egresado' | 'empresario'

/**
 * El registro guarda el rol elegido en el user metadata ('egresado' | 'empresario').
 * Lo leemos en el servidor y lo pasamos como preselección al formulario; el
 * usuario confirma en vez de re-elegir desde cero (RF-01). La asignación real
 * sigue ocurriendo en assignRole → assign_my_role.
 *
 * Compatibilidad hacia atrás: usuarios que registraron con el valor antiguo
 * 'empresa' en metadata quedan mapeados a 'empresario'.
 */
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const metadataRole: unknown = user?.user_metadata?.role
  const initialRole: OnboardingRole =
    metadataRole === 'empresario' || metadataRole === 'empresa'
      ? 'empresario'
      : 'egresado'

  return <OnboardingRoleForm initialRole={initialRole} />
}
