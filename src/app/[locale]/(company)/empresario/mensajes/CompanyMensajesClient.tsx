'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export function CompanyMensajesClient() {
  const t = useTranslations('CompanyMensajes')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
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
        </main>
      </div>

      <Footer />
    </div>
  )
}
