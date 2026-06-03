import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <main className="bg-canvas min-h-[100dvh] px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-heading text-ink-muted text-xs font-bold tracking-[0.18em] uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="font-heading text-foreground mt-3 text-5xl font-extrabold tracking-tight">
          {t('title')}
          <span className="text-primary">.</span>
        </h1>
        <p className="font-body text-ink-muted mt-4 max-w-prose text-lg">
          {t('description')}
        </p>
      </div>
    </main>
  )
}
