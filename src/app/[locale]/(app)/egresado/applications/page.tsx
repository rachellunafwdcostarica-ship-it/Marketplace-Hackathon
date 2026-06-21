import { getTranslations } from 'next-intl/server'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { getMisPostulaciones } from '@/lib/applications/queries'
import { MisPostulacionesList } from '@/components/features/applications/MisPostulacionesList'

export default async function EgresadoApplicationsPage() {
  const tEgresado = await getTranslations('Egresado')
  const result = await getMisPostulaciones()

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex-1 min-w-0">
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
      </div>
    </EgresadoShell>
  )
}
