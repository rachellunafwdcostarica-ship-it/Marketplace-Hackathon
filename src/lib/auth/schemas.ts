import { z } from 'zod'

/**
 * Schema para la asignación de rol en onboarding.
 * Usa el mismo vocabulario que la BD (nombre_rol): egresado / empresario.
 * 'administrador' excluido intencionalmente: ningún usuario se auto-asigna ese rol.
 */
export const AssignRoleSchema = z.object({
  role: z.enum(['egresado', 'empresario']),
})

export type AssignRoleInput = z.infer<typeof AssignRoleSchema>

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

export const SaveEmpresarioProfileSchema = z.object({
  nombre: z.string().min(2).max(80),
  primer_apellido: z.string().min(2).max(80),
  segundo_apellido: z.string().max(80).optional(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => {
      const birth = new Date(val + 'T00:00:00')
      const now = new Date()
      const age = now.getFullYear() - birth.getFullYear()
      const m = now.getMonth() - birth.getMonth()
      return (
        age > 18 ||
        (age === 18 && (m > 0 || (m === 0 && now.getDate() >= birth.getDate())))
      )
    }),
  foto_perfil_url: z.string().url().nullable().optional(),
  nombre_empresa: z.string().min(2).max(150),
  tipo_empresario: z.enum(['empresa_formal', 'emprendedor']),
  pais: z.string().min(2).max(80),
  ciudad: z.string().min(2).max(80),
  alcance_operativo: z.enum(['nacional', 'internacional', 'ambos']),
})

export type SaveEmpresarioProfileInput = z.infer<
  typeof SaveEmpresarioProfileSchema
>
