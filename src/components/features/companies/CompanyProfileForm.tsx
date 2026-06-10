'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAppState } from '@/lib/StateContext'
import {
  createCompanyProfileSchema,
  type CompanyProfileInput,
} from '@/lib/company/schemas'
import { MOCK_COMPANY_ID } from '@/lib/constants/mockData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CompanyProfileForm() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  const { companies, updateCompany } = useAppState()

  const [loading, setLoading] = useState(false)

  const company = companies.find((c) => c.id === MOCK_COMPANY_ID)

  const profileSchema = useMemo(
    () => createCompanyProfileSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CompanyProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      name: company?.name ?? '',
      companyType: company?.companyType ?? 'formal',
      sector: company?.sector ?? '',
      cedula: company?.cedula ?? '',
      description: company?.description ?? '',
      contactEmail: company?.contactEmail ?? '',
      website: company?.website ?? '',
      logo: company?.logo ?? '',
    },
  })

  const onSubmit = (data: CompanyProfileInput) => {
    if (!company) return
    setLoading(true)

    setTimeout(() => {
      updateCompany(company.id, data)
      setLoading(false)
      toast.success(tEmpresa('profileSaved'))
    }, 900)
  }

  if (!company) {
    return (
      <Card className="border border-border/80 bg-card/65 mt-6">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            {tEmpresa('profileNotFound')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
      <CardContent className="p-6 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold">
              {tEmpresa('fieldName')}
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={tEmpresa('fieldNamePlaceholder')}
              className={`bg-card/50 border-border ${errors.name ? 'border-destructive' : 'focus-visible:ring-primary'}`}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs font-semibold text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyType" className="text-sm font-bold">
                {tEmpresa('fieldType')}
              </Label>
              <Controller
                name="companyType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full bg-card/50 border-border focus:ring-primary">
                      <SelectValue
                        placeholder={tEmpresa('selectTypePlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">
                        {tEmpresa('typeFormal')}
                      </SelectItem>
                      <SelectItem value="emprendedor">
                        {tEmpresa('typeEmprendedor')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.companyType && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.companyType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-sm font-bold">
                {tEmpresa('fieldSector')}
              </Label>
              <Input
                id="sector"
                type="text"
                placeholder={tEmpresa('fieldSectorPlaceholder')}
                className={`bg-card/50 border-border ${errors.sector ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                {...register('sector')}
              />
              {errors.sector && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.sector.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cedula" className="text-sm font-bold">
              {tEmpresa('fieldCedula')}
            </Label>
            <Input
              id="cedula"
              type="text"
              placeholder={tEmpresa('fieldCedulaPlaceholder')}
              className={`bg-card/50 border-border ${errors.cedula ? 'border-destructive' : 'focus-visible:ring-primary'}`}
              {...register('cedula')}
            />
            {errors.cedula && (
              <p className="text-xs font-semibold text-destructive">
                {errors.cedula.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-sm font-bold flex justify-between"
            >
              <span>{tEmpresa('fieldDescription')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {tCommon('minCharsLabel', { n: 20 })}
              </span>
            </Label>
            <Textarea
              id="description"
              rows={4}
              placeholder={tEmpresa('fieldDescriptionPlaceholder')}
              className={`bg-card/50 border-border ${errors.description ? 'border-destructive' : 'focus-visible:ring-primary'}`}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs font-semibold text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-sm font-bold">
                {tEmpresa('fieldContactEmail')}
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder={tEmpresa('fieldContactEmailPlaceholder')}
                className={`bg-card/50 border-border ${errors.contactEmail ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                {...register('contactEmail')}
              />
              {errors.contactEmail && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm font-bold">
                {tEmpresa('fieldWebsite')}
              </Label>
              <Input
                id="website"
                type="url"
                placeholder={tEmpresa('fieldWebsitePlaceholder')}
                className={`bg-card/50 border-border ${errors.website ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                {...register('website')}
              />
              {errors.website && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo" className="text-sm font-bold">
              {tEmpresa('fieldLogo')}
            </Label>
            <Input
              id="logo"
              type="url"
              placeholder={tEmpresa('fieldLogoPlaceholder')}
              className={`bg-card/50 border-border ${errors.logo ? 'border-destructive' : 'focus-visible:ring-primary'}`}
              {...register('logo')}
            />
            {errors.logo && (
              <p className="text-xs font-semibold text-destructive">
                {errors.logo.message}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? tCommon('loading') : tEmpresa('saveProfile')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
