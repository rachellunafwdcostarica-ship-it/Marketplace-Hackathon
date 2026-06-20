import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { getMisPostulaciones } from '@/lib/applications/queries'
import { MisPostulacionesList } from '@/components/features/applications/MisPostulacionesList'

export default async function EgresadoApplicationsPage() {
  const tEgresado = await getTranslations('Egresado')
  const result = await getMisPostulaciones()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tEgresado('applications')}
          description={tEgresado('applicationsDesc')}
          dotColor="text-primary"
        />

        <div className="mt-8">
          {result.ok ? (
            <MisPostulacionesList postulaciones={result.data} />
          ) : (
            <p className="text-center text-muted-foreground py-12">
              {tEgresado('unexpectedError')}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
