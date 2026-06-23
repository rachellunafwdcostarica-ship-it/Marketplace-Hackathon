import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

export function parseClientEnv(
  source: Record<string, string | undefined>,
): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_APP_URL: source['NEXT_PUBLIC_APP_URL'],
  })
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ')
    throw new Error(`ENV_INVALID: ${issues}`)
  }
  return parsed.data
}
export const env = parseClientEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})
