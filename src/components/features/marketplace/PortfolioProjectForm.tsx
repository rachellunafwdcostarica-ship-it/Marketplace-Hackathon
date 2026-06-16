'use client'

import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { PortfolioProject } from '@/types'
import { useTranslations } from 'next-intl'

interface Props {
  initialData?: PortfolioProject
  onSave: (project: PortfolioProject) => void
  onCancel: () => void
}

export function PortfolioProjectForm({ initialData, onSave, onCancel }: Props) {
  const t = useTranslations('Portfolio')

  const schema = useMemo(() => {
    return z.object({
      title: z.string().min(3, t('errorTitleReq')),
      description: z.string().min(10, t('errorDescReq')),
      technologies: z.string().min(1, t('errorTechReq')),
      completionDate: z.string().min(1, t('errorDateReq')),
      repositoryUrl: z
        .string()
        .url(t('errorRepoInvalid'))
        .optional()
        .or(z.literal('')),
      demoUrl: z
        .string()
        .url(t('errorDemoInvalid'))
        .optional()
        .or(z.literal('')),
      visibility: z.enum(['publico', 'empresas']).default('publico'),
    })
  }, [t])

  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      technologies: initialData?.technologies?.join(', ') || '',
      completionDate: initialData?.completionDate || '',
      repositoryUrl: initialData?.repositoryUrl || '',
      demoUrl: initialData?.demoUrl || '',
      visibility: 'publico',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        technologies: initialData?.technologies?.join(', ') ?? '',
        completionDate: initialData.completionDate,
        repositoryUrl: initialData.repositoryUrl || '',
        demoUrl: initialData.demoUrl || '',
        visibility: 'publico',
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
        .map((tech) => tech.trim())
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
        <Label htmlFor="title">{t('formTitleLabel')}</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder={t('formTitlePlaceholder')}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{String(errors.title.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('formDescriptionLabel')}</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder={t('formDescriptionPlaceholder')}
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500">
            {String(errors.description.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="technologies">{t('formTechLabel')}</Label>
        <Input
          id="technologies"
          {...register('technologies')}
          placeholder={t('formTechPlaceholder')}
        />
        {errors.technologies && (
          <p className="text-sm text-red-500">
            {String(errors.technologies.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="completionDate">{t('formDateLabel')}</Label>
        <Input
          id="completionDate"
          type="date"
          {...register('completionDate')}
        />
        {errors.completionDate && (
          <p className="text-sm text-red-500">
            {String(errors.completionDate.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">{t('formVisibilityLabel')}</Label>
        <Select
          onValueChange={(val: 'publico' | 'empresas') =>
            setValue('visibility', val)
          }
          value={watch('visibility')}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('formVisibilityPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publico">{t('visibilityPublic')}</SelectItem>
            <SelectItem value="empresas">{t('visibilityCompanies')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repositoryUrl">{t('formRepoLabel')}</Label>
        <Input
          id="repositoryUrl"
          {...register('repositoryUrl')}
          placeholder={t('formRepoPlaceholder')}
        />
        {errors.repositoryUrl && (
          <p className="text-sm text-red-500">
            {String(errors.repositoryUrl.message)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="demoUrl">{t('formDemoLabel')}</Label>
        <Input
          id="demoUrl"
          {...register('demoUrl')}
          placeholder={t('formDemoPlaceholder')}
        />
        {errors.demoUrl && (
          <p className="text-sm text-red-500">
            {String(errors.demoUrl.message)}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  )
}
