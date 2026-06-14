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
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogisticsForm } from './LogisticsForm'
import { ProjectChat } from './ProjectChat'
import { ProjectProposal } from './ProjectProposal'
import {
  buildLogisticsSchema,
  draftToFormValues,
  toLogisticaDraft,
  type LogisticaDraft,
  type LogisticsFormValues,
  type PropuestaProyecto,
} from '@/lib/projects/schemas'
import { saveLogisticsDraft } from '@/lib/projects/actions'
import { sendChatMessage } from '@/lib/projects/chat'
import { generateProposal } from '@/lib/projects/proposal'
import { publishProject } from '@/lib/projects/publish'
import type { HistorialEntry } from '@/lib/ai/types'

interface ProjectWizardProps {
  conversationId: string
  isVerified: boolean
  todayIso: string
  logistica: LogisticaDraft | null
  contextoInicial: string
  historial: HistorialEntry[]
  propuesta: PropuestaProyecto | null
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'unauthorized',
  'empresario_no_encontrado',
  'save_failed',
  'no_context',
  'no_proposal',
  'not_verified',
  'plazo',
  'ubicacion',
  'presupuesto',
  'ai_not_configured',
  'ai_failed',
  'unexpected',
])

/**
 * Orquesta el flujo de publicación en UNA ruta con tres pasos (errolpendiente §1):
 * 1 = logística + contexto, 2 = chat con la IA, 3 = propuesta (solo lectura).
 * El historial, el contexto y la propuesta viven acá para sobrevivir a los
 * cambios de paso; al retomar, se arranca en el paso que corresponda.
 */
export function ProjectWizard({
  conversationId,
  isVerified,
  todayIso,
  logistica,
  contextoInicial,
  historial: historialInicial,
  propuesta: propuestaInicial,
}: ProjectWizardProps) {
  const t = useTranslations('ProjectPublish')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [armando, setArmando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [historial, setHistorial] = useState<HistorialEntry[]>(historialInicial)
  const [contexto, setContexto] = useState(contextoInicial)
  const [propuesta, setPropuesta] = useState<PropuestaProyecto | null>(
    propuestaInicial,
  )
  const [logisticaActual, setLogisticaActual] = useState<LogisticaDraft | null>(
    logistica,
  )
  const [completo, setCompleto] = useState(false)
  const [kickoffLoading, setKickoffLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(
    propuestaInicial ? 3 : historialInicial.length > 0 ? 2 : 1,
  )

  const schema = useMemo(() => buildLogisticsSchema(todayIso), [todayIso])

  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: draftToFormValues(logistica, contextoInicial),
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
      setContexto(values.contextoInicial.trim())
      setLogisticaActual(toLogisticaDraft(values))
      toast.success(t('draftSaved'))
      setStep(2)
      // Saludo de la IA disparado por la acción del usuario (sin useEffect): solo
      // en el primer ingreso al chat (historial vacío). Reacciona al contexto.
      if (historial.length === 0) {
        setKickoffLoading(true)
        const kr = await sendChatMessage(conversationId)
        setKickoffLoading(false)
        if (kr.ok) {
          setHistorial(kr.data.historial)
          setCompleto(kr.data.completo)
        } else {
          toast.error(
            t(
              `errors.${KNOWN_ERROR_CODES.has(kr.error) ? kr.error : 'unexpected'}`,
            ),
          )
        }
      }
      return
    }

    toast.error(
      t(
        `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
      ),
    )
  }

  const onArmarPropuesta = async () => {
    setArmando(true)
    const result = await generateProposal(conversationId)
    setArmando(false)

    if (!result.ok) {
      toast.error(
        t(
          `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
        ),
      )
      return
    }

    if (result.data.estado === 'rechazada') {
      // La IA explica en el chat qué falta; nos quedamos en el chat.
      setHistorial(result.data.historial)
      toast(t('proposalRejected'))
      return
    }

    setHistorial(result.data.historial)
    setPropuesta(result.data.propuesta)
    setStep(3)
  }

  const onAceptar = async () => {
    setPublicando(true)
    const result = await publishProject(conversationId)
    setPublicando(false)

    if (result.ok) {
      toast.success(t('publishedSuccess'))
      router.push('/empresa')
      return
    }

    toast.error(
      t(
        `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
      ),
    )
  }

  if (step === 3 && propuesta) {
    return (
      <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
        <CardContent className="p-6 pt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold text-foreground">
              {t('proposalTitle')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{t('proposalIntro')}</p>
          <ProjectProposal
            propuesta={propuesta}
            moneda={logisticaActual?.moneda ?? 'USD'}
            presupuestoMin={logisticaActual?.presupuestoMin ?? null}
            presupuestoMax={logisticaActual?.presupuestoMax ?? null}
            isVerified={isVerified}
            publicando={publicando}
            onAceptar={onAceptar}
            onPedirCambios={() => setStep(2)}
          />
        </CardContent>
      </Card>
    )
  }

  if (step === 2) {
    return (
      <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
        <CardContent className="p-6 pt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold text-foreground">
              {t('step2Title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{t('chatIntro')}</p>

          <ProjectChat
            conversationId={conversationId}
            contextoInicial={contexto}
            historial={historial}
            completo={completo}
            kickoffLoading={kickoffLoading}
            onHistorialChange={setHistorial}
            onCompletoChange={setCompleto}
            onArmarPropuesta={onArmarPropuesta}
            armando={armando}
          />

          <div className="pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </Button>
          </div>
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
