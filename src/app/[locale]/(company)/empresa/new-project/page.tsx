'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/routing'
import { useAppState } from '@/lib/stateContext'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { WorkMode } from '@/types'

interface ProjectFormValues {
  title: string
  description: string
  stackInput: string
  duration: string
  budget: number
  mode: 'remoto' | 'hibrido' | 'presencial'
  startDate: string
}

function createProjectSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    title: zod.string().min(10, { message: t('titleMin') }),
    description: zod.string().min(30, { message: t('descriptionMin') }),
    stackInput: zod.string().min(2, { message: t('stackRequired') }),
    duration: zod.string().min(2, { message: t('durationRequired') }),
    budget: zod
      .number({ message: t('budgetNumber') })
      .positive({ message: t('budgetPositive') })
      .min(50, { message: t('budgetMin') }),
    mode: zod.enum(['remoto', 'hibrido', 'presencial'] as const, {
      message: t('modeRequired'),
    }),
    startDate: zod.string().min(1, { message: t('startDateRequired') }),
  })
}

export default function PublishProjectPage() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  const tAccount = useTranslations('Account')
  const router = useRouter()
  const { addProject } = useAppState()
  const { isPending } = useAccountStatus()

  const [loading, setLoading] = useState(false)

  const projectSchema = useMemo(
    () => createProjectSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      stackInput: '',
      duration: '',
      budget: 150,
      mode: 'remoto',
      startDate: new Date().toISOString().substring(0, 10),
    },
  })

  const onSubmit = (data: ProjectFormValues) => {
    setLoading(true)
    const stackArray = data.stackInput
      .split(',')
      .map((tech) => tech.trim())
      .filter((tech) => tech.length > 0)

    setTimeout(() => {
      addProject({
        title: data.title,
        description: data.description,
        stack: stackArray,
        duration: data.duration,
        budget: data.budget,
        mode: data.mode as WorkMode,
        startDate: data.startDate,
        status: 'active',
      })
      setLoading(false)
      toast.success(tEmpresa('createSuccess'))
      router.push('/empresa')
    }, 1200)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/empresa"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {tEmpresa('backToDashboard')}
          </Link>
        </div>

        <PageTitle
          title={tEmpresa('publishProject')}
          description={tEmpresa('publishDesc')}
          dotColor="text-secondary"
        />

        <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
          <CardContent className="p-6 pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-bold">
                  {tEmpresa('projectTitle')}
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder={tEmpresa('projectTitlePlaceholder')}
                  className={`bg-card/50 border-border ${errors.title ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-bold flex justify-between"
                >
                  <span>{tEmpresa('projectDesc')}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {tCommon('minCharsLabel', { n: 30 })}
                  </span>
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder={tEmpresa('projectDescPlaceholder')}
                  className={`bg-card/50 border-border ${errors.description ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stackInput" className="text-sm font-bold">
                  {tEmpresa('stackReq')}
                </Label>
                <Input
                  id="stackInput"
                  type="text"
                  placeholder={tEmpresa('stackPlaceholder')}
                  className={`bg-card/50 border-border ${errors.stackInput ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                  {...register('stackInput')}
                />
                {errors.stackInput && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.stackInput.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-bold">
                    {tEmpresa('durationReq')}
                  </Label>
                  <Input
                    id="duration"
                    type="text"
                    placeholder={tEmpresa('durationPlaceholder')}
                    className={`bg-card/50 border-border ${errors.duration ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('duration')}
                  />
                  {errors.duration && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.duration.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-sm font-bold">
                    {tEmpresa('budgetReq')}
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder={tEmpresa('budgetPlaceholder')}
                    className={`bg-card/50 border-border ${errors.budget ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('budget', { valueAsNumber: true })}
                  />
                  {errors.budget && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.budget.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="mode" className="text-sm font-bold">
                    {tEmpresa('modeReq')}
                  </Label>
                  <Controller
                    name="mode"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full bg-card/50 border-border focus:ring-primary">
                          <SelectValue
                            placeholder={tEmpresa('selectModePlaceholder')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remoto">
                            {tCommon('remoto')}
                          </SelectItem>
                          <SelectItem value="hibrido">
                            {tCommon('hibrido')}
                          </SelectItem>
                          <SelectItem value="presencial">
                            {tCommon('presencial')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.mode && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.mode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-bold">
                    {tEmpresa('startDate')}
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    className={`bg-card/50 border-border ${errors.startDate ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
              </div>

              {isPending && (
                <p className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                  {tAccount('actionDisabledPending')}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                <Link
                  href="/empresa"
                  className="border border-border bg-background text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg text-sm font-semibold h-8 px-3"
                >
                  {tCommon('cancel')}
                </Link>
                <Button
                  type="submit"
                  disabled={loading || isPending}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {loading ? tCommon('loading') : tEmpresa('publishProject')}
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
