'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Send, Briefcase, FileText, UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { postularse } from '@/lib/applications/actions'

type ApplyFormValues = zod.infer<ReturnType<typeof createApplySchema>>

function createApplySchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    coverLetter: zod.string().min(30, { message: t('coverLetterMin') }),
    planteamientoSolucion: zod
      .string()
      .min(30, { message: t('coverLetterMin') }), // Reusing error message for simplicity
    enlaceAdicional: zod
      .string()
      .url({ message: t('urlPortfolio') })
      .optional()
      .or(zod.literal('')),
  })
}

export default function ApplyProjectPage() {
  const params = useParams()
  const router = useRouter()
  const tCommon = useTranslations('Common')
  const tJunior = useTranslations('Junior')
  const tValidation = useTranslations('Validation')
  const tAccount = useTranslations('Account')

  const { isPending } = useAccountStatus()
  const id = params['id'] as string

  interface ProjectData {
    id: string
    title: string
    companyName: string
  }
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [prototypeFile, setPrototypeFile] = useState<File | null>(null)
  const [technicalDocFile, setTechnicalDocFile] = useState<File | null>(null)

  useEffect(() => {
    async function fetchProject() {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('proyectos')
        .select(
          `
          id_proyecto, 
          titulo, 
          empresarios (nombre_empresa)
        `,
        )
        .eq('id_proyecto', id)
        .single()

      if (!error && data) {
        setProject({
          id: data.id_proyecto,
          title: data.titulo,
          companyName: Array.isArray(data.empresarios)
            ? data.empresarios[0]?.nombre_empresa
            : data.empresarios?.nombre_empresa || 'Empresa',
        })
      }
      setLoadingProject(false)
    }
    fetchProject()
  }, [id])

  const applySchema = useMemo(
    () => createApplySchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      coverLetter: '',
      planteamientoSolucion: '',
      enlaceAdicional: '',
    },
  })

  if (loadingProject) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">{tJunior('projectNotFound')}</h2>
          <Link
            href="/junior/projects"
            className="mt-4 inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 h-9 px-4"
          >
            {tJunior('backToMarketplace')}
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const onSubmit = async (data: ApplyFormValues) => {
    setIsSubmitting(true)
    const supabase = createSupabaseBrowserClient()

    let uploadedPrototypeUrl = ''
    let uploadedTechDocUrl = ''

    try {
      if (prototypeFile) {
        const fileExt = prototypeFile.name.split('.').pop()
        const fileName = `${project.id}-${Date.now()}-proto.${fileExt}`
        const { data: uploadData, error } = await supabase.storage
          .from('prototipos')
          .upload(fileName, prototypeFile)
        if (error) throw new Error(tJunior('prototypeUploadError'))
        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('prototipos')
            .getPublicUrl(uploadData.path)
          uploadedPrototypeUrl = publicUrlData.publicUrl
        }
      }

      if (technicalDocFile) {
        const fileExt = technicalDocFile.name.split('.').pop()
        const fileName = `${project.id}-${Date.now()}-doc.${fileExt}`
        const { data: uploadData, error } = await supabase.storage
          .from('prototipos')
          .upload(fileName, technicalDocFile)
        if (error) throw new Error(tJunior('docUploadError'))
        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('prototipos')
            .getPublicUrl(uploadData.path)
          uploadedTechDocUrl = publicUrlData.publicUrl
        }
      }

      const enlaces = []
      if (uploadedPrototypeUrl) enlaces.push(uploadedPrototypeUrl)
      if (data.enlaceAdicional) enlaces.push(data.enlaceAdicional)

      const result = await postularse({
        id_proyecto: project.id,
        carta_postulacion: data.coverLetter,
        planteamiento_solucion: data.planteamientoSolucion,
        prototipo_enlaces: enlaces.length > 0 ? enlaces : undefined,
        documentacion_tecnica: uploadedTechDocUrl || undefined,
      })

      if (!result.ok) {
        toast.error('Error al postularse: ' + result.error)
      } else {
        toast.success(tJunior('applySuccess'))
        router.push('/junior/applications')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error(tJunior('unexpectedError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/junior/projects/${project.id}`}
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {tJunior('backToProjectDetail')}
          </Link>
        </div>

        <PageTitle
          title={tJunior('applyFormTitle')}
          description={tJunior('applyFormProjectInfo', {
            title: project.title,
            company: project.companyName,
          })}
          dotColor="text-primary"
        />

        <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
          <CardContent className="p-6 pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="coverLetter"
                  className="text-sm font-bold flex justify-between"
                >
                  <span>{tJunior('coverLetter')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {tCommon('minCharsLabel', { n: 30 })}
                  </span>
                </Label>
                <Textarea
                  id="coverLetter"
                  rows={4}
                  placeholder={tJunior('coverLetterPlaceholder')}
                  className={`bg-card/50 border-border ${errors.coverLetter ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('coverLetter')}
                />
                {errors.coverLetter && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.coverLetter.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="planteamientoSolucion"
                  className="text-sm font-bold flex justify-between"
                >
                  <span>{tJunior('solutionApproach')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {tCommon('minCharsLabel', { n: 30 })}
                  </span>
                </Label>
                <Textarea
                  id="planteamientoSolucion"
                  rows={4}
                  placeholder={tJunior('solutionApproachPlaceholder')}
                  className={`bg-card/50 border-border ${errors.planteamientoSolucion ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('planteamientoSolucion')}
                />
                {errors.planteamientoSolucion && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.planteamientoSolucion.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="enlaceAdicional"
                  className="text-sm font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  {tJunior('prototypeLink')}
                </Label>
                <Input
                  id="enlaceAdicional"
                  type="url"
                  placeholder="https://..."
                  className={`bg-card/50 border-border ${errors.enlaceAdicional ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('enlaceAdicional')}
                />
                {errors.enlaceAdicional && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.enlaceAdicional.message}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-secondary" />
                    {tJunior('uploadPrototype')}
                  </Label>
                  <Input
                    type="file"
                    className="cursor-pointer bg-card/50"
                    onChange={(e) =>
                      setPrototypeFile(e.target.files?.[0] || null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-accent" />
                    {tJunior('uploadTechnicalDoc')}
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    className="cursor-pointer bg-card/50"
                    onChange={(e) =>
                      setTechnicalDocFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>

              {isPending && (
                <p className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                  {tAccount('actionDisabledPending')}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                <Link
                  href={`/junior/projects/${project.id}`}
                  className="border border-border bg-background text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg text-sm font-semibold h-8 px-3"
                >
                  {tCommon('cancel')}
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting || isPending}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? tCommon('loading') : tCommon('submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
