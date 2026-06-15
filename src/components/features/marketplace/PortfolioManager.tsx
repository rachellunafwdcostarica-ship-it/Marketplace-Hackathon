'use client'

import React, { useState } from 'react'
/*
""" ANTES """
import { useAppState } from '@/lib/StateContext'

""" DESPUES """
import { useDemoData } from '@/lib/DemoDataContext'
*/
import { useDemoData } from '@/lib/DemoDataContext'
import { PortfolioProjectForm } from './PortfolioProjectForm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  PlusCircle,
  Pencil,
  Trash2,
  ExternalLink,
  GitBranch,
} from 'lucide-react'
import type { PortfolioProject } from '@/types'

export function PortfolioManager() {
  /*
  """ ANTES """
  const { studentPortfolio, setStudentPortfolio } = useAppState()

  """ DESPUES """
  const { studentPortfolio, setStudentPortfolio } = useDemoData()
  */
  const { studentPortfolio, setStudentPortfolio } = useDemoData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<
    PortfolioProject | undefined
  >(undefined)

  const projects = studentPortfolio?.projects || []

  const handleSave = (project: PortfolioProject) => {
    if (!studentPortfolio) return

    let updatedProjects = [...projects]
    if (editingProject) {
      updatedProjects = updatedProjects.map((p) =>
        p.id === project.id ? project : p,
      )
    } else {
      updatedProjects = [...updatedProjects, project]
    }

    setStudentPortfolio({
      ...studentPortfolio,
      projects: updatedProjects,
    })

    setIsDialogOpen(false)
    setEditingProject(undefined)
  }

  const handleDelete = (id: string) => {
    if (!studentPortfolio) return
    setStudentPortfolio({
      ...studentPortfolio,
      projects: projects.filter((p) => p.id !== id),
    })
  }

  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project)
    setIsDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingProject(undefined)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Proyectos del Portafolio
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </DialogTitle>
            </DialogHeader>
            <PortfolioProjectForm
              {...(editingProject ? { initialData: editingProject } : {})}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Aún no hay proyectos en tu portafolio.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                <CardDescription className="text-sm">
                  Finalizado:{' '}
                  {new Date(project.completionDate).toLocaleDateString('es-ES')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-4 text-sm mt-4">
                  {project.repositoryUrl && (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:underline"
                    >
                      <GitBranch className="mr-1 h-4 w-4" /> Repo
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:underline"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" /> Demo
                    </a>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(project)}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleDelete(project.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
