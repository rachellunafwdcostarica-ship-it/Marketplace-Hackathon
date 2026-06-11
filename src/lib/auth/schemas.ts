import { z } from 'zod'

/**
 * Schema para la asignación de rol en onboarding.
 * Solo acepta los roles que un usuario puede auto-asignarse.
 * 'admin' y 'moderador' están excluidos intencionalmente.
 */
export const AssignRoleSchema = z.object({
  role: z.enum(['junior', 'empresario']),
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
