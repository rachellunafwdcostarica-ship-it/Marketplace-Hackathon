import { getCurrentUser } from '@/lib/auth/dal'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

/**
 * La sesión de recuperación se valida en el servidor (cookies leídas por el
 * cliente SSR), no en el navegador. Las cookies de sesión de Supabase no son
 * httpOnly, pero el `getSession()` del cliente podía no resolver y dejar el
 * botón inhabilitado; el chequeo server-side usa la misma fuente de verdad que
 * `updatePassword`, así que si el formulario se habilita, el guardado funciona.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser()
  return <ResetPasswordForm hasSession={Boolean(user)} />
}
