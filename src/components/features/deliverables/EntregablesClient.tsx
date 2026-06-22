'use client'

import React, { useState, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  FileCheck2,
  CalendarDays,
  Clock3,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  FileText,
  Star,
  Loader2,
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { subirHito, subirEntregableFinal } from '@/lib/deliverables/actions'
import { rateCompany } from '@/lib/company/ratings'
import type {
  MiContratacion,
  EntregablePropio,
} from '@/lib/deliverables/queries'

interface EntregablesClientProps {
  projectId: string
  projectTitle: string
  companyId: string
  contratacion: MiContratacion
  entregablesIniciales: EntregablePropio[]
  existingRating: { puntuacion: number; comentario: string | null } | null
}

const ESTADO_CONFIG = {
  enviado: {
    label: 'estadoEnviado',
    className: 'bg-primary/10 text-primary border border-primary/20',
    icon: Hourglass,
  },
  en_revision: {
    label: 'estadoEnRevision',
    className: 'bg-warning/10 text-warning border border-warning/20',
    icon: Clock3,
  },
  aprobado: {
    label: 'estadoAprobado',
    className: 'bg-accent/10 text-accent border border-accent/20',
    icon: CheckCircle2,
  },
  con_cambios: {
    label: 'estadoConCambios',
    className: 'bg-magenta/10 text-magenta border border-magenta/20',
    icon: AlertCircle,
  },
} as const

const PERIODO_CONFIG = {
  vigente: {
    label: 'periodoVigente',
    className: 'bg-accent/10 text-accent border border-accent/20',
  },
  pausado: {
    label: 'periodoPausado',
    className: 'bg-warning/10 text-warning border border-warning/20',
  },
  finalizado: {
    label: 'periodoFinalizado',
    className: 'bg-muted text-muted-foreground border border-border',
  },
  cancelado: {
    label: 'periodoCancelado',
    className: 'bg-magenta/10 text-magenta border border-magenta/20',
  },
} as const

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-semibold text-foreground">{children}</p>
    </div>
  )
}

export function EntregablesClient({
  projectId,
  projectTitle,
  companyId,
  contratacion,
  entregablesIniciales,
  existingRating,
}: EntregablesClientProps) {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [uploadingHito, setUploadingHito] = useState(false)
  const [uploadingFinal, setUploadingFinal] = useState(false)
  const [ratingScore, setRatingScore] = useState(
    existingRating?.puntuacion ?? 0,
  )
  const [ratingComment, setRatingComment] = useState(
    existingRating?.comentario ?? '',
  )
  const [hoverScore, setHoverScore] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [hasRated, setHasRated] = useState(existingRating !== null)
  const hitoRef = useRef<HTMLInputElement>(null)
  const finalRef = useRef<HTMLInputElement>(null)

  const periodo =
    PERIODO_CONFIG[contratacion.estado_periodo as keyof typeof PERIODO_CONFIG]

  const handleUpload = async (
    file: File,
    tipo: 'parcial' | 'final',
    setLoading: (v: boolean) => void,
    clearInput: () => void,
  ) => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${contratacion.id_contratacion}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('entregables')
        .upload(path, file)

      if (uploadError) {
        toast.error(tEgresado('uploadError'))
        return
      }

      const action = tipo === 'parcial' ? subirHito : subirEntregableFinal
      const result = await action({
        idContratacion: contratacion.id_contratacion,
        archivoPath: path,
        idProyecto: projectId,
      })

      if (!result.ok) {
        toast.error(tEgresado('uploadError'))
        return
      }

      toast.success(tEgresado('uploadSuccess'))
      clearInput()
      router.refresh()
    } catch {
      toast.error(tEgresado('uploadError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Link
          href={`/egresado/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {tEgresado('backToProjectDetail')}
        </Link>

        <PageTitle
          title={projectTitle}
          description={tEgresado('deliverablesDesc')}
          dotColor="text-primary"
        />

        {/* Contrato info */}
        <Card className="border border-border/80 bg-card/40">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading>{tEgresado('contratacionInfo')}</SectionHeading>
              {periodo && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${periodo.className}`}
                >
                  {tEgresado(periodo.label as Parameters<typeof tEgresado>[0])}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {contratacion.fecha_inicio && (
                <DetailField label={tEgresado('contratacionInicio')}>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    {contratacion.fecha_inicio.slice(0, 10)}
                  </span>
                </DetailField>
              )}
              {contratacion.fecha_fin_estimada && (
                <DetailField label={tEgresado('contratacionFinEstimada')}>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-secondary" />
                    {contratacion.fecha_fin_estimada.slice(0, 10)}
                  </span>
                </DetailField>
              )}
              <DetailField label={tEgresado('contratacionEstado')}>
                {periodo
                  ? tEgresado(periodo.label as Parameters<typeof tEgresado>[0])
                  : contratacion.estado_periodo}
              </DetailField>
            </div>
          </CardContent>
        </Card>

        {/* Calificación de la Empresa: solo con la contratación finalizada,
            que es lo que exige la RLS evaluaciones_empresarios_insert_estudiante. */}
        {contratacion.estado_periodo === 'finalizado' && (
          <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-warning to-highlight" />
            <CardContent className="p-6 pt-8 space-y-6">
              <div className="space-y-1 text-left">
                <h3 className="text-base font-extrabold font-heading text-foreground">
                  {tEgresado('rateCompanyTitle')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tEgresado('rateCompanyDesc')}
                </p>
              </div>

              {hasRated ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground mr-2">
                      {tEgresado('ratingLabel')}:
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= ratingScore
                              ? 'text-highlight fill-highlight'
                              : 'text-muted-foreground/25'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {ratingComment && (
                    <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-xs text-foreground/90">
                      <span className="font-bold block mb-1 text-muted-foreground uppercase text-[10px]">
                        {tEgresado('commentLabel')}
                      </span>
                      {ratingComment}
                    </div>
                  )}
                  <p className="text-xs text-accent font-semibold">
                    {tEgresado('alreadyRated')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground">
                      {tEgresado('ratingLabel')} *
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={submittingRating}
                          onMouseEnter={() => setHoverScore(star)}
                          onMouseLeave={() => setHoverScore(0)}
                          onClick={() => setRatingScore(star)}
                          className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (hoverScore || ratingScore)
                                ? 'text-highlight fill-highlight'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="rating-comment"
                      className="block text-xs font-bold text-muted-foreground"
                    >
                      {tEgresado('commentLabel')}
                    </label>
                    <textarea
                      id="rating-comment"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder={tEgresado('rateCompanyDesc')}
                      disabled={submittingRating}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxLength={1000}
                    />
                  </div>

                  <Button
                    type="button"
                    disabled={submittingRating || ratingScore === 0}
                    onClick={async () => {
                      if (ratingScore === 0) return
                      setSubmittingRating(true)
                      const res = await rateCompany({
                        idEmpresario: companyId,
                        idContratacion: contratacion.id_contratacion,
                        puntuacion: ratingScore,
                        comentario: ratingComment.trim() || undefined,
                      })
                      setSubmittingRating(false)
                      if (res.ok) {
                        toast.success(tEgresado('rateCompanySuccess'))
                        setHasRated(true)
                        router.refresh()
                      } else {
                        toast.error(res.error)
                      }
                    }}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
                  >
                    {submittingRating && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {tEgresado('submitRating')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de entregables */}
        <Card className="border border-border/80 bg-card/40">
          <CardContent className="p-6 space-y-4">
            <SectionHeading>{tEgresado('entregablesListTitle')}</SectionHeading>

            {entregablesIniciales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <FileText className="w-10 h-10 opacity-30" />
                <p className="text-sm">{tEgresado('noEntregables')}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {entregablesIniciales.map((e) => {
                  const config =
                    ESTADO_CONFIG[e.estado as keyof typeof ESTADO_CONFIG]
                  const Icon = config?.icon ?? FileCheck2
                  return (
                    <li
                      key={e.id_entregable}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 text-primary" />
                          <span className="text-sm font-semibold truncate">
                            {e.tipo_entregable === 'final'
                              ? tEgresado('tipoFinal')
                              : tEgresado('tipoParcial')}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {tEgresado('versionLabel', { n: e.version })}
                          </span>
                        </div>
                        {config && (
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${config.className}`}
                          >
                            {tEgresado(
                              config.label as Parameters<typeof tEgresado>[0],
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tEgresado('uploadedAtLabel')}{' '}
                        {new Date(e.cargado_at).toLocaleDateString()}
                      </p>
                      {e.comentario_empresario && (
                        <div className="flex items-start gap-2 rounded-md bg-warning/5 border border-warning/20 px-3 py-2 mt-1">
                          <MessageSquare className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/80">
                            <span className="font-semibold text-warning mr-1">
                              {tEgresado('empresarioComment')}:
                            </span>
                            {e.comentario_empresario}
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upload section — solo visible cuando el contrato está vigente (RF-40/41) */}
        {contratacion.estado_periodo === 'vigente' ? (
          <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardContent className="p-6 pt-8 space-y-6">
              <SectionHeading>{tEgresado('uploadSectionTitle')}</SectionHeading>

              {/* Subir hito */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  {tEgresado('uploadHito')}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    ref={hitoRef}
                    type="file"
                    className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-background file:text-foreground hover:file:bg-muted cursor-pointer"
                    disabled={uploadingHito}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingHito}
                    className="font-semibold"
                    onClick={() => {
                      const file = hitoRef.current?.files?.[0]
                      if (!file) return
                      handleUpload(file, 'parcial', setUploadingHito, () => {
                        if (hitoRef.current) hitoRef.current.value = ''
                      })
                    }}
                  >
                    {uploadingHito
                      ? tCommon('loading')
                      : tEgresado('uploadHito')}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Subir entregable final */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-accent" />
                  {tEgresado('uploadFinal')}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    ref={finalRef}
                    type="file"
                    className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-background file:text-foreground hover:file:bg-muted cursor-pointer"
                    disabled={uploadingFinal}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadingFinal}
                    className="font-semibold"
                    onClick={() => {
                      const file = finalRef.current?.files?.[0]
                      if (!file) return
                      handleUpload(file, 'final', setUploadingFinal, () => {
                        if (finalRef.current) finalRef.current.value = ''
                      })
                    }}
                  >
                    {uploadingFinal
                      ? tCommon('loading')
                      : tEgresado('uploadFinal')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {tEgresado('uploadDisabledNotVigente')}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
