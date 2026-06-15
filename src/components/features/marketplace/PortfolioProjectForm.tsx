'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { PortfolioProject } from '@/types'

const schema = z.object({
  title: z
    .string()
    .min(3, 'El título es requerido y debe tener al menos 3 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  technologies: z.string().min(1, 'Agrega al menos una tecnología'),
  completionDate: z.string().min(1, 'La fecha de finalización es requerida'),
  repositoryUrl: z
    .string()
    .url('URL de repositorio inválida')
    .optional()
    .or(z.literal('')),
  demoUrl: z.string().url('URL de demo inválida').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Props {
  initialData?: PortfolioProject
  onSave: (project: PortfolioProject) => void
  onCancel: () => void
}

export function PortfolioProjectForm({ initialData, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      technologies: initialData?.technologies.join(', ') || '',
      completionDate: initialData?.completionDate || '',
      repositoryUrl: initialData?.repositoryUrl || '',
      demoUrl: initialData?.demoUrl || '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        technologies: initialData.technologies.join(', '),
        completionDate: initialData.completionDate,
        repositoryUrl: initialData.repositoryUrl || '',
        demoUrl: initialData.demoUrl || '',
      })
    }
  }, [initialData, reset])

  const onSubmit = (data: FormData) => {
    const project: PortfolioProject = {
      id: initialData?.id || `port-proj-${Date.now()}`,
      title: data.title,
      description: data.description,
      technologies: data.technologies
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      completionDate: data.completionDate,
    }

    if (data.repositoryUrl) {
      project.repositoryUrl = data.repositoryUrl
    }
    if (data.demoUrl) {
      project.demoUrl = data.demoUrl
    }

    onSave(project)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título del Proyecto</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Ej. Sistema de Inventario"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Breve descripción de los entregables y objetivos"
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="technologies">Tecnologías (separadas por coma)</Label>
        <Input
          id="technologies"
          {...register('technologies')}
          placeholder="React, Next.js, Tailwind CSS"
        />
        {errors.technologies && (
          <p className="text-sm text-red-500">{errors.technologies.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="completionDate">Fecha de Finalización</Label>
        <Input
          id="completionDate"
          type="date"
          {...register('completionDate')}
        />
        {errors.completionDate && (
          <p className="text-sm text-red-500">
            {errors.completionDate.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="repositoryUrl">URL del Repositorio (opcional)</Label>
        <Input
          id="repositoryUrl"
          {...register('repositoryUrl')}
          placeholder="https://github.com/usuario/repo"
        />
        {errors.repositoryUrl && (
          <p className="text-sm text-red-500">{errors.repositoryUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="demoUrl">URL de Demo (opcional)</Label>
        <Input
          id="demoUrl"
          {...register('demoUrl')}
          placeholder="https://midemo.app"
        />
        {errors.demoUrl && (
          <p className="text-sm text-red-500">{errors.demoUrl.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar Proyecto</Button>
      </div>
    </form>
  )
}
