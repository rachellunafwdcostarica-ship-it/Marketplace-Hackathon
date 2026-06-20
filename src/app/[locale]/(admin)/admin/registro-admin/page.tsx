import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { getCurrentUser } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { AdminRegisterForm } from '@/components/features/admin/AdminRegisterForm'

/**
 * Registro de administradores (solo superadmin).
 *
 * Defensa en profundidad: el layout ya verifica el rol admin y el sidebar oculta
 * el ítem a quien no es superadmin, pero la ruta vuelve a exigir superadmin —
 * nunca se confía solo en que el cliente esconda el enlace.
 */
export default async function AdminRegisterPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const adminClient = createSupabaseAdminClient()
  const { data: me } = await adminClient
    .from('usuarios')
    .select('nivel_admin')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (me?.nivel_admin !== 'superadmin') {
    redirect(`/${locale}/admin`)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('adminRegisterTitle')}
        description={t('adminRegisterDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-8">
        <AdminRegisterForm />
      </div>
    </div>
  )
}
