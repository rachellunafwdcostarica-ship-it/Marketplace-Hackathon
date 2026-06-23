'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Moneda, PropuestaProyecto } from '@/lib/projects/schemas'

interface ProjectProposalProps {
  propuesta: PropuestaProyecto
  moneda: Moneda
  presupuestoMin: number | null
  presupuestoMax: number | null
  isVerified: boolean
  publicando: boolean
  onAceptar: () => void
  onPedirCambios: () => void
}

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  )
}

/**
 * Propuesta de la IA en SOLO LECTURA (opción B, errolpendiente §1 paso 6): el
 * empresario no edita los campos a mano; para cambiar algo pide cambios y vuelve
 * al chat. "Aceptar y publicar" cierra el flujo (requiere empresa verificada).
 */
export function ProjectProposal({
  propuesta,
  moneda,
  presupuestoMin,
  presupuestoMax,
  isVerified,
  publicando,
  onAceptar,
  onPedirCambios,
}: ProjectProposalProps) {
  const t = useTranslations('ProjectPublish')

  // RF-20: el área de negocio es obligatoria. Si la propuesta no la trae, no se
  // puede publicar; el empresario debe pedir cambios para que la IA la asigne.
  const faltaArea = !propuesta.idArea

  return (
    <div className="space-y-5 text-left">
      <Field label={t('proposalTitleLabel')}>
        <p className="text-lg font-bold text-foreground">{propuesta.titulo}</p>
      </Field>

      <Field label={t('proposalDescriptionLabel')}>
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {propuesta.descripcion}
        </p>
      </Field>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {propuesta.areaNombre && (
          <Field label={t('proposalAreaLabel')}>
            <Chip>{propuesta.areaNombre}</Chip>
          </Field>
        )}
        {propuesta.involucraIa && (
          <Field label={t('proposalFlagsLabel')}>
            <Chip>{t('involvesAi')}</Chip>
          </Field>
        )}
        {presupuestoMin !== null && presupuestoMax !== null && (
          <Field label={t('proposalBudgetLabel')}>
            <p className="text-sm font-semibold text-foreground">
              {presupuestoMin === presupuestoMax
                ? `${moneda} ${presupuestoMin} · ${t('budgetNonNegotiable')}`
                : `${moneda} ${presupuestoMin} – ${presupuestoMax}`}
            </p>
          </Field>
        )}
      </div>

      <Field label={t('proposalCategoriesLabel')}>
        <div className="flex flex-wrap gap-1.5">
          {propuesta.categorias.map((categoria) => (
            <Chip key={categoria.id}>{categoria.nombre}</Chip>
          ))}
        </div>
      </Field>

      <Field label={t('proposalTechnologiesLabel')}>
        <div className="flex flex-wrap gap-1.5">
          {propuesta.tecnologias.map((tecnologia) => (
            <Chip key={tecnologia.id}>{tecnologia.nombre}</Chip>
          ))}
        </div>
      </Field>

      {propuesta.stackSugerido.length > 0 && (
        <Field label={t('proposalStackLabel')}>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
            {propuesta.stackSugerido.map((sugerencia, indice) => (
              <li key={`${indice}-${sugerencia}`}>{sugerencia}</li>
            ))}
          </ul>
        </Field>
      )}

      <div className="space-y-3 pt-3 border-t border-border/40">
        {!isVerified && (
          <p className="text-xs font-semibold text-warning">
            {t('notVerifiedPublish')}
          </p>
        )}
        {faltaArea && (
          <p className="text-xs font-semibold text-warning">
            {t('missingAreaPublish')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onAceptar}
            disabled={!isVerified || publicando || faltaArea}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {publicando ? t('submitting') : t('acceptAndPublish')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onPedirCambios}
            disabled={publicando}
            className="inline-flex items-center gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            {t('requestChanges')}
          </Button>
        </div>
      </div>
    </div>
  )
}
