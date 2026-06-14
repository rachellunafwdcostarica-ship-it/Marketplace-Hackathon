'use client'

import { useMemo, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogisticsForm } from './LogisticsForm'
import {
  buildLogisticsSchema,
  type LogisticsFormValues,
} from '@/lib/projects/schemas'
import { saveLogisticsDraft } from '@/lib/projects/actions'

interface ProjectWizardProps {
  conversationId: string
  isVerified: boolean
  todayIso: string
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'unauthorized',
  'empresario_no_encontrado',
  'save_failed',
  'unexpected',
])

/**
 * Orquesta el flujo de publicación en UNA ruta con dos pasos (errolpendiente §1):
 * Paso 1 = logística + contexto → "Continuar con la IA" persiste el borrador.
 * Paso 2 = la conversación con la IA y la propuesta (se construye en cortes
 * siguientes); por ahora es un placeholder.
 */
export function ProjectWizard({
  conversationId,
  isVerified,
  todayIso,
}: ProjectWizardProps) {
  const t = useTranslations('ProjectPublish')
  const tCommon = useTranslations('Common')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const schema = useMemo(() => buildLogisticsSchema(todayIso), [todayIso])

  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      modalidad: '',
      moneda: 'USD',
      presupuestoMin: '',
      presupuestoMax: '',
      fechaCierre: '',
      paisProyecto: '',
      ciudadProyecto: '',
      contextoInicial: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  const onSubmit = async (values: LogisticsFormValues) => {
    setLoading(true)
    const result = await saveLogisticsDraft(conversationId, values)
    setLoading(false)

    if (result.ok) {
      toast.success(t('draftSaved'))
      setStep(2)
      return
    }

    const code = KNOWN_ERROR_CODES.has(result.error)
      ? result.error
      : 'unexpected'
    toast.error(t(`errors.${code}`))
  }

  if (step === 2) {
    return (
      <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
        <CardContent className="p-6 pt-8 space-y-4 text-center">
          <Sparkles className="w-8 h-8 text-secondary mx-auto" />
          <h2 className="text-lg font-bold text-foreground">
            {t('step2Title')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('step2Soon')}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        </CardContent>
      </Card>
    )
  }

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
          <p className="text-xs text-muted-foreground">{t('flowIntro')}</p>
        </div>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <LogisticsForm disabled={loading} todayIso={todayIso} />

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
                disabled={loading}
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
                disabled={loading}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('continuing') : t('continueWithAi')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
