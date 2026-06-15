import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

/**
 * Entrada del panel admin (`/[locale]/admin`). Redirige a la gestión de
 * usuarios real (RF-63). El dashboard mock previo se preservó como código
 * muerto en `src/components/_orphans/MockAdminDashboard.tsx`
 * (ver `docs/deuda-tecnica-mocks.md`).
 */
export default async function AdminIndexPage() {
  const locale = await getLocale()
  redirect(`/${locale}/admin/users`)
}
