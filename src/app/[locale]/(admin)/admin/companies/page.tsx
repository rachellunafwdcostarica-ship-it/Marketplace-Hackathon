import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

/**
 * La verificación de empresas (RF-17) se unificó en la pestaña "Empresas" de
 * Validaciones. Esta ruta redirige allí. El dashboard mock previo se preservó
 * en `src/components/_orphans/MockAdminCompanies.tsx`.
 */
export default async function AdminCompaniesPage() {
  const locale = await getLocale()
  redirect(`/${locale}/admin/validations?tab=empresas`)
}
