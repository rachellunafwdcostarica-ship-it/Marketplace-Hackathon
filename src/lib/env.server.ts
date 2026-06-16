import 'server-only'
import { z } from 'zod'

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: source['SUPABASE_SERVICE_ROLE_KEY'],
  })
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ')
    throw new Error(`ENV_INVALID: ${issues}`)
  }
  return parsed.data
}

export const serverEnv = parseServerEnv(process.env)
