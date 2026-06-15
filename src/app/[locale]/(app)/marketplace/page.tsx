'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { SearchBar } from '@/components/features/SearchBar'
import { ProjectFilters } from '@/components/features/marketplace/ProjectFilters'
import { EmptyState } from '@/components/features/shared/EmptyState'

import { Briefcase } from 'lucide-react'
import { ProjectGrid } from '@/components/features/marketplace/ProjectGrid'

export default function MarketplacePage() {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const { projects } = useAppState()

  const [search, setSearch] = useState('')
  const [selectedStack, setSelectedStack] = useState('')
  const [selectedMode, setSelectedMode] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  )

  const availableStacks = useMemo(() => {
    const stacks = new Set<string>()
    activeProjects.forEach((p) => p.stack.forEach((s) => stacks.add(s)))
    return Array.from(stacks).sort()
  }, [activeProjects])

  const handleClearFilters = () => {
    setSearch('')
    setSelectedStack('')
    setSelectedMode('')
    setSelectedDuration('')
    setSelectedBudget('')
  }

  const filteredProjects = useMemo(() => {
    return activeProjects.filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(search.toLowerCase()) ||
        project.companyName.toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase())

      const matchesStack =
        !selectedStack || project.stack.includes(selectedStack)
      const matchesMode = !selectedMode || project.mode === selectedMode

      let matchesDuration = true
      const durationStr = project.duration.toLowerCase()
      if (selectedDuration === 'short') {
        matchesDuration =
          /(1|2)\s*(semana|week)/.test(durationStr) ||
          /d(í|i)a|day/.test(durationStr) ||
          /short/.test(durationStr)
      } else if (selectedDuration === 'medium') {
        matchesDuration =
          /(3|4)\s*(semana|week)/.test(durationStr) ||
          /medium/.test(durationStr)
      } else if (selectedDuration === 'long') {
        matchesDuration = /mes|month|long/.test(durationStr)
      }

      let matchesBudget = true
      if (selectedBudget === 'low') matchesBudget = project.budget < 500
      else if (selectedBudget === 'mid')
        matchesBudget = project.budget >= 500 && project.budget <= 800
      else if (selectedBudget === 'high') matchesBudget = project.budget > 800

      return (
        matchesSearch &&
        matchesStack &&
        matchesMode &&
        matchesDuration &&
        matchesBudget
      )
    })
  }, [
    activeProjects,
    search,
    selectedStack,
    selectedMode,
    selectedDuration,
    selectedBudget,
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tEgresado('marketplace')}
          description={tEgresado('marketplaceDesc')}
          dotColor="text-accent"
        />

        <div className="space-y-6">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={tEgresado('searchPlaceholder')}
          />

          <ProjectFilters
            selectedStack={selectedStack}
            setSelectedStack={setSelectedStack}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            selectedBudget={selectedBudget}
            setSelectedBudget={setSelectedBudget}
            availableStacks={availableStacks}
            onClear={handleClearFilters}
          />

          <div className="pt-4">
            {filteredProjects.length === 0 ? (
              <EmptyState
                title={tEgresado('emptyState')}
                description={tEgresado('emptyStateDesc')}
                icon={Briefcase}
                actionText={tCommon('clearFilters')}
                onAction={handleClearFilters}
              />
            ) : (
              <ProjectGrid projects={filteredProjects} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
