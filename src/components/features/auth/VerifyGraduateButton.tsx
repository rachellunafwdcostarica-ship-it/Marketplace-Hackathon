'use client'

// TEMPORAL (Samir · Bloque 0): botón mínimo para demostrar el flujo de
// verificación de egresados de punta a punta. La action `verificarEgresado`
// es definitiva; este botón NO. María del Sol lo adopta/estiliza dentro de
// ADM-1 (búsqueda, filtro por rol, detalle de cuenta). No es UI final.

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { verificarEgresado } from '@/lib/admin/actions'

interface VerifyGraduateButtonProps {
  userId: string
  userName: string
}

export function VerifyGraduateButton({
  userId,
  userName,
}: VerifyGraduateButtonProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    setLoading(true)
    const result = await verificarEgresado(userId)
    setLoading(false)

    if (result.ok) {
      toast.success(t('graduateVerified', { name: userName }))
      router.refresh()
    } else if (result.error === 'not_a_student') {
      toast.error(t('graduateVerifyNotStudent'))
    } else {
      toast.error(t('graduateVerifyError'))
    }
  }

  return (
    <Button
      onClick={handleVerify}
      disabled={loading}
      size="sm"
      variant="outline"
      className="font-semibold flex items-center gap-1.5"
    >
      <GraduationCap className="w-4 h-4" />
      {loading ? t('verifying') : t('verifyGraduate')}
    </Button>
  )
}
