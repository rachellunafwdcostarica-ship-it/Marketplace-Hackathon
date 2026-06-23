'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { MessageSquare, Send, Lock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  getMensajesDeProyecto,
  enviarMensaje,
  marcarLeidos,
  type Mensaje,
  type ConversacionItem,
} from '@/lib/mensajes/actions'

interface Props {
  conversaciones: ConversacionItem[]
  initialProjectId: string | null
  initialMensajes: { mensajes: Mensaje[]; puedeEnviar: boolean } | null
  currentUserId: string
}

function formatHora(fechaEnvio: string): string {
  return new Date(fechaEnvio).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EstadoBadge({ estado }: { estado: 'contratada' | 'finalizada' }) {
  const t = useTranslations('EgresadoMensajes')
  const isActivo = estado === 'contratada'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        isActivo ? 'text-success' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isActivo ? 'bg-success' : 'bg-muted-foreground/50',
        )}
      />
      {isActivo ? t('estadoActivo') : t('estadoFinalizado')}
    </span>
  )
}

function ConversacionRow({
  conv,
  isActive,
  onSelect,
}: {
  conv: ConversacionItem
  isActive: boolean
  onSelect: () => void
}) {
  const t = useTranslations('EgresadoMensajes')
  const initials = conv.nombreContraparte.substring(0, 2).toUpperCase()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-4 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] flex gap-3 items-center',
        isActive
          ? 'border-l-[6px] border-primary bg-white shadow-sm'
          : 'border-l-[6px] border-transparent hover:bg-muted/40 bg-transparent',
      )}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {initials}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'text-sm font-bold truncate',
              isActive ? 'text-primary' : 'text-ink-strong',
            )}
          >
            {conv.nombreContraparte}
          </p>
          <span className="text-[10px] text-ink-muted">
            {t('relativeDateYesterday')}
          </span>
        </div>
        <p className="text-sm font-semibold text-ink-strong leading-tight line-clamp-2">
          {conv.tituloProyecto}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <EstadoBadge estado={conv.estado} />
          {/* Badge de mensajes no leídos (mocked logic for active view just to show style) */}
          {isActive && (
            <span className="flex w-5 h-5 bg-primary text-white rounded-full items-center justify-center text-[10px] font-bold">
              2
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function ChatBubble({
  mensaje,
  isMine,
  initials,
}: {
  mensaje: Mensaje
  isMine: boolean
  initials: string
}) {
  const avatarText = isMine ? 'Me' : initials
  return (
    <div
      className={cn(
        'flex gap-3 max-w-[75%]',
        isMine ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs mt-auto">
        {avatarText}
      </div>
      <div
        className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed break-words shadow-sm',
          isMine
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-white border border-border/60 text-ink-strong rounded-bl-sm',
        )}
      >
        <p>{mensaje.contenido}</p>
        <p
          className={cn(
            'text-[10px] mt-1 text-right',
            isMine ? 'text-white/80' : 'text-ink-muted',
          )}
        >
          {formatHora(mensaje.fechaEnvio)} {isMine && '✓'}
        </p>
      </div>
    </div>
  )
}

function ChatEmptyState() {
  const t = useTranslations('EgresadoMensajes')
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
      <div className="p-4 bg-primary/8 rounded-full text-primary">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <p className="font-semibold text-foreground">{t('mensajesEmpty')}</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t('mensajesEmptyDesc')}
      </p>
    </div>
  )
}

export function EgresadoMensajesClient({
  conversaciones,
  initialProjectId,
  initialMensajes,
  currentUserId,
}: Props) {
  const t = useTranslations('EgresadoMensajes')
  const scrollEndRef = useRef<HTMLDivElement>(null)

  const [selectedConv, setSelectedConv] = useState<ConversacionItem | null>(
    () =>
      initialProjectId
        ? (conversaciones.find((c) => c.idProyecto === initialProjectId) ??
          null)
        : null,
  )
  const [mensajes, setMensajes] = useState<Mensaje[]>(
    initialMensajes?.mensajes ?? [],
  )
  const [puedeEnviar, setPuedeEnviar] = useState<boolean>(
    initialMensajes?.puedeEnviar ?? false,
  )
  const [isLoadingMensajes, setIsLoadingMensajes] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSelectConv = async (conv: ConversacionItem) => {
    if (selectedConv?.idProyecto === conv.idProyecto) return
    setSelectedConv(conv)
    setMensajes([])
    setIsLoadingMensajes(true)

    const result = await getMensajesDeProyecto(conv.idProyecto)
    setIsLoadingMensajes(false)

    if (!result.ok) {
      toast.error(t('errorCarga'))
      return
    }

    setMensajes(result.data.mensajes)
    setPuedeEnviar(result.data.puedeEnviar)
    void marcarLeidos(conv.idProyecto)
  }

  const handleSend = async () => {
    if (!selectedConv || !input.trim() || !puedeEnviar || isSending) return
    const contenido = input.trim()
    setInput('')
    setIsSending(true)

    const result = await enviarMensaje({
      idProyecto: selectedConv.idProyecto,
      contenido,
    })
    setIsSending(false)

    if (!result.ok) {
      setInput(contenido)
      toast.error(t('errorEnvio'))
      return
    }

    setMensajes((prev) => [...prev, result.data])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex flex-col gap-6">
          <PageTitle title={t('title')} description={t('description')} />

          {conversaciones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20">
              <div className="p-5 bg-primary/8 rounded-full text-primary">
                <MessageSquare className="w-10 h-10" />
              </div>
              <p className="font-semibold text-lg text-foreground">
                {t('noConversaciones')}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('noConversacionesDesc')}
              </p>
            </div>
          ) : (
            <div
              className="flex border-t border-border mt-2 bg-canvas/30"
              style={{ height: 'calc(100vh - 220px)', minHeight: '560px' }}
            >
              {/* Panel izquierdo — lista de conversaciones */}
              <div className="w-[320px] shrink-0 border-r border-border flex flex-col bg-canvas/50">
                <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {t('proyectoLabel')}
                  </p>
                  <span className="bg-sky-100 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {conversaciones.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-transparent">
                  {conversaciones.map((conv) => (
                    <ConversacionRow
                      key={conv.idProyecto}
                      conv={conv}
                      isActive={selectedConv?.idProyecto === conv.idProyecto}
                      onSelect={() => void handleSelectConv(conv)}
                    />
                  ))}
                </div>
              </div>

              {/* Panel derecho — hilo de mensajes */}
              {selectedConv === null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <div className="p-4 bg-muted rounded-full text-muted-foreground">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-foreground">
                    {t('selectConversacion')}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t('selectConversacionDesc')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Header del chat */}
                  <div className="px-6 py-4 border-b border-border flex items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      {selectedConv.nombreContraparte
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-ink-strong truncate">
                          {selectedConv.nombreContraparte}
                        </p>
                        <EstadoBadge estado={selectedConv.estado} />
                      </div>
                      <p className="text-sm text-ink-muted truncate">
                        {selectedConv.tituloProyecto}
                      </p>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingMensajes ? (
                      <div className="flex-1 flex items-center justify-center py-16">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      </div>
                    ) : mensajes.length === 0 ? (
                      <ChatEmptyState />
                    ) : (
                      mensajes.map((msg) => (
                        <ChatBubble
                          key={msg.idMensaje}
                          mensaje={msg}
                          isMine={msg.idRemitente === currentUserId}
                          initials={selectedConv.nombreContraparte
                            .substring(0, 2)
                            .toUpperCase()}
                        />
                      ))
                    )}
                    <div ref={scrollEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-border/40 p-4 space-y-2.5 bg-card/10">
                    {!puedeEnviar && (
                      <div className="flex items-center gap-2 rounded-lg bg-warning/8 border border-warning/20 px-3 py-2">
                        <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                        <p className="text-xs text-warning">
                          {t('inputDisabledHint')}
                        </p>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={puedeEnviar ? t('inputPlaceholder') : ''}
                        disabled={!puedeEnviar || isSending}
                        rows={1}
                        className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => void handleSend()}
                        disabled={
                          !puedeEnviar || isSending || input.trim().length === 0
                        }
                        className="rounded-xl shrink-0 h-10 w-10"
                        aria-label={t('sendBtn')}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </EgresadoShell>
  )
}
