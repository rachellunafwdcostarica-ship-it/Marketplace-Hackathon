'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { CompanyProfileForm } from '@/components/features/companies/CompanyProfileForm'

export default function CompanyProfilePage() {
  const tEmpresa = useTranslations('Empresa')

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/empresa"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {tEmpresa('backToDashboard')}
          </Link>
        </div>

        <PageTitle
          title={tEmpresa('profileTitle')}
          description={tEmpresa('profileDesc')}
          dotColor="text-secondary"
        />

        <CompanyProfileForm />
      </main>

      <Footer />
    </div>
  )
}
