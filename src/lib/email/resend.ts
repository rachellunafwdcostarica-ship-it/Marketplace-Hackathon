import 'server-only'
import { Resend } from 'resend'
import { serverEnv } from '@/lib/env.server'

export const resend = new Resend(serverEnv.RESEND_API_KEY)

// En desarrollo: usar el dominio de prueba de Resend.
// En producción: cambiar por el dominio verificado de FWD.
export const FROM_EMAIL = 'FWD Talent <onboarding@resend.dev>'
