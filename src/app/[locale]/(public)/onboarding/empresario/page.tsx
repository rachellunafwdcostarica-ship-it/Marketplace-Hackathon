import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole } from '@/lib/auth/roles'
import { EmpresarioOnboardingForm } from '@/components/features/auth/EmpresarioOnboardingForm'

export default async function EmpresarioOnboardingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  if (role !== 'empresario') {
    redirect('/pending-approval')
  }

  return <EmpresarioOnboardingForm userId={user.id} />
}
