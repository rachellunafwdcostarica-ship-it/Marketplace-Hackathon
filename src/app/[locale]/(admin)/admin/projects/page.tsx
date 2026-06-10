'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Briefcase, EyeOff, CheckCircle } from 'lucide-react'
import type { Project } from '@/types'

export default function AdminProjectsPage() {
  const tAdmin = useTranslations('Admin')
  const { projects, updateProjectStatus } = useAppState()

  const handleHide = (id: string, title: string) => {
    updateProjectStatus(id, 'closed')
    toast.warning(tAdmin('projectHidden', { title }))
  }

  const handleApprove = (id: string, title: string) => {
    updateProjectStatus(id, 'active')
    toast.success(tAdmin('projectApprovedSuccess', { title }))
  }

  const activeProjects = projects.filter((p) => p.status === 'active')
  const pendingProjects = projects.filter((p) => p.status === 'pending')
  const closedProjects = projects.filter((p) => p.status === 'closed')

  const renderSection = (
    title: string,
    list: Project[],
    action: 'hide' | 'approve' | 'none',
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold tracking-tight text-foreground font-heading border-b border-border/60 pb-2">
        {title} ({list.length})<span className="text-magenta font-bold">.</span>
      </h3>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2">
          {tAdmin('noProjectsInCategory')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              actionButton={
                action === 'none' ? undefined : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      action === 'hide'
                        ? handleHide(project.id, project.title)
                        : handleApprove(project.id, project.title)
                    }
                    className={
                      action === 'hide'
                        ? 'w-full border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-1.5'
                        : 'w-full border-accent/20 text-accent hover:bg-accent/10 flex items-center justify-center gap-1.5'
                    }
                  >
                    {action === 'hide' ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        {tAdmin('hideFromMarketplace')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {tAdmin('approve')}
                      </>
                    )}
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <PageTitle
          title={tAdmin('moderateProject')}
          description={tAdmin('moderateProjectDesc')}
          dotColor="text-magenta"
        />

        {projects.length === 0 ? (
          <EmptyState
            title={tAdmin('noProjects')}
            description={tAdmin('noProjectsDesc')}
            icon={Briefcase}
          />
        ) : (
          <>
            {renderSection(tAdmin('projectsActive'), activeProjects, 'hide')}
            {renderSection(
              tAdmin('projectsPending'),
              pendingProjects,
              'approve',
            )}
            {renderSection(tAdmin('projectsClosed'), closedProjects, 'none')}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
