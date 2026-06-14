'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Send, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils/cn'
import { sendChatMessage } from '@/lib/projects/chat'
import type { HistorialEntry } from '@/lib/ai/types'

interface ProjectChatProps {
  conversationId: string
  contextoInicial: string
  historial: HistorialEntry[]
  onHistorialChange: (historial: HistorialEntry[]) => void
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
 * Chat con la IA (RF-54/55, llamada #1). Controlado por el wizard: el historial
 * vive arriba para sobrevivir a los cambios de paso. Cada envío persiste
 * append-only en el servidor y la IA responde sin streaming.
 */
export function ProjectChat({
  conversationId,
  contextoInicial,
  historial,
  onHistorialChange,
}: ProjectChatProps) {
  const t = useTranslations('ProjectPublish')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const onSend = async () => {
    const limpio = text.trim()
    if (limpio.length === 0 || loading) return
    setLoading(true)
    const result = await sendChatMessage(conversationId, limpio)
    setLoading(false)
    if (result.ok) {
      onHistorialChange(result.data.historial)
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
        {loading && (
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
          disabled={loading}
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
          disabled={loading || text.trim().length === 0}
          className="bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
          aria-label={t('chatSend')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
