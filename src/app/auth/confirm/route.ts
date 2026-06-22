import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function resolveLocale(value: string | undefined): 'es' | 'en' {
  return value === 'en' ? 'en' : 'es'
}

/**
 * Sólo permite rutas internas relativas para el parámetro `next`,
 * evitando open redirects (p.ej. `//evil.com` o `https://evil.com`).
 */
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

const CONFIRMABLE_OTP_TYPES = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email',
  'email_change',
] as const

function safeOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null
  return (CONFIRMABLE_OTP_TYPES as readonly string[]).includes(raw)
    ? (raw as EmailOtpType)
    : null
}

/**
 * Confirma enlaces de email generados en el servidor con `admin.generateLink`:
 * la invitación de admin (tipo `recovery`) y el magic link de aprobación
 * (tipo `magiclink`). A diferencia de `/auth/callback` —que canjea un `code` de
 * PKCE— estos enlaces traen un `token_hash` en el query string, que se verifica
 * con `verifyOtp` para fijar la sesión en cookies del lado del servidor. El
 * `action_link` de Supabase devuelve la sesión en el hash de la URL, que un
 * route handler nunca recibe; por eso aquí se usa el `token_hash`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = safeOtpType(searchParams.get('type'))
  const next = safeNext(searchParams.get('next'))

  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('NEXT_LOCALE')?.value)

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=missing_token`,
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    logger.error('auth/confirm: verifyOtp failed', {
      message: error.message,
      type,
    })
    // En recovery, /reset-password ya muestra "enlace inválido o expirado".
    // En el resto, login es el destino seguro.
    const dest =
      type === 'recovery'
        ? `${origin}/${locale}/reset-password`
        : `${origin}/${locale}/login?error=link_invalid`
    return NextResponse.redirect(dest)
  }

  return NextResponse.redirect(`${origin}/${locale}${next ?? ''}`)
}
