'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export function CompanyMensajesClient() {
  const t = useTranslations('CompanyMensajes')

  return (
    <CompanyShell>
      <div className="space-y-8">
        <PageTitle
          title={t('title')}
          description={t('description')}
          dotColor="text-primary"
        />

        <Card className="border border-border/60 bg-card/30">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <MessageSquare className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-heading">
              {t('placeholderTitle')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('placeholderDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </CompanyShell>
  )
}
