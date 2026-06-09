import React from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export function AuthFooter() {
  const t = useTranslations('Auth')

  return (
    <div className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
      {t('termsText')}
      <Link
        href="/terms"
        className="underline hover:text-gray-600 transition-colors"
      >
        {t('termsLink')}
      </Link>
      {t('and')}
      <Link
        href="/privacy"
        className="underline hover:text-gray-600 transition-colors"
      >
        {t('privacyLink')}
      </Link>
      .
    </div>
  )
}
