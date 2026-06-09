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
