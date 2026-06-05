'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { CompanyCard } from '@/components/features/companies/CompanyCard'
import { toast } from 'sonner'
import { Building } from 'lucide-react'
import type { Company } from '@/types'

export default function AdminCompaniesPage() {
  const tAdmin = useTranslations('Admin')
  const { companies, updateCompanyStatus } = useAppState()

  const handleApprove = (id: string, name: string) => {
    updateCompanyStatus(id, 'approved')
    toast.success(`Empresa "${name}" aprobada.`)
  }

  const handleReject = (id: string, name: string) => {
    updateCompanyStatus(id, 'rejected')
    toast.error(`Registro de "${name}" rechazado.`)
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
          Sin registros en esta categoría.
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
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <PageTitle
          title={tAdmin('verifyCompany')}
          description="Revisa y aprueba los registros de empresas que desean publicar proyectos en la plataforma."
          dotColor="text-magenta"
        />

        {companies.length === 0 ? (
          <div className="p-12 border border-dashed border-border rounded-xl text-center text-muted-foreground">
            <Building className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-semibold">
              No hay empresas registradas todavía.
            </p>
          </div>
        ) : (
          <>
            {renderSection('Empresas Pendientes de Aprobación', pending, true)}
            {renderSection('Empresas Aprobadas', approved, false)}
            {renderSection('Empresas Rechazadas', rejected, false)}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
