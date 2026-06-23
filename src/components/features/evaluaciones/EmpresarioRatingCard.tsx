'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { rateEgresado } from '@/lib/evaluaciones/actions'

interface EmpresarioRatingCardProps {
  idEstudiante: string
  idContratacion: string
  existingRating: { puntuacion: number; comentario: string | null } | null
}

export function EmpresarioRatingCard({
  idEstudiante,
  idContratacion,
  existingRating,
}: EmpresarioRatingCardProps) {
  const t = useTranslations('ProjectDetail')
  const router = useRouter()

  const [ratingScore, setRatingScore] = useState(
    existingRating?.puntuacion ?? 0,
  )
  const [ratingComment, setRatingComment] = useState(
    existingRating?.comentario ?? '',
  )
  const [hoverScore, setHoverScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [hasRated, setHasRated] = useState(existingRating !== null)

  return (
    <Card className="border border-border/80 bg-surface shadow-md overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-secondary to-accent" />
      <CardContent className="p-6 pt-8 space-y-6">
        <div className="space-y-1 text-left">
          <h3 className="text-base font-extrabold font-heading text-foreground">
            {t('rateEgresadoTitle')}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('rateEgresadoDesc')}
          </p>
        </div>

        {hasRated ? (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground mr-2">
                {t('rateEgresadoRatingLabel')}:
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= ratingScore
                        ? 'text-secondary fill-secondary'
                        : 'text-muted-foreground/25'
                    }`}
                  />
                ))}
              </div>
            </div>
            {ratingComment && (
              <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-xs text-foreground/90">
                <span className="font-bold block mb-1 text-muted-foreground uppercase text-[10px]">
                  {t('rateEgresadoCommentLabel')}
                </span>
                {ratingComment}
              </div>
            )}
            <p className="text-xs text-accent font-semibold">
              {t('rateEgresadoAlreadyRated')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground">
                {t('rateEgresadoRatingLabel')} *
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={submitting}
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(0)}
                    onClick={() => setRatingScore(star)}
                    className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= (hoverScore || ratingScore)
                          ? 'text-secondary fill-secondary'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="egresado-rating-comment"
                className="block text-xs font-bold text-muted-foreground"
              >
                {t('rateEgresadoCommentLabel')}
              </label>
              <textarea
                id="egresado-rating-comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={t('rateEgresadoCommentPlaceholder')}
                disabled={submitting}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={1000}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={submitting || ratingScore === 0}
              onClick={async () => {
                if (ratingScore === 0) return
                setSubmitting(true)
                const res = await rateEgresado({
                  idEstudiante,
                  idContratacion,
                  puntuacion: ratingScore,
                  comentario: ratingComment.trim() || undefined,
                })
                setSubmitting(false)
                if (res.ok) {
                  toast.success(t('rateEgresadoSuccess'))
                  setHasRated(true)
                  router.refresh()
                } else {
                  toast.error(res.error)
                }
              }}
              className="font-semibold text-xs flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('rateEgresadoSubmit')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
