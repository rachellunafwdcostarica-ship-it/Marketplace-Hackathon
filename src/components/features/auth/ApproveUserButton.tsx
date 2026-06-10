'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { approveUser } from '@/lib/auth/actions'

interface ApproveUserButtonProps {
  userId: string
  userName: string
}

export function ApproveUserButton({
  userId,
  userName,
}: ApproveUserButtonProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    const result = await approveUser(userId)
    setLoading(false)

    if (result.ok) {
      toast.success(t('userApproved', { name: userName }))
      router.refresh()
    } else {
      toast.error(t('userApproveError'))
    }
  }

  return (
    <Button
      onClick={handleApprove}
      disabled={loading}
      size="sm"
      className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex items-center gap-1.5"
    >
      <CheckCircle className="w-4 h-4" />
      {loading ? t('approving') : t('approveUser')}
    </Button>
  )
}
