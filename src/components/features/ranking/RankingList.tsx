'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TalentRankingItem } from '@/lib/ranking/actions'

import { Star, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface RankingListProps {
  topTalents: TalentRankingItem[]
  totalCount: number
  page: number
  pageSize: number
  categoria: string
  tecnologiaId: string
  tecnologiasDisponibles: { id: string; nombre: string }[]
}

export function RankingList({
  topTalents,
  totalCount,
  page,
  pageSize,
  categoria,
  tecnologiaId,
  tecnologiasDisponibles,
}: RankingListProps) {
  const t = useTranslations('Ranking')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 on filter change
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push(pathname)
  }

  const activeCategoriaLabel = categoria
    ? categoria.charAt(0).toUpperCase() + categoria.slice(1)
    : ''

  const activeTechLabel = tecnologiaId
    ? tecnologiasDisponibles.find((t) => t.id === tecnologiaId)?.nombre
    : ''

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-foreground">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
          {t('filterTitle')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              {t('filterCategory')}
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={categoria}
              onChange={(e) => handleFilterChange('categoria', e.target.value)}
            >
              <option value="">{t('filterCategory')}...</option>
              <option value="frontend">{t('categoryFrontend')}</option>
              <option value="backend">{t('categoryBackend')}</option>
              <option value="fullstack">{t('categoryFullstack')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              {t('filterTech')}
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={tecnologiaId}
              onChange={(e) =>
                handleFilterChange('tecnologiaId', e.target.value)
              }
            >
              <option value="">{t('filterTech')}...</option>
              {tecnologiasDisponibles.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Tags */}
        {(activeCategoriaLabel || activeTechLabel) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            {activeCategoriaLabel && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                {activeCategoriaLabel}
                <button
                  onClick={() => handleFilterChange('categoria', '')}
                  className="hover:text-primary/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeTechLabel && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                {activeTechLabel}
                <button
                  onClick={() => handleFilterChange('tecnologiaId', '')}
                  className="hover:text-primary/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground ml-2 transition-colors"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('showingCount', { count: totalCount })}</span>
        <div className="flex items-center gap-2">
          <span>{t('sortByReputation')}</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {topTalents.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border">
            <p className="text-muted-foreground">{t('emptyState')}</p>
          </div>
        ) : (
          topTalents.map((talent, index) => {
            const rank = (page - 1) * pageSize + index + 1
            const displayRating = talent.reputacion
            // Profile link using id_participacion. Since we don't have id_participacion here,
            // the requirements say we link to the portfolio. For empresario it's portafolio-egresado/[id]
            // We need to pass the proper URL or let the component build it.
            // Actually, the route we modified was `empresario/portafolio-egresado/[id_participacion]`
            // Wait, what if we use the student ID? The route `empresario/portafolio-egresado/[id_participacion]` uses id_participacion.
            // But we only have `id_estudiante`. The user can be in the DB but not have a specific participation for THIS company.
            // So we need to route to a generic profile view. But the user said: "Se debe redirigir a otra ventana con donde se vea el perfil del egresado a como se ve en su panel en la ventana de portafolio".
            // Since we are creating a ranking of students, we can link them to a generic student portfolio route if they are public.

            return (
              <div
                key={talent.idEstudiante}
                className="bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col md:flex-row items-center gap-6 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-center w-12 flex-shrink-0 text-highlight font-bold text-xl">
                  {rank.toString().padStart(2, '0')}
                </div>

                <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                  {talent.fotoPerfil ? (
                    <Image
                      src={talent.fotoPerfil}
                      alt={talent.nombreCompleto}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-border bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                      {talent.nombreCompleto.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      {talent.nombreCompleto}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {talent.tecnologias.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="bg-primary/5 text-primary text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-center">
                    {displayRating !== null ? (
                      <>
                        <div className="flex items-center gap-1.5 bg-highlight/10 text-highlight px-3 py-1.5 rounded-full font-semibold">
                          {displayRating.toFixed(1)}{' '}
                          <Star className="w-5 h-5 text-highlight fill-highlight" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {t('reputation')}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground px-3 py-1.5">
                          {t('noReputation')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Since we don't have id_participacion here, we will link to the public generic portfolio which any verified company can see if public */}
                  <Link
                    href={`${pathname}/${talent.idEstudiante}`}
                    className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {t('viewProfile')}
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 border border-border rounded bg-surface text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-10 h-10 rounded border text-sm font-medium transition-colors ${
                page === p
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-surface border-border text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 border border-border rounded bg-surface text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
