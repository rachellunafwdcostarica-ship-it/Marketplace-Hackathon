import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { CompanyProfileForm } from '@/components/features/companies/CompanyProfileForm'
import { getCompanyProfileForEdit } from '@/lib/company/actions'
import { getCurrentUser } from '@/lib/auth/dal'

/**
 * Formulario de empresa. Server Component: el perfil (datos de empresa + datos
 * personales del empresario) se trae en el server y se pasa al formulario por
 * prop (sin `useEffect` de fetch). El rol y la autenticación los garantiza el
 * layout (company) + middleware.
 */
export default async function CompanyProfileFormPage() {
  const tEmpresa = await getTranslations('Empresa')
  const profileRes = await getCompanyProfileForEdit()
  const user = await getCurrentUser()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/empresario"
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

        {profileRes.ok && user ? (
          <CompanyProfileForm
            initialProfile={profileRes.data}
            userId={user.id}
          />
        ) : (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-bold text-destructive">
              {tEmpresa('profileNotFound')}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
