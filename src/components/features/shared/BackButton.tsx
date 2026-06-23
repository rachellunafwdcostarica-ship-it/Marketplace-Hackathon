'use client'

import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  label: string
}

export function BackButton({ label }: BackButtonProps) {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className="gap-2 pl-0 hover:bg-transparent"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  )
}
