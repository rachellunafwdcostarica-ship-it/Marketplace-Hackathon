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

export const SaveEmpresarioProfileSchema = z.object({
  nombre: z.string().min(2).max(80),
  primer_apellido: z.string().min(2).max(80),
  segundo_apellido: z.string().max(80),
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
