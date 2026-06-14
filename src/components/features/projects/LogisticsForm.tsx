'use client'

import { useFormContext, Controller, useWatch } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiPicker } from './MultiPicker'
import {
  MODALIDADES,
  MONEDAS,
  PLAZO_MAX_DIAS,
  PLAZO_MIN_DIAS,
  type ProjectFormValues,
} from '@/lib/projects/schemas'
import type { ProjectCatalogs } from '@/lib/projects/actions'

interface LogisticsFormProps {
  catalogs: ProjectCatalogs
  disabled: boolean
}

function FieldError({ code }: { code?: string | undefined }) {
  const t = useTranslations('ProjectPublish')
  if (!code) return null
  return (
    <p className="text-xs font-semibold text-destructive">
      {t(`errors.${code}`)}
    </p>
  )
}

/** Campos de logística del proyecto (RF-19..22, modalidad/fechas/presupuesto). */
export function LogisticsForm({ catalogs, disabled }: LogisticsFormProps) {
  const t = useTranslations('ProjectPublish')
  const tCommon = useTranslations('Common')
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProjectFormValues>()

  const modalidad = useWatch({ control, name: 'modalidad' })
  const requiereUbicacion = modalidad !== '' && modalidad !== 'remoto'

  return (
    <section className="space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t('sectionLogistics')}
      </h2>

      <div className="space-y-2">
        <Label htmlFor="titulo" className="text-sm font-bold">
          {t('fieldTitle')}
        </Label>
        <Input
          id="titulo"
          type="text"
          disabled={disabled}
          placeholder={t('fieldTitlePlaceholder')}
          className="bg-card/50 border-border focus-visible:ring-primary"
          {...register('titulo')}
        />
        <FieldError code={errors.titulo?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion" className="text-sm font-bold">
          {t('fieldDescription')}
        </Label>
        <Textarea
          id="descripcion"
          rows={5}
          disabled={disabled}
          placeholder={t('fieldDescriptionPlaceholder')}
          className="bg-card/50 border-border focus-visible:ring-primary"
          {...register('descripcion')}
        />
        <FieldError code={errors.descripcion?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="idAreaNegocio" className="text-sm font-bold">
          {t('fieldArea')}
        </Label>
        <Controller
          name="idAreaNegocio"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="idAreaNegocio"
                className="w-full bg-card/50 border-border focus:ring-primary"
              >
                <SelectValue placeholder={t('fieldAreaPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {catalogs.areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold flex justify-between">
          <span>{t('fieldCategories')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('fieldCategoriesHint')}
          </span>
        </Label>
        <Controller
          name="categorias"
          control={control}
          render={({ field }) => (
            <MultiPicker
              options={catalogs.categorias}
              value={field.value}
              onChange={field.onChange}
              ariaLabel={t('fieldCategories')}
              disabled={disabled}
            />
          )}
        />
        <FieldError code={errors.categorias?.message} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold flex justify-between">
          <span>{t('fieldTechnologies')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('fieldTechnologiesHint')}
          </span>
        </Label>
        <Controller
          name="tecnologias"
          control={control}
          render={({ field }) => (
            <MultiPicker
              options={catalogs.tecnologias}
              value={field.value}
              onChange={field.onChange}
              ariaLabel={t('fieldTechnologies')}
              disabled={disabled}
            />
          )}
        />
        <FieldError code={errors.tecnologias?.message} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="modalidad" className="text-sm font-bold">
            {t('fieldModality')}
          </Label>
          <Controller
            name="modalidad"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="modalidad"
                  className="w-full bg-card/50 border-border focus:ring-primary"
                >
                  <SelectValue placeholder={t('fieldModalityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((modo) => (
                    <SelectItem key={modo} value={modo}>
                      {tCommon(modo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError code={errors.modalidad?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="moneda" className="text-sm font-bold">
            {t('fieldCurrency')}
          </Label>
          <Controller
            name="moneda"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="moneda"
                  className="w-full bg-card/50 border-border focus:ring-primary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((codigo) => (
                    <SelectItem key={codigo} value={codigo}>
                      {codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {requiereUbicacion && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="paisProyecto" className="text-sm font-bold">
              {t('fieldCountry')}
            </Label>
            <Input
              id="paisProyecto"
              type="text"
              disabled={disabled}
              placeholder={t('fieldCountryPlaceholder')}
              className="bg-card/50 border-border focus-visible:ring-primary"
              {...register('paisProyecto')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudadProyecto" className="text-sm font-bold">
              {t('fieldCity')}
            </Label>
            <Input
              id="ciudadProyecto"
              type="text"
              disabled={disabled}
              placeholder={t('fieldCityPlaceholder')}
              className="bg-card/50 border-border focus-visible:ring-primary"
              {...register('ciudadProyecto')}
            />
            <FieldError code={errors.ciudadProyecto?.message} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="presupuestoMin" className="text-sm font-bold">
            {t('fieldBudgetMin')}
          </Label>
          <Input
            id="presupuestoMin"
            type="number"
            min={0}
            disabled={disabled}
            placeholder={t('fieldBudgetPlaceholder')}
            className="bg-card/50 border-border focus-visible:ring-primary"
            {...register('presupuestoMin')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="presupuestoMax" className="text-sm font-bold">
            {t('fieldBudgetMax')}
          </Label>
          <Input
            id="presupuestoMax"
            type="number"
            min={0}
            disabled={disabled}
            placeholder={t('fieldBudgetPlaceholder')}
            className="bg-card/50 border-border focus-visible:ring-primary"
            {...register('presupuestoMax')}
          />
          <FieldError code={errors.presupuestoMax?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fechaPublicacion" className="text-sm font-bold">
            {t('fieldPublishDate')}
          </Label>
          <Input
            id="fechaPublicacion"
            type="date"
            disabled={disabled}
            className="bg-card/50 border-border focus-visible:ring-primary"
            {...register('fechaPublicacion')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaCierre" className="text-sm font-bold">
            {t('fieldCloseDate')}
          </Label>
          <Input
            id="fechaCierre"
            type="date"
            disabled={disabled}
            className="bg-card/50 border-border focus-visible:ring-primary"
            {...register('fechaCierre')}
          />
          <FieldError code={errors.fechaCierre?.message} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('plazoHint', { min: PLAZO_MIN_DIAS, max: PLAZO_MAX_DIAS })}
      </p>
    </section>
  )
}
