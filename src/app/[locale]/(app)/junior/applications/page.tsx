'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Link } from '@/i18n/routing'
import { Briefcase } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { retirarPostulacion } from '@/lib/applications/actions'
import { toast } from 'sonner'
import {
  PostulacionCard,
  type PostulacionPropia,
} from '@/components/features/applications/PostulacionCard'

export default function EgresadoApplicationsPage() {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')

  const [myApps, setMyApps] = useState<PostulacionPropia[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = async () => {
    const supabase = createSupabaseBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: estudiante } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()

    if (!estudiante) {
      setLoading(false)
      return
    }

    const { data: participaciones, error } = await supabase
      .from('participaciones')
      .select(
        `
        id_participacion,
        id_proyecto,
        carta_postulacion,
        estado,
        fecha_postulacion,
        proyectos (
          titulo,
          id_empresario,
          empresarios (
            nombre_empresa
          )
        )
      `,
      )
      .eq('id_estudiante', estudiante.id_estudiante)
      .order('fecha_postulacion', { ascending: false })

    if (error || !participaciones) {
      setLoading(false)
      return
    }

    const mapped: PostulacionPropia[] = participaciones.map((p) => {
      const companyName = Array.isArray(p.proyectos?.empresarios)
        ? (p.proyectos?.empresarios[0]?.nombre_empresa ?? 'Empresa Desconocida')
        : (p.proyectos?.empresarios?.nombre_empresa ?? 'Empresa Desconocida')

      return {
        id_participacion: p.id_participacion,
        id_proyecto: p.id_proyecto,
        projectTitle: p.proyectos?.titulo ?? 'Proyecto Desconocido',
        companyName,
        carta_postulacion: p.carta_postulacion,
        estado: p.estado,
        fecha_postulacion: p.fecha_postulacion,
      }
    })

    setMyApps(mapped)
    setLoading(false)
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleWithdraw = async (id_participacion: string) => {
    const confirmed = window.confirm(tEgresado('confirmWithdraw'))
    if (!confirmed) return

    const result = await retirarPostulacion({ id_participacion })
    if (!result.ok) {
      toast.error(tEgresado('withdrawError'))
    } else {
      toast.success(tEgresado('withdrawSuccess'))
      fetchApplications()
    }
  }

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
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              {tCommon('loading')}
            </p>
          ) : myApps.length === 0 ? (
            <EmptyState
              title={tEgresado('emptyApplications')}
              description={tEgresado('emptyApplicationsDesc')}
              icon={Briefcase}
              actionText={tEgresado('exploreMarketplace')}
              onAction={() => (window.location.href = '/junior/projects')}
            />
          ) : (
            <div className="space-y-6">
              {myApps.map((postulacion) => (
                <PostulacionCard
                  key={postulacion.id_participacion}
                  postulacion={postulacion}
                  {...(['enviada', 'en_revision'].includes(postulacion.estado)
                    ? {
                        onWithdraw: () =>
                          handleWithdraw(postulacion.id_participacion),
                      }
                    : {})}
                />
              ))}
            </div>
          )}
        </div>

        {myApps.length > 0 && !loading && (
          <div className="mt-8 text-center">
            <Link
              href="/junior/projects"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {tEgresado('exploreMoreProjects')}
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
