import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Clock, LogOut } from 'lucide-react'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole } from '@/lib/auth/roles'
import { signOut } from '@/lib/auth/actions'

async function handleSignOut() {
  'use server'
  await signOut()
  redirect('/')
}

export default async function PendingApprovalPage() {
  const t = await getTranslations('Account')
  const tCommon = await getTranslations('Common')

  const supabase = await createSupabaseServerClient()
  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  const roleMsg =
    role === 'empresario' ? t('pendingEmpresarioMsg') : t('pendingEgresadoMsg')

  return (
    <AuthCard>
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-warning/10 text-warning">
            <Clock className="w-14 h-14" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-subtle">
            {t('pendingEyebrow')}
          </p>
          <h1 className="text-2xl font-bold font-heading text-ink-strong">
            {t('pendingTitle')}
            <span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-ink-muted font-medium leading-relaxed">
            {roleMsg}
          </p>
          <p className="text-xs text-ink-subtle font-medium">
            {t('pendingDesc')}
          </p>
        </div>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-subtle hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {tCommon('logout')}
          </button>
        </form>
      </div>
    </AuthCard>
  )
}
