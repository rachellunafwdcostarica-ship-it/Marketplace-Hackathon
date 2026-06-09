import React from 'react'
import { useTranslations } from 'next-intl'

interface PasswordStrengthIndicatorProps {
  password?: string
}

export function PasswordStrengthIndicator({
  password = '',
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations('Auth')

  if (!password) return null

  // Calculate password strength score (0 to 3)
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1

  const getStrengthLabel = () => {
    if (score <= 1) return t('strengthWeak')
    if (score === 2) return t('strengthMedium')
    return t('strengthStrong')
  }

  const getStrengthColor = () => {
    if (score <= 1) return 'bg-red-500'
    if (score === 2) return 'bg-[#FFCB05]' // Highlight color
    return 'bg-[#20BEC6]' // Accent color
  }

  const getStrengthTextColor = () => {
    if (score <= 1) return 'text-red-500'
    if (score === 2) return 'text-[#d6aa00]'
    return 'text-[#1ca6ad]'
  }

  return (
    <div className="space-y-1.5 mt-2 animate-fade-in">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-gray-400">{t('passwordStrength')}</span>
        <span className={getStrengthTextColor()}>{getStrengthLabel()}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
        <div
          className={`h-full ${getStrengthColor()} transition-all duration-300`}
          style={{ width: `${(score / 3) * 100}%` }}
        />
      </div>
    </div>
  )
}
