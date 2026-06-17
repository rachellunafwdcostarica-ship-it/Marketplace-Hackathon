'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/i18n/routing'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { retirarPostulacion } from '@/lib/applications/actions'
import {
  PostulacionCard,
  type PostulacionPropia,
} from '@/components/features/applications/PostulacionCard'

interface MisPostulacionesListProps {
  postulaciones: PostulacionPropia[]
}

/**
 * Render interactivo de "mis postulaciones". Recibe los datos ya resueltos
 * desde el Server Component (no hace fetch ni maneja estado de carga: por eso
 * no puede quedarse en "cargando"). Solo conserva el retiro de la oferta, que
 * sí necesita el cliente (confirm + toast).
 */
export function MisPostulacionesList({
  postulaciones,
}: MisPostulacionesListProps) {
  const router = useRouter()
  const tEgresado = useTranslations('Egresado')

  const handleWithdraw = async (idParticipacion: string) => {
    const confirmed = window.confirm(tEgresado('confirmWithdraw'))
    if (!confirmed) return

    const result = await retirarPostulacion({
      id_participacion: idParticipacion,
    })
    if (!result.ok) {
      toast.error(tEgresado('withdrawError'))
      return
    }

    toast.success(tEgresado('withdrawSuccess'))
    // El action ya hace revalidatePath; refrescamos para reflejarlo en el acto.
    router.refresh()
  }

  if (postulaciones.length === 0) {
    return (
      <EmptyState
        title={tEgresado('emptyApplications')}
        description={tEgresado('emptyApplicationsDesc')}
        icon={Briefcase}
        actionText={tEgresado('exploreMarketplace')}
        onAction={() => {
          window.location.href = '/junior/projects'
        }}
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        {postulaciones.map((postulacion) => (
          <PostulacionCard
            key={postulacion.id_participacion}
            postulacion={postulacion}
            onWithdraw={() => handleWithdraw(postulacion.id_participacion)}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/junior/projects"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {tEgresado('exploreMoreProjects')}
        </Link>
      </div>
    </>
  )
}
