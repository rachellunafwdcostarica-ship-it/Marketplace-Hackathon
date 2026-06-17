'use client'

import React, { useState, useEffect } from 'react'
import { useDemoData as useAppState } from '@/lib/StateContext'
import { PortfolioProjectForm } from './PortfolioProjectForm'
import { useTranslations } from 'next-intl'
import { addOrUpdateSkill, deleteSkill } from '@/lib/portfolio/skills'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
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
  Globe,
  Lock,
  BookOpen,
} from 'lucide-react'
import type { PortfolioProject, StudentSkill, SkillLevel } from '@/types'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function SkillForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: StudentSkill
  onSave: (skill: StudentSkill) => void
  onCancel: () => void
}) {
  const t = useTranslations('Portfolio')

  const skillSchema = React.useMemo(() => {
    return z.object({
      name: z.string().min(2, t('errorTitleReq')),
      level: z.enum(['basico', 'intermedio', 'avanzado']),
    })
  }, [t])
  type SkillFormValues = z.infer<typeof skillSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: initialData?.name || '',
      level: initialData?.level || 'basico',
    },
  })

  const onSubmit = (data: SkillFormValues) => {
    onSave({
      id: initialData?.id || `skill-${Date.now()}`,
      name: data.name,
      level: data.level,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="skill-name" className="text-sm font-medium">
          {t('skillName')}
        </label>
        <input
          id="skill-name"
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="skill-level" className="text-sm font-medium">
          {t('skillLevel')}
        </label>
        <select
          id="skill-level"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('level')}
        >
          <option value="basico">{t('levelBasic')}</option>
          <option value="intermedio">{t('levelIntermediate')}</option>
          <option value="avanzado">{t('levelAdvanced')}</option>
        </select>
        {errors.level && (
          <p className="text-xs text-destructive">{errors.level.message}</p>
        )}
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
  const { studentPortfolio, setStudentPortfolio } = useAppState()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<
    PortfolioProject | undefined
  >(undefined)
  const [editingSkill, setEditingSkill] = useState<StudentSkill | undefined>(
    undefined,
  )
  const t = useTranslations('Portfolio')

  const bioSchema = React.useMemo(() => {
    return z.object({
      bio: z.string().max(2000, t('errorBioMax')),
    })
  }, [t])
  type BioValues = z.infer<typeof bioSchema>

  const projects = studentPortfolio?.projects || []
  const skills = studentPortfolio?.skills || []

  const portfolioBio = studentPortfolio?.bio

  const {
    register: registerBio,
    handleSubmit: handleBioSubmit,
    formState: { errors: bioErrors },
    reset: resetBio,
  } = useForm<BioValues>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      bio: portfolioBio || '',
    },
  })

  useEffect(() => {
    resetBio({ bio: portfolioBio || '' })
  }, [portfolioBio, resetBio])

  const handleVisibilityChange = (visibility: 'publico' | 'empresas') => {
    if (!studentPortfolio) return
    setStudentPortfolio({
      ...studentPortfolio,
      visibility,
    })
    toast.success(t('toastVisibilityUpdated'))
  }

  const handleBioSave = (data: BioValues) => {
    if (!studentPortfolio) return
    setStudentPortfolio({
      ...studentPortfolio,
      bio: data.bio || '',
    })
    toast.success(t('toastBioSaved'))
  }

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
    setStudentPortfolio({
      ...studentPortfolio,
      skills: addOrUpdateSkill(skills, skill),
    })
    setIsSkillDialogOpen(false)
    setEditingSkill(undefined)
  }

  const handleDeleteSkill = (id: string) => {
    if (!studentPortfolio) return
    setStudentPortfolio({
      ...studentPortfolio,
      skills: deleteSkill(skills, id),
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
      {/* Visibility Settings, Biography Editor & Profile Preview (RF-14 & RF-15) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('formVisibilityLabel')}
              </CardTitle>
              <CardDescription>{t('visibilityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    studentPortfolio?.visibility === 'publico'
                      ? 'default'
                      : 'outline'
                  }
                  className="flex-1 justify-center gap-2"
                  onClick={() => handleVisibilityChange('publico')}
                >
                  <Globe className="h-4 w-4" />
                  {t('visibilityPublic')}
                </Button>
                <Button
                  type="button"
                  variant={
                    studentPortfolio?.visibility === 'empresas'
                      ? 'default'
                      : 'outline'
                  }
                  className="flex-1 justify-center gap-2"
                  onClick={() => handleVisibilityChange('empresas')}
                >
                  <Lock className="h-4 w-4" />
                  {t('visibilityCompanies')}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                {studentPortfolio?.visibility === 'publico'
                  ? t('visibilityPublicDesc')
                  : t('visibilityCompaniesDesc')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('bioTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleBioSubmit(handleBioSave)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="portfolio-bio-textarea" className="sr-only">
                    {t('bioTitle')}
                  </Label>
                  <Textarea
                    id="portfolio-bio-textarea"
                    placeholder={t('bioPlaceholder')}
                    {...registerBio('bio')}
                    rows={6}
                  />
                  {bioErrors.bio && (
                    <p className="text-xs text-destructive">
                      {bioErrors.bio.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  {t('saveBio')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7">
          <Card className="h-full border border-primary/20 bg-surface shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold font-display">
                    {t('profilePreview')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('visibilityText')}{' '}
                    <span className="font-semibold text-primary">
                      {studentPortfolio?.visibility === 'publico'
                        ? t('visibilityPublic')
                        : t('visibilityCompanies')}
                    </span>
                  </p>
                </div>
                <Badge
                  variant={
                    studentPortfolio?.visibility === 'publico'
                      ? 'default'
                      : 'secondary'
                  }
                  className="gap-1"
                >
                  {studentPortfolio?.visibility === 'publico' ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {studentPortfolio?.visibility === 'publico'
                    ? t('visibilityPublic')
                    : t('visibilityCompanies')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 font-sans">
              {/* === Biografía === */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/20"></div>
                  <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
                    {t('bioSection')}
                  </div>
                  <div className="h-px flex-1 bg-primary/20"></div>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {studentPortfolio?.bio ? (
                    studentPortfolio.bio
                  ) : (
                    <span className="text-muted-foreground italic">
                      {t('noBio')}
                    </span>
                  )}
                </p>
              </div>

              {/* === Habilidades === */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/20"></div>
                  <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
                    {t('skillsSection')}
                  </div>
                  <div className="h-px flex-1 bg-primary/20"></div>
                </div>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {t('noSkills')}
                  </p>
                ) : (
                  <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                    {skills.map((skill) => (
                      <div key={skill.id} className="text-sm text-foreground">
                        {skill.name} <span className="opacity-50 mx-1">—</span>{' '}
                        {skill.level === 'avanzado'
                          ? t('levelAdvanced')
                          : skill.level === 'intermedio'
                            ? t('levelIntermediate')
                            : t('levelBasic')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* === Proyectos === */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/20"></div>
                  <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
                    {t('projectsSection')}
                  </div>
                  <div className="h-px flex-1 bg-primary/20"></div>
                </div>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {t('noProjects')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="space-y-1 pl-2 border-l-2 border-primary/20"
                      >
                        <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                          <span>{proj.title}</span>
                          {proj.completionDate && (
                            <span className="text-xs text-muted-foreground font-normal">
                              (
                              {new Date(
                                proj.completionDate,
                              ).toLocaleDateString()}
                              )
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground font-semibold pt-1">
                          {t('technologiesUsed')}:
                        </div>
                        <div className="text-xs text-foreground font-medium">
                          {proj.technologies.join(', ')}
                        </div>
                        <div className="flex gap-2 pt-1 text-xs">
                          {proj.repositoryUrl && (
                            <a
                              href={proj.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <GitBranch className="h-3 w-3" /> {t('repo')}
                            </a>
                          )}
                          {proj.demoUrl && (
                            <a
                              href={proj.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" /> {t('demo')}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6 pt-8 border-t">
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
