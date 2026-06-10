'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { Project } from '@/types'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'

type GridColumns = 'two' | 'three'

const GRID_LAYOUT_CLASS: Record<GridColumns, string> = {
  two: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  three: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6',
}

interface ProjectGridProps {
  projects: Project[]
  columns?: GridColumns
  renderActionButton?: (project: Project) => ReactNode
}

export function ProjectGrid({
  projects,
  columns = 'two',
  renderActionButton,
}: ProjectGridProps) {
  const tNav = useTranslations('Nav')

  return (
    <ul
      className={GRID_LAYOUT_CLASS[columns]}
      role="list"
      aria-label={tNav('projects')}
    >
      {projects.map((project) => {
        const actionButton = renderActionButton?.(project)

        return (
          <li key={project.id} className="list-none">
            <ProjectCard
              project={project}
              {...(actionButton !== undefined ? { actionButton } : {})}
            />
          </li>
        )
      })}
    </ul>
  )
}
