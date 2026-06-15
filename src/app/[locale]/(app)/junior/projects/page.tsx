'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { SearchBar } from '@/components/features/SearchBar'
import { ProjectFilters } from '@/components/features/marketplace/ProjectFilters'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { LoadingSkeleton } from '@/components/features/shared/LoadingSkeleton'
import { Briefcase } from 'lucide-react'

export default function EgresadoProjectsMarketplace() {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const { projects } = useAppState()

  const [search, setSearch] = useState('')
  const [selectedStack, setSelectedStack] = useState('')
  const [selectedMode, setSelectedMode] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [loading, setLoading] = useState(false)

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  )

  const availableStacks = useMemo(() => {
    const stacks = new Set<string>()
    activeProjects.forEach((p) => p.stack.forEach((s) => stacks.add(s)))
    return Array.from(stacks).sort()
  }, [activeProjects])

  useEffect(() => {
    const startTimer = setTimeout(() => setLoading(true), 0)
    const endTimer = setTimeout(() => setLoading(false), 400)
    return () => {
      clearTimeout(startTimer)
      clearTimeout(endTimer)
    }
  }, [search, selectedStack, selectedMode, selectedDuration, selectedBudget])

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
      if (selectedDuration === 'short') {
        matchesDuration =
          (project.duration.toLowerCase().includes('semana') &&
            (project.duration.includes('1') ||
              project.duration.includes('2'))) ||
          project.duration.toLowerCase().includes('día')
      } else if (selectedDuration === 'medium') {
        matchesDuration =
          project.duration.toLowerCase().includes('semana') &&
          (project.duration.includes('3') || project.duration.includes('4'))
      } else if (selectedDuration === 'long') {
        matchesDuration = project.duration.toLowerCase().includes('mes')
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
            {loading ? (
              <LoadingSkeleton type="card" count={4} />
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                title={tEgresado('emptyState')}
                description={tEgresado('emptyStateDesc')}
                icon={Briefcase}
                actionText={tCommon('clearFilters')}
                onAction={handleClearFilters}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
