import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { CompanyMensajesClient } from './CompanyMensajesClient'

/**
 * Página del Centro de Mensajes del empresario. Server component que verifica
 * que el perfil esté completo y renderiza el cliente de mensajes.
 */
export default async function CompanyMensajesPage() {
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  return <CompanyMensajesClient />
}
