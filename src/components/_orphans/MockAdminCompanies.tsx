'use client'

/**
 * HUÉRFANO / CÓDIGO MUERTO — preservado a pedido del equipo.
 *
 * Era la página `/admin/companies` cuando "verificaba" empresas con datos MOCK
 * de `StateContext` (`useAppState`/`updateCompanyStatus`), sin escribir en la BD.
 * Se reemplazó: la verificación de empresas real (RF-17) vive ahora en la
 * pestaña "Empresas" de `/admin/validations` (`getPendingCompanies` +
 * `verificarEmpresa`/`rechazarEmpresa`). `/admin/companies` redirige allí.
 * NO se importa en ningún lado. Ver `docs/deuda-tecnica-mocks.md`.
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { CompanyCard } from '@/components/features/companies/CompanyCard'
import { toast } from 'sonner'
import { Building } from 'lucide-react'
import type { Company } from '@/types'

export function MockAdminCompanies() {
  const tAdmin = useTranslations('Admin')
  const { companies, updateCompanyStatus } = useAppState()

  const handleApprove = (id: string, name: string) => {
    updateCompanyStatus(id, 'approved')
    toast.success(tAdmin('companyApproved', { name }))
  }

  const handleReject = (id: string, name: string) => {
    updateCompanyStatus(id, 'rejected')
    toast.error(tAdmin('companyRejected', { name }))
  }

  const pending = companies.filter((c) => c.status === 'pending')
  const approved = companies.filter((c) => c.status === 'approved')
  const rejected = companies.filter((c) => c.status === 'rejected')

  const renderSection = (
    title: string,
    list: Company[],
    showActions: boolean,
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold tracking-tight text-foreground font-heading border-b border-border/60 pb-2">
        {title} ({list.length})<span className="text-magenta font-bold">.</span>
      </h3>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2">
          {tAdmin('noRecordsInCategory')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onApprove={
                showActions
                  ? () => handleApprove(company.id, company.name)
                  : undefined
              }
              onReject={
                showActions
                  ? () => handleReject(company.id, company.name)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={tAdmin('verifyCompany')}
        description={tAdmin('verifyCompanyDesc')}
        dotColor="text-magenta"
      />

      {companies.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-xl text-center text-muted-foreground">
          <Building className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-semibold">{tAdmin('noCompaniesRegistered')}</p>
        </div>
      ) : (
        <>
          {renderSection(tAdmin('companiesPending'), pending, true)}
          {renderSection(tAdmin('companiesApproved'), approved, false)}
          {renderSection(tAdmin('companiesRejected'), rejected, false)}
        </>
      )}
    </div>
  )
}
