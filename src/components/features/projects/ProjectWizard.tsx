'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Save, Info, ShieldAlert } from 'lucide-react'
import { useRouter, Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogisticsForm } from './LogisticsForm'
import {
  projectFormSchema,
  type ProjectFormValues,
} from '@/lib/projects/schemas'
import { publishProject, type ProjectCatalogs } from '@/lib/projects/actions'

interface ProjectWizardProps {
  conversationId: string
  isVerified: boolean
  catalogs: ProjectCatalogs
  todayIso: string
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'not_verified',
  'ai_rejected',
  'unauthorized',
  'empresario_no_encontrado',
  'plazo',
  'ubicacion',
  'presupuesto',
  'unexpected',
])

export function ProjectWizard({
  conversationId,
  isVerified,
  catalogs,
  todayIso,
}: ProjectWizardProps) {
  const t = useTranslations('ProjectPublish')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      idAreaNegocio: '',
      categorias: [],
      tecnologias: [],
      modalidad: '',
      paisProyecto: '',
      ciudadProyecto: '',
      moneda: 'USD',
      presupuestoMin: '',
      presupuestoMax: '',
      fechaPublicacion: todayIso,
      fechaCierre: '',
      contextoInicial: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  const onSubmit = async (values: ProjectFormValues) => {
    setLoading(true)
    const result = await publishProject(conversationId, values)
    setLoading(false)

    if (result.ok) {
      toast.success(t('publishedSuccess'))
      router.push('/empresa')
      return
    }

    const code = KNOWN_ERROR_CODES.has(result.error)
      ? result.error
      : 'unexpected'
    toast.error(t(`errors.${code}`))
  }

  const formDisabled = loading || !isVerified

  return (
    <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
      <CardContent className="p-6 pt-8 space-y-6">
        {!isVerified && (
          <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-warning">
                {t('notVerifiedTitle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('notVerifiedDesc')}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t('aiSimulatedBanner')}
          </p>
        </div>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <LogisticsForm catalogs={catalogs} disabled={formDisabled} />

            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {t('sectionBackground')}
              </h2>
              <Label htmlFor="contextoInicial" className="text-sm font-bold">
                {t('fieldBackground')}
              </Label>
              <Textarea
                id="contextoInicial"
                rows={5}
                disabled={formDisabled}
                placeholder={t('fieldBackgroundPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-primary"
                {...register('contextoInicial')}
              />
              {errors.contextoInicial?.message && (
                <p className="text-xs font-semibold text-destructive">
                  {t(`errors.${errors.contextoInicial.message}`)}
                </p>
              )}
            </section>

            <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
              <Link
                href="/empresa"
                className="border border-border bg-background text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg text-sm font-semibold h-8 px-3"
              >
                {tCommon('cancel')}
              </Link>
              <Button
                type="submit"
                disabled={formDisabled}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? t('submitting') : t('submit')}
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
