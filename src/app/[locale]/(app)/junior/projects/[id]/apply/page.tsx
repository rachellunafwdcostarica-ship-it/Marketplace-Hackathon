'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Send, Briefcase, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

const applySchema = zod.object({
  coverLetter: zod
    .string()
    .min(30, {
      message: 'La carta de presentación debe tener al menos 30 caracteres.',
    }),
  portfolioUrl: zod
    .string()
    .url({
      message:
        'Debe ingresar una URL válida para el portafolio (ej. https://miweb.com).',
    }),
  cvUrl: zod
    .string()
    .url({
      message:
        'Debe ingresar una URL válida para el CV (ej. https://drive.google.com/...).',
    }),
})

type ApplyFormValues = zod.infer<typeof applySchema>

export default function ApplyProjectPage() {
  const params = useParams()
  const router = useRouter()
  const tCommon = useTranslations('Common')
  const tJunior = useTranslations('Junior')

  const { projects, addApplication } = useAppState()
  const id = params['id'] as string
  const project = projects.find((p) => p.id === id)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      coverLetter: '',
      portfolioUrl: 'https://juanperez.dev',
      cvUrl: 'https://drive.google.com/file/cv-juan-perez',
    },
  })

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">Proyecto no encontrado</h2>
          <Link
            href="/junior/projects"
            className="mt-4 inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/95 h-9 px-4"
          >
            Volver al Marketplace
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const onSubmit = (data: ApplyFormValues) => {
    setIsSubmitting(true)
    setTimeout(() => {
      addApplication({
        projectId: project.id,
        projectTitle: project.title,
        companyId: project.companyId,
        companyName: project.companyName,
        coverLetter: data.coverLetter,
        portfolioUrl: data.portfolioUrl,
        cvUrl: data.cvUrl,
      })
      setIsSubmitting(false)
      toast.success(tJunior('applySuccess'))
      router.push('/junior/applications')
    }, 1200)
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
            {tCommon('back')} al Detalle del Proyecto
          </Link>
        </div>

        <PageTitle
          title={tJunior('applyFormTitle')}
          description={`Proyecto: ${project.title} — ${project.companyName}`}
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
                    Mínimo 30 caracteres
                  </span>
                </Label>
                <Textarea
                  id="coverLetter"
                  rows={6}
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
                  htmlFor="portfolioUrl"
                  className="text-sm font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  {tJunior('portfolioUrl')}
                </Label>
                <Input
                  id="portfolioUrl"
                  type="url"
                  placeholder={tJunior('portfolioPlaceholder')}
                  className={`bg-card/50 border-border ${errors.portfolioUrl ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('portfolioUrl')}
                />
                {errors.portfolioUrl && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.portfolioUrl.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cvUrl"
                  className="text-sm font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-secondary" />
                  {tJunior('cvUrl')}
                </Label>
                <Input
                  id="cvUrl"
                  type="url"
                  placeholder={tJunior('cvPlaceholder')}
                  className={`bg-card/50 border-border ${errors.cvUrl ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('cvUrl')}
                />
                {errors.cvUrl && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.cvUrl.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                <Link
                  href={`/junior/projects/${project.id}`}
                  className="border border-border bg-background text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg text-sm font-semibold h-8 px-3"
                >
                  {tCommon('cancel')}
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold flex items-center gap-1.5 shadow-sm px-6"
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
