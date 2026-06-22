import { getTranslations } from 'next-intl/server'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { AdminCatalogsClient } from '@/components/features/admin/AdminCatalogsClient'
import { getCatalogs } from '@/lib/admin/catalog-actions'

export default async function AdminCatalogsPage() {
  const t = await getTranslations('Admin')
  const result = await getCatalogs()
  
  const tecnologias = result.ok ? result.data.tecnologias : []
  const categorias = result.ok ? result.data.categorias : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title="Gestión de Catálogos"
        description="Agrega o desactiva tecnologías y categorías de la plataforma."
        dotColor="text-primary"
      />

      <div className="mt-8">
        <AdminCatalogsClient initialTecnologias={tecnologias} initialCategorias={categorias} />
      </div>
    </div>
  )
}
