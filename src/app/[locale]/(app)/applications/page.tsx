'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDemoData } from '@/lib/DemoDataContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Link } from '@/i18n/routing'
import { Briefcase } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { retirarPostulacion } from '@/lib/applications/actions'
import { toast } from 'sonner'
import type { Application } from '@/types'

export default function EgresadoApplicationsPage() {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const { applications } = useDemoData()

  type MyApp = Application & { dbStatus: string }
  const [myApps, setMyApps] = useState<MyApp[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = async () => {
    const supabase = createSupabaseBrowserClient()

    // 1. Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // 2. Obtener id_estudiante
    const { data: estudiante } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()

    if (!estudiante) {
      setLoading(false)
      return
    }

    // 3. Consultar participaciones
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

    // Mapear al tipo Application esperado por ApplicationCard
    const mappedApps: MyApp[] = participaciones.map((p) => {
      let statusMapped: Application['status'] = 'sent'
      if (p.estado === 'en_revision') statusMapped = 'viewed'
      if (p.estado === 'contratada') statusMapped = 'accepted'
      if (
        p.estado === 'no_seleccionada' ||
        p.estado === 'retirada' ||
        p.estado === 'cancelada'
      )
        statusMapped = 'rejected'

      const companyName = Array.isArray(p.proyectos?.empresarios)
        ? p.proyectos?.empresarios[0]?.nombre_empresa
        : p.proyectos?.empresarios?.nombre_empresa

      return {
        id: p.id_participacion,
        projectId: p.id_proyecto,
        projectTitle: p.proyectos?.titulo || 'Proyecto Desconocido',
        companyId: p.proyectos?.id_empresario || '',
        companyName: companyName || 'Empresa Desconocida',
        coverLetter: p.carta_postulacion || '',
        status: statusMapped,
        createdAt: p.fecha_postulacion,
        dbStatus: p.estado, // Guardamos el estado original para lógica de retiro
      } as Application & { dbStatus: string }
    })

    setMyApps(mappedApps)
    setLoading(false)
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleWithdraw = async (id_participacion: string) => {
    const confirm = window.confirm(
      '¿Estás seguro de que deseas retirar tu postulación?',
    )
    if (!confirm) return

    const result = await retirarPostulacion({ id_participacion })
    if (!result.ok) {
      toast.error('Error al retirar la postulación: ' + result.error)
    } else {
      toast.success('Postulación retirada con éxito')
      fetchApplications() // Recargar
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
              {myApps.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewMode="egresado"
                  {...(['enviada', 'en_revision'].includes(application.dbStatus)
                    ? {
                        onWithdraw: () => {
                          handleWithdraw(application.id)
                        },
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
