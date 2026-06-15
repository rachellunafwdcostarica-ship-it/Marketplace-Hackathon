'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Send, Sparkles, User, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils/cn'
import { sendChatMessage } from '@/lib/projects/chat'
import type { HistorialEntry } from '@/lib/ai/types'

interface ProjectChatProps {
  conversationId: string
  contextoInicial: string
  historial: HistorialEntry[]
  completo: boolean
  kickoffLoading: boolean
  onHistorialChange: (historial: HistorialEntry[]) => void
  onCompletoChange: (completo: boolean) => void
  onArmarPropuesta: () => void
  armando: boolean
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'unauthorized',
  'empresario_no_encontrado',
  'save_failed',
  'no_context',
  'ai_not_configured',
  'ai_failed',
  'unexpected',
])

function ChatBubble({
  esEmpresario,
  contenido,
}: {
  esEmpresario: boolean
  contenido: string
}) {
  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        esEmpresario ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          esEmpresario
            ? 'bg-primary/15 text-primary'
            : 'bg-secondary/15 text-secondary',
        )}
      >
        {esEmpresario ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
        {contenido}
      </p>
    </div>
  )
}

/**
 * Chat con la IA (RF-54/55). Controlado por el wizard: el historial, `completo`
 * y el loading del saludo viven arriba. El saludo de la IA lo dispara el wizard
 * al "Continuar con la IA" (sin useEffect). "Armar propuesta" se habilita solo
 * cuando la IA marca el proyecto como completo (errolpendiente §1 paso 5-6).
 */
export function ProjectChat({
  conversationId,
  contextoInicial,
  historial,
  completo,
  kickoffLoading,
  onHistorialChange,
  onCompletoChange,
  onArmarPropuesta,
  armando,
}: ProjectChatProps) {
  const t = useTranslations('ProjectPublish')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const ocupado = loading || armando || kickoffLoading

  const onSend = async () => {
    const limpio = text.trim()
    if (limpio.length === 0 || ocupado) return
    setLoading(true)
    const result = await sendChatMessage(conversationId, limpio)
    setLoading(false)
    if (result.ok) {
      onHistorialChange(result.data.historial)
      onCompletoChange(result.data.completo)
      setText('')
      return
    }
    const code = KNOWN_ERROR_CODES.has(result.error)
      ? result.error
      : 'unexpected'
    toast.error(t(`errors.${code}`))
  }

  const mensajes = historial.filter((entrada) => entrada.tipo === 'mensaje')

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        <ChatBubble esEmpresario contenido={contextoInicial} />
        {mensajes.map((mensaje, indice) => (
          <ChatBubble
            key={`${mensaje.fecha}-${indice}`}
            esEmpresario={mensaje.rol === 'empresario'}
            contenido={mensaje.contenido}
          />
        ))}
        {(loading || kickoffLoading) && (
          <p className="text-xs text-muted-foreground pl-9">
            {t('aiThinking')}
          </p>
        )}
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          disabled={ocupado}
          placeholder={t('chatPlaceholder')}
          className="bg-card/50 border-border focus-visible:ring-primary resize-none"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void onSend()
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void onSend()}
          disabled={ocupado || text.trim().length === 0}
          className="bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
          aria-label={t('chatSend')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {completo ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            {t('readyCue')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('notReadyHint')}</p>
        )}
        <Button
          type="button"
          variant={completo ? 'secondary' : 'outline'}
          onClick={onArmarPropuesta}
          disabled={ocupado || !completo}
          className="inline-flex items-center gap-1.5 self-start"
        >
          <Wand2 className="h-4 w-4" />
          {armando ? t('generating') : t('buildProposal')}
        </Button>
      </div>
    </div>
  )
}
