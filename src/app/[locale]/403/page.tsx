import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { ShieldOff } from 'lucide-react'
import Link from 'next/link'

export default async function ForbiddenPage() {
  const t = await getTranslations('Errors')

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10 text-destructive">
              <ShieldOff className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">
              {t('forbidden')}
              <span className="text-primary">.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('forbiddenDesc')}
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/">{t('forbiddenBack')}</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
