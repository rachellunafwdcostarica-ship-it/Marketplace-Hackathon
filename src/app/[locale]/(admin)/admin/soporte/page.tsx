import { getLocale, getTranslations } from 'next-intl/server'
import { LifeBuoy } from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSupportTickets } from '@/lib/company/actions'

export default async function AdminSupportPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const result = await getSupportTickets()

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageTitle
          title={t('supportTitle')}
          description={t('supportDesc')}
          dotColor="text-primary"
        />
        <EmptyState
          title={t('supportError')}
          description={t('supportErrorDesc')}
          icon={LifeBuoy}
        />
      </div>
    )
  }

  const tickets = result.data

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('supportTitle')}
        description={t('supportDesc')}
        dotColor="text-primary"
      />

      <div className="mt-6">
        {tickets.length === 0 ? (
          <EmptyState
            title={t('supportEmpty')}
            description={t('supportEmptyDesc')}
            icon={LifeBuoy}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('supportCount', { count: tickets.length })}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead>{t('colEmail')}</TableHead>
                  <TableHead>{t('supportColCompany')}</TableHead>
                  <TableHead>{t('supportColMessage')}</TableHead>
                  <TableHead>{t('supportColDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-semibold text-ink-strong">
                      {ticket.userName || ticket.userEmail}
                    </TableCell>
                    <TableCell className="text-xs text-ink-muted">
                      {ticket.userEmail}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {ticket.companyName || t('supportNoCompany')}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap text-sm text-ink">
                      {ticket.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-ink-muted">
                      {new Date(ticket.createdAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
