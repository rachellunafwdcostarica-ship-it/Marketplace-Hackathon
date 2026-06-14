'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PropuestaProyecto } from '@/lib/projects/schemas'

interface ProjectProposalProps {
  propuesta: PropuestaProyecto
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
 * al chat. "Aceptar y publicar" llega en el corte de publicación.
 */
export function ProjectProposal({
  propuesta,
  onPedirCambios,
}: ProjectProposalProps) {
  const t = useTranslations('ProjectPublish')

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
            {propuesta.stackSugerido.map((item, indice) => (
              <li key={`${indice}-${item}`}>{item}</li>
            ))}
          </ul>
        </Field>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {t('publishComingSoon')}
        </p>
      </div>

      <div className="flex gap-2 pt-3 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          onClick={onPedirCambios}
          className="inline-flex items-center gap-1.5"
        >
          <MessageSquare className="h-4 w-4" />
          {t('requestChanges')}
        </Button>
      </div>
    </div>
  )
}
