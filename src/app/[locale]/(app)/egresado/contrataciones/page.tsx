import { getTranslations } from 'next-intl/server'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { getMisContrataciones } from '@/lib/deliverables/queries'
import { MisContratacionesList } from '@/components/features/deliverables/MisContratacionesList'

export default async function MisContratacionesPage() {
  const tEgresado = await getTranslations('Egresado')
  const result = await getMisContrataciones()

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex-1 min-w-0">
          <PageTitle
            title={tEgresado('myContracts')}
            description={tEgresado('myContractsDesc')}
            dotColor="text-primary"
          />

          <div className="mt-8">
            {result.ok ? (
              <MisContratacionesList contrataciones={result.data} />
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
