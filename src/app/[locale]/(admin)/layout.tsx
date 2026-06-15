import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/dal'
import { DemoDataProvider } from '@/lib/DemoDataContext'
import { AdminShell } from '@/components/layout/AdminShell'

/**
 * Layout del grupo (admin).
 * Verifica que el usuario esté autenticado y tenga rol 'administrador'.
 * Los administradores no tienen estado pendiente — se crean via service_role.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const supabase = await createSupabaseServerClient()
  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  if (!role) {
    redirect(`/${locale}/onboarding`)
  }

  if (role !== 'administrador') {
    redirect(`/${locale}${ROLE_HOME[role]}`)
  }

  return (
    <DemoDataProvider>
      <AdminShell>{children}</AdminShell>
    </DemoDataProvider>
  )
}
