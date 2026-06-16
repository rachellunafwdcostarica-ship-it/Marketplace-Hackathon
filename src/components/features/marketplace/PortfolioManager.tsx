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
import { useTranslations } from 'next-intl'
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
import type { PortfolioProject, StudentSkill, SkillLevel } from '@/types'

function SkillForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: StudentSkill
  onSave: (skill: StudentSkill) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialData?.name || '')
  const [level, setLevel] = useState<SkillLevel>(initialData?.level || 'basico')
  const t = useTranslations('Portfolio')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: initialData?.id || `skill-${Date.now()}`,
      name,
      level,
    })
  }

  // TODO(RF-09): Reemplazar input de texto libre con el componente SkillPicker cuando la BD esté conectada.
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('skillName')}</label>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('skillLevel')}</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value as SkillLevel)}
        >
          <option value="basico">{t('levelBasic')}</option>
          <option value="intermedio">{t('levelIntermediate')}</option>
          <option value="avanzado">{t('levelAdvanced')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit">{t('saveSkill')}</Button>
      </div>
    </form>
  )
}

export function PortfolioManager() {
  /*
  """ ANTES """
  const { studentPortfolio, setStudentPortfolio } = useAppState()

  """ DESPUES """
  const { studentPortfolio, setStudentPortfolio } = useDemoData()
  */
  const { studentPortfolio, setStudentPortfolio } = useDemoData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<
    PortfolioProject | undefined
  >(undefined)
  const [editingSkill, setEditingSkill] = useState<StudentSkill | undefined>(
    undefined,
  )
  const t = useTranslations('Portfolio')

  const projects = studentPortfolio?.projects || []
  const skills = studentPortfolio?.skills || []

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

  const handleSaveSkill = (skill: StudentSkill) => {
    if (!studentPortfolio) return
    let updatedSkills = [...skills]
    if (editingSkill) {
      updatedSkills = updatedSkills.map((s) => (s.id === skill.id ? skill : s))
    } else {
      updatedSkills = [...updatedSkills, skill]
    }
    setStudentPortfolio({
      ...studentPortfolio,
      skills: updatedSkills,
    })
    setIsSkillDialogOpen(false)
    setEditingSkill(undefined)
  }

  const handleDeleteSkill = (id: string) => {
    if (!studentPortfolio) return
    setStudentPortfolio({
      ...studentPortfolio,
      skills: skills.filter((s) => s.id !== id),
    })
  }

  const handleEditSkill = (skill: StudentSkill) => {
    setEditingSkill(skill)
    setIsSkillDialogOpen(true)
  }

  const handleAddNewSkill = () => {
    setEditingSkill(undefined)
    setIsSkillDialogOpen(true)
  }

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('managerTitle')}
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addProject')}
              </Button>
            </DialogTrigger>
            <DialogContent
              id="portfolio-dialog"
              className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? t('editProject') : t('newProject')}
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
            <p className="text-muted-foreground">{t('noProjects')}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t('finishedPrefix')}{' '}
                    {new Date(project.completionDate).toLocaleDateString()}
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
                        <GitBranch className="mr-1 h-4 w-4" /> {t('repo')}
                      </a>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="mr-1 h-4 w-4" /> {t('demo')}
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
                    <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('skillsTitle')}
          </h2>
          <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNewSkill}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addSkill')}
              </Button>
            </DialogTrigger>
            <DialogContent id="skill-dialog" className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSkill ? t('editSkill') : t('newSkill')}
                </DialogTitle>
              </DialogHeader>
              <SkillForm
                {...(editingSkill ? { initialData: editingSkill } : {})}
                onSave={handleSaveSkill}
                onCancel={() => setIsSkillDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {skills.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">{t('noSkills')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.id}>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex justify-between items-center">
                    {skill.name}
                    <Badge
                      variant={
                        skill.level === 'avanzado'
                          ? 'default'
                          : skill.level === 'intermedio'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {skill.level === 'avanzado'
                        ? t('levelAdvanced')
                        : skill.level === 'intermedio'
                          ? t('levelIntermediate')
                          : t('levelBasic')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2 py-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSkill(skill)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => handleDeleteSkill(skill.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
