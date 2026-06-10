import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { AccountStatusProvider } from '@/components/features/auth/AccountStatusContext'
import { PendingAccountBanner } from '@/components/features/auth/PendingAccountBanner'

/**
 * Layout del grupo (company) — rutas de empresario.
 * Verifica que el usuario esté autenticado, tenga rol 'empresa',
 * e inyecta el estado de la cuenta en AccountStatusProvider.
 */
export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const [{ data: roleRaw }, { data: estadoCuenta }] = await Promise.all([
    supabase.rpc('get_my_role'),
    supabase.rpc('get_my_account_status'),
  ])

  const role = normalizeRole(roleRaw as string | null)

  if (!role) {
    redirect(`/${locale}/onboarding`)
  }

  if (role !== 'empresa') {
    redirect(`/${locale}${ROLE_HOME[role]}`)
  }

  const estado = estadoCuenta as string | null

  return (
    <AccountStatusProvider estadoCuenta={estado}>
      {estado !== 'activa' && <PendingAccountBanner />}
      {children}
    </AccountStatusProvider>
  )
}
