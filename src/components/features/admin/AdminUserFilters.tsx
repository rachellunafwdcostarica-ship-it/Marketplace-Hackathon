'use client'

import { useState } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

interface AdminUserFiltersProps {
  initialSearch: string
  initialRole: string
  initialStatus: string
}

/**
 * Controles de búsqueda y filtro de la gestión de usuarios (RF-63).
 * Sincroniza el estado con la URL (searchParams) para que la página server
 * (RSC) vuelva a consultar la BD con los filtros aplicados.
 */
export function AdminUserFilters({
  initialSearch,
  initialRole,
  initialStatus,
}: AdminUserFiltersProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch] = useState(initialSearch)
  const [role, setRole] = useState(initialRole || ALL)
  const [status, setStatus] = useState(initialStatus || ALL)

  const apply = (next: { search?: string; role?: string; status?: string }) => {
    const nextSearch = (next.search ?? search).trim()
    const nextRole = next.role ?? role
    const nextStatus = next.status ?? status

    const params = new URLSearchParams()
    if (nextSearch) params.set('q', nextSearch)
    if (nextRole && nextRole !== ALL) params.set('role', nextRole)
    if (nextStatus && nextStatus !== ALL) params.set('status', nextStatus)

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        apply({})
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1.5">
        <label
          htmlFor="user-search"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t('searchLabel')}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="user-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="user-role"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t('filterRole')}
        </label>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value)
            apply({ role: value })
          }}
        >
          <SelectTrigger id="user-role" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterRoleAll')}</SelectItem>
            <SelectItem value="administrador">
              {t('roleAdministrador')}
            </SelectItem>
            <SelectItem value="egresado">{t('roleEgresado')}</SelectItem>
            <SelectItem value="empresario">{t('roleEmpresario')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="user-status"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t('filterStatus')}
        </label>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            apply({ status: value })
          }}
        >
          <SelectTrigger id="user-status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterStatusAll')}</SelectItem>
            <SelectItem value="pendiente">
              {t('accountStatusPendiente')}
            </SelectItem>
            <SelectItem value="activa">{t('accountStatusActiva')}</SelectItem>
            <SelectItem value="suspendida">
              {t('accountStatusSuspendida')}
            </SelectItem>
            <SelectItem value="suspendida_severa">
              {t('accountStatusSuspendidaSevera')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" variant="outline" className="shrink-0">
        {t('searchButton')}
      </Button>
    </form>
  )
}
