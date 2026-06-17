'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addStrike } from '@/lib/admin/strike-actions'
import type { Database } from '@/types/database'

type MotivoStrikeEnum = Database['public']['Enums']['motivo_strike_enum']

interface SimpleUser {
  id_usuario: string
  nombre: string
  apellido_1: string
  apellido_2: string | null
  correo: string
}

interface CreateStrikeButtonProps {
  users: SimpleUser[]
  currentUserId: string | null
}

const MOTIVO_LABELS: Record<MotivoStrikeEnum, string> = {
  no_entrego: 'No entregó el proyecto',
  abandono_proyecto: 'Abandonó el proyecto',
  conducta_inapropiada: 'Conducta inapropiada',
  calificacion_baja_repetida: 'Calificación baja repetida',
  fraude: 'Fraude o engaño',
  ghosting: 'Ghosting (sin respuesta)',
  otro: 'Otro motivo',
}

const MOTIVOS = Object.keys(MOTIVO_LABELS) as MotivoStrikeEnum[]

export function CreateStrikeButton({
  users,
  currentUserId,
}: CreateStrikeButtonProps) {
  const t = useTranslations('Admin')
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [motivoEnum, setMotivoEnum] = useState<MotivoStrikeEnum>('otro')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  // Filter users to exclude the admin themselves and filter by search query
  const filteredUsers = users
    .filter((u) => u.id_usuario !== currentUserId)
    .filter((u) => {
      const fullName =
        `${u.nombre} ${u.apellido_1} ${u.apellido_2 ?? ''}`.toLowerCase()
      const email = u.correo.toLowerCase()
      const search = searchQuery.toLowerCase()
      return fullName.includes(search) || email.includes(search)
    })

  const handleOpen = () => {
    setSearchQuery('')
    setSelectedUserId('')
    setMotivoEnum('otro')
    setDescripcion('')
    setIsOpen(true)
  }

  const handleClose = () => {
    if (!loading) setIsOpen(false)
  }

  const handleConfirm = async () => {
    if (!selectedUserId) {
      toast.error('Por favor, selecciona un usuario.')
      return
    }

    setLoading(true)
    try {
      const result = await addStrike(
        selectedUserId,
        motivoEnum,
        descripcion.trim() || undefined,
      )

      if (result.ok) {
        toast.success('Strike aplicado correctamente.')
        setIsOpen(false)
        router.refresh()
      } else {
        toast.error('Error al aplicar el strike.')
      }
    } catch {
      toast.error('Error de comunicación con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-warning text-warning-foreground hover:bg-warning/90 font-semibold"
      >
        <Plus className="h-4 w-4" />
        Aplicar Strike
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Aplicar Strike a Usuario
            </DialogTitle>
            <DialogDescription>
              Busca y selecciona el usuario a sancionar. El strike se registrará
              en el historial de auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Buscador de usuario */}
            <div className="space-y-2">
              <Label htmlFor="user-search">Buscar Usuario</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search"
                  placeholder="Escribe el nombre o correo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedUserId('') // Reset selection on typing
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Selección de usuario */}
            <div className="space-y-2">
              <Label htmlFor="user-select">
                Seleccionar Usuario ({filteredUsers.length} encontrados)
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Seleccione un usuario de la lista" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    filteredUsers.slice(0, 20).map((u) => (
                      <SelectItem key={u.id_usuario} value={u.id_usuario}>
                        {u.nombre} {u.apellido_1} ({u.correo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {filteredUsers.length > 20 && (
                <p className="text-[10px] text-muted-foreground">
                  Se muestran los primeros 20 resultados. Refina tu búsqueda si
                  no encuentras al usuario.
                </p>
              )}
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Select
                value={motivoEnum}
                onValueChange={(val) => setMotivoEnum(val as MotivoStrikeEnum)}
              >
                <SelectTrigger id="motivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOTIVO_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción detallada (Opcional)</Label>
              <Textarea
                id="desc"
                placeholder="Explique detalladamente el motivo de la sanción..."
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90 font-semibold"
              onClick={handleConfirm}
              disabled={loading || !selectedUserId}
            >
              {loading ? 'Aplicando...' : 'Aplicar Strike'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
