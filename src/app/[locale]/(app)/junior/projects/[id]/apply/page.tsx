'use client'

import React, { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useDemoData } from '@/lib/DemoDataContext'
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
import { ArrowLeft, Send, Briefcase, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ApplyFormValues {
  coverLetter: string
  portfolioUrl: string
  cvUrl: string
}

function createApplySchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    coverLetter: zod.string().min(30, { message: t('coverLetterMin') }),
    portfolioUrl: zod.string().url({ message: t('urlPortfolio') }),
    cvUrl: zod.string().url({ message: t('urlCV') }),
  })
}

export default function ApplyProjectPage() {
  const params = useParams()
  const router = useRouter()
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')
  const tValidation = useTranslations('Validation')
  const tAccount = useTranslations('Account')

  const { projects, addApplication } = useDemoData()
  const { isPending } = useAccountStatus()
  const id = params['id'] as string
  const project = projects.find((p) => p.id === id)

  const [isSubmitting, setIsSubmitting] = useState(false)

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
      portfolioUrl: '',
      cvUrl: '',
    },
  })

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">{tEgresado('projectNotFound')}</h2>
          <Link
            href="/junior/projects"
            className="mt-4 inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 h-9 px-4"
          >
            {tEgresado('backToMarketplace')}
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
      toast.success(tEgresado('applySuccess'))
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
            {tEgresado('backToProjectDetail')}
          </Link>
        </div>

        <PageTitle
          title={tEgresado('applyFormTitle')}
          description={tEgresado('applyFormProjectInfo', {
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
                  <span>{tEgresado('coverLetter')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {tCommon('minCharsLabel', { n: 30 })}
                  </span>
                </Label>
                <Textarea
                  id="coverLetter"
                  rows={6}
                  placeholder={tEgresado('coverLetterPlaceholder')}
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
                  {tEgresado('portfolioUrl')}
                </Label>
                <Input
                  id="portfolioUrl"
                  type="url"
                  placeholder={tEgresado('portfolioPlaceholder')}
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
                  {tEgresado('cvUrl')}
                </Label>
                <Input
                  id="cvUrl"
                  type="url"
                  placeholder={tEgresado('cvPlaceholder')}
                  className={`bg-card/50 border-border ${errors.cvUrl ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('cvUrl')}
                />
                {errors.cvUrl && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.cvUrl.message}
                  </p>
                )}
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
