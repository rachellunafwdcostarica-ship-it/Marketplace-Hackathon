import { z } from 'zod'

/**
 * Schema para el login con contraseña (RF-03).
 * La contraseña solo se valida como no vacía: la verificación real la hace
 * Supabase Auth. El email se normaliza a minúsculas para casar con `usuarios.correo`.
 */
export const SignInSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

export type SignInInput = z.infer<typeof SignInSchema>

/**
 * Valores de los enums de BD que el registro recoge por rol.
 * Se mantienen como constantes nombradas (no literales sueltos) y deben casar
 * con `titulo_fwd_enum` / `tipo_empresario_enum` de `database.ts`.
 */
export const TITULO_FWD_VALUES = ['frontend', 'backend', 'fullstack'] as const
export const TIPO_EMPRESARIO_VALUES = ['empresa_formal', 'emprendedor'] as const

const signUpBaseShape = {
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(120),
}

/**
 * Schema del registro por contraseña (RF-01), discriminado por rol.
 * - egresado → `titulo_fwd` (para el cotejo del admin, RF-64).
 * - empresario → `tipo_empresario` + `nombre_empresa` + `cedula` (RF-17) + `sitio_web?`.
 * El admin nunca se registra por esta vía (se crea por invitación).
 */
export const SignUpSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('egresado'),
    ...signUpBaseShape,
    tituloFwd: z.enum(TITULO_FWD_VALUES),
  }),
  z.object({
    role: z.literal('empresario'),
    ...signUpBaseShape,
    tipoEmpresario: z.enum(TIPO_EMPRESARIO_VALUES),
    nombreEmpresa: z.string().min(2).max(150),
    cedula: z.string().min(1).max(50),
    sitioWeb: z.string().url().max(200).optional().or(z.literal('')),
  }),
])

export type SignUpInput = z.infer<typeof SignUpSchema>

/**
 * Campos de perfil por rol, sin credenciales. Es el subconjunto que necesita
 * `crearPerfilUsuario` y lo comparten el registro (Camino A) y el onboarding
 * OAuth (Camino B). `SignUpInput` es asignable a este tipo (lo extiende con
 * email/password/fullName).
 */
export type PerfilInput =
  | { role: 'egresado'; tituloFwd: (typeof TITULO_FWD_VALUES)[number] }
  | {
      role: 'empresario'
      tipoEmpresario: (typeof TIPO_EMPRESARIO_VALUES)[number]
      nombreEmpresa: string
      cedula: string
      // `| undefined` explícito: SignUpInput (Camino A) infiere sitioWeb así por
      // el `.optional()` de Zod, y exactOptionalPropertyTypes lo exige para que
      // sea asignable.
      sitioWeb?: string | undefined
    }

export const ALCANCE_VALUES = ['nacional', 'internacional', 'ambos'] as const

/** Verifica que una fecha `YYYY-MM-DD` corresponda a una persona de 18+ años. */
export function tieneAlMenos18(fecha: string): boolean {
  const birth = new Date(fecha + 'T00:00:00')
  const now = new Date()
  const age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  return (
    age > 18 ||
    (age === 18 && (m > 0 || (m === 0 && now.getDate() >= birth.getDate())))
  )
}

/**
 * Schema del onboarding OAuth (Camino B). El correo ya viene confirmado por el
 * proveedor; aquí el usuario elige su rol (RF-01) + campos por rol, datos
 * personales y de sede (empresario, 18+) + consentimientos (RNF-36 / RNF-38).
 */
export const OnboardingSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('egresado'),
    tituloFwd: z.enum(TITULO_FWD_VALUES),
    aceptaTerminos: z.literal(true),
    aceptaCotejo: z.literal(true),
  }),
  z.object({
    role: z.literal('empresario'),
    tipoEmpresario: z.enum(TIPO_EMPRESARIO_VALUES),
    nombreEmpresa: z.string().min(2).max(150),
    cedula: z.string().min(1).max(50),
    sitioWeb: z.string().url().max(200).optional().or(z.literal('')),
    nombre: z.string().min(2).max(80),
    primerApellido: z.string().min(2).max(80),
    segundoApellido: z.string().max(80).optional(),
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(tieneAlMenos18),
    fotoPerfilUrl: z.string().url().nullable().optional(),
    pais: z.string().min(2).max(80),
    region: z.string().max(80),
    alcanceOperativo: z.enum(ALCANCE_VALUES),
    aceptaTerminos: z.literal(true),
  }),
])

export type OnboardingInput = z.infer<typeof OnboardingSchema>
