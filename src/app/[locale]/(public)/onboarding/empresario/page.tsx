import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole } from '@/lib/auth/roles'
import { EmpresarioOnboardingForm } from '@/components/features/auth/EmpresarioOnboardingForm'

export default async function EmpresarioOnboardingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  // Si tiene un rol distinto a empresario, no puede estar aquí.
  if (role && role !== 'empresario') redirect('/pending-approval')

  // Sin rol: asignar empresario. El usuario llegó aquí desde el register
  // habiendo elegido explícitamente ese rol. El middleware (CASO F) ya
  // bloqueó a cualquier usuario con rol incorrecto en la BD.
  if (!role) {
    await supabase.rpc('assign_my_role', { p_role: 'empresario' })
  }

  return <EmpresarioOnboardingForm userId={user.id} />
}
