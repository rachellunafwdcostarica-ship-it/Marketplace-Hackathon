'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAppState } from '@/lib/StateContext'
import {
  createCompanyProfileSchema,
  type CompanyProfileInput,
} from '@/lib/company/schemas'
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
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveCompanyProfile } from '@/lib/company/actions'
import { Upload, ImageIcon, Loader2 } from 'lucide-react'

export function CompanyProfileForm() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  const { currentCompany: company, updateCompany } = useAppState()
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const profileSchema = useMemo(
    () => createCompanyProfileSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    company?.logo || null,
  )
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo supera el límite de 5MB')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Formato no permitido. Use JPEG, PNG o WEBP')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      setValue('logo', 'https://placeholder.url/temp-logo.png')
    }
  }

  const onSubmit = async (data: CompanyProfileInput) => {
    if (!company) return
    setLoading(true)

    try {
      let finalLogoUrl = data.logo

      // 1. Si hay un archivo de logo nuevo seleccionado, procedemos con el flujo de subida
      if (logoFile) {
        setUploadingLogo(true)

        // Primero guardamos/creamos el perfil del empresario para satisfacer la RLS del Storage
        const initialRes = await saveCompanyProfile({
          ...data,
          logo: company.logo || '', // Usamos logo previo o vacío
        })

        if (!initialRes.ok) {
          throw new Error(initialRes.error)
        }

        // Obtener el ID del usuario actual para la ruta de storage
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('No se encontró sesión de usuario válida')
        }

        const fileExt = logoFile.name.split('.').pop()
        const filePath = `${user.id}/logo_${Date.now()}.${fileExt}`

        // Subir archivo al bucket 'logos'
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, {
            upsert: true,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // Obtener la URL pública del logo
        const {
          data: { publicUrl },
        } = supabase.storage.from('logos').getPublicUrl(filePath)

        finalLogoUrl = publicUrl
        data.logo = publicUrl
      }

      // 2. Guardar el perfil completo (ahora sí con la URL final del logo)
      const saveRes = await saveCompanyProfile({
        ...data,
        logo: finalLogoUrl,
      })

      if (!saveRes.ok) {
        throw new Error(saveRes.error)
      }

      // Sincronizar estado global
      updateCompany(company.id, {
        ...data,
        logo: finalLogoUrl,
      })

      toast.success(tEmpresa('profileSaved'))
      router.push('/empresa/perfil')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : tCommon('error')
      toast.error(errorMsg)
    } finally {
      setLoading(false)
      setUploadingLogo(false)
    }
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
            <Label htmlFor="logo" className="text-sm font-bold block text-left">
              {tEmpresa('fieldLogo')}
            </Label>
            <input type="hidden" {...register('logo')} />

            <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-card/40 border border-dashed border-border rounded-xl hover:border-primary/50 transition-colors duration-200">
              <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center shrink-0 border border-border overflow-hidden relative group">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Subir nuevo logo corporativo
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Formatos soportados: JPG, PNG, WEBP. Máximo 5MB.
                </p>
                <label className="inline-block">
                  <span className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 text-[11px] font-bold rounded-lg transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Seleccionar archivo
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

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
