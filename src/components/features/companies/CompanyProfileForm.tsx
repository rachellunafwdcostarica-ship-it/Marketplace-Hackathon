'use client'

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Save,
  Upload,
  ImageIcon,
  Loader2,
  User,
  Building2,
  BadgeCheck,
} from 'lucide-react'
import { useAppState } from '@/lib/StateContext'
import {
  createCompanyProfileSchema,
  type CompanyProfileInput,
  type CompanyProfileView,
  type VerificationStatus,
} from '@/lib/company/schemas'
import { saveCompanyProfile } from '@/lib/company/actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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
import { cn } from '@/lib/utils/cn'

interface CompanyProfileFormProps {
  initialProfile: CompanyProfileView
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const VERIF_KEY: Record<VerificationStatus, string> = {
  pendiente: 'verifPendiente',
  verificado: 'verifVerificado',
  rechazado: 'verifRechazado',
}
const VERIF_STYLE: Record<VerificationStatus, string> = {
  pendiente: 'bg-warning/10 text-warning border-warning/20',
  verificado: 'bg-accent/10 text-accent border-accent/20',
  rechazado: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function CompanyProfileForm({
  initialProfile,
}: CompanyProfileFormProps) {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  // Sincronización con el mock (StateContext): la Fase C la elimina junto al
  // guard server-side de "perfil completo".
  const { currentCompany: company, updateCompany } = useAppState()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialProfile.profilePhoto || null,
  )
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialProfile.logo || null,
  )
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
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
    defaultValues: {
      firstName: initialProfile.firstName,
      lastName1: initialProfile.lastName1,
      lastName2: initialProfile.lastName2 ?? '',
      birthDate: initialProfile.birthDate ?? '',
      profilePhoto: initialProfile.profilePhoto,
      name: initialProfile.name,
      companyType: initialProfile.companyType,
      sector: initialProfile.sector,
      cedula: initialProfile.cedula,
      description: initialProfile.description,
      contactEmail: initialProfile.contactEmail,
      website: initialProfile.website,
      logo: initialProfile.logo,
      country: initialProfile.country ?? '',
      city: initialProfile.city ?? '',
      ...(initialProfile.operatingScope
        ? { operatingScope: initialProfile.operatingScope }
        : {}),
    },
  })

  const validateImage = (file: File): boolean => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(tEmpresa('fileTooLarge'))
      return false
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(tEmpresa('fileFormatInvalid'))
      return false
    }
    return true
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImage(file)) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImage(file)) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const uploadImage = async (
    bucket: string,
    file: File,
    userId: string,
  ): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${bucket}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })
    if (error) {
      throw new Error(error.message)
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const onSubmit = async (values: CompanyProfileInput) => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error(tCommon('error'))
      }

      // La foto va al bucket fotos-perfil (no exige fila empresario).
      let photoUrl = values.profilePhoto
      if (photoFile) {
        setUploadingPhoto(true)
        photoUrl = await uploadImage('fotos-perfil', photoFile, user.id)
        setUploadingPhoto(false)
      }

      // Guardar primero crea/actualiza la fila empresario → habilita la RLS de
      // logos (que exige que el empresario ya exista).
      const baseProfile: CompanyProfileInput = {
        ...values,
        profilePhoto: photoUrl,
      }
      const firstSave = await saveCompanyProfile(baseProfile)
      if (!firstSave.ok) {
        throw new Error(firstSave.error)
      }

      let logoUrl = values.logo
      if (logoFile) {
        setUploadingLogo(true)
        logoUrl = await uploadImage('logos', logoFile, user.id)
        setUploadingLogo(false)
        const logoSave = await saveCompanyProfile({
          ...baseProfile,
          logo: logoUrl,
        })
        if (!logoSave.ok) {
          throw new Error(logoSave.error)
        }
      }

      if (company) {
        updateCompany(company.id, { ...baseProfile, logo: logoUrl })
      }

      toast.success(tEmpresa('profileSaved'))
      router.push('/empresario/perfil')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setLoading(false)
      setUploadingPhoto(false)
      setUploadingLogo(false)
    }
  }

  const verif = initialProfile.verificationStatus

  return (
    <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative mt-6">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
      <CardContent className="p-6 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Estado de verificación (solo lectura) */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-secondary shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {tEmpresa('verificationLabel')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {tEmpresa('verificationHint')}
                </p>
              </div>
            </div>
            {verif ? (
              <span
                className={cn(
                  'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                  VERIF_STYLE[verif],
                )}
              >
                {tEmpresa(VERIF_KEY[verif])}
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                {tEmpresa('verifNone')}
              </span>
            )}
          </div>

          {/* Sección: datos personales */}
          <section className="space-y-4">
            <SectionHeading
              icon={<User className="w-4 h-4" />}
              title={tEmpresa('sectionPersonalTitle')}
              description={tEmpresa('sectionPersonalDesc')}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field
                id="firstName"
                label={tEmpresa('fieldFirstName')}
                error={errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  type="text"
                  placeholder={tEmpresa('fieldFirstNamePlaceholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('firstName')}
                />
              </Field>
              <Field
                id="lastName1"
                label={tEmpresa('fieldLastName1')}
                error={errors.lastName1?.message}
              >
                <Input
                  id="lastName1"
                  type="text"
                  placeholder={tEmpresa('fieldLastName1Placeholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('lastName1')}
                />
              </Field>
              <Field
                id="lastName2"
                label={tEmpresa('fieldLastName2')}
                optional={tEmpresa('optionalTag')}
                error={errors.lastName2?.message}
              >
                <Input
                  id="lastName2"
                  type="text"
                  placeholder={tEmpresa('fieldLastName2Placeholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('lastName2')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="birthDate"
                label={tEmpresa('fieldBirthDate')}
                optional={tEmpresa('optionalTag')}
                error={errors.birthDate?.message}
              >
                <Input
                  id="birthDate"
                  type="date"
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('birthDate')}
                />
              </Field>
              <ReadonlyField
                label={tEmpresa('emailReadonly')}
                value={initialProfile.contactEmail}
                hint={tEmpresa('emailReadonlyHint')}
              />
            </div>

            <ImageUploadField
              label={tEmpresa('fieldPhoto')}
              title={tEmpresa('uploadPhotoTitle')}
              preview={photoPreview}
              uploading={uploadingPhoto}
              disabled={loading}
              rounded
              onSelect={handlePhotoChange}
            />
          </section>

          {/* Sección: datos de la empresa */}
          <section className="space-y-4 pt-2 border-t border-border/40">
            <SectionHeading
              icon={<Building2 className="w-4 h-4" />}
              title={tEmpresa('sectionCompanyTitle')}
              description={tEmpresa('sectionCompanyDesc')}
            />

            <Field
              id="name"
              label={tEmpresa('fieldName')}
              error={errors.name?.message}
            >
              <Input
                id="name"
                type="text"
                placeholder={tEmpresa('fieldNamePlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-primary"
                {...register('name')}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="companyType"
                label={tEmpresa('fieldType')}
                error={errors.companyType?.message}
              >
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
              </Field>
              <Field
                id="sector"
                label={tEmpresa('fieldSector')}
                error={errors.sector?.message}
              >
                <Input
                  id="sector"
                  type="text"
                  placeholder={tEmpresa('fieldSectorPlaceholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('sector')}
                />
              </Field>
            </div>

            <Field
              id="cedula"
              label={tEmpresa('fieldCedula')}
              error={errors.cedula?.message}
            >
              <Input
                id="cedula"
                type="text"
                placeholder={tEmpresa('fieldCedulaPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-primary"
                {...register('cedula')}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field
                id="country"
                label={tEmpresa('fieldCountry')}
                optional={tEmpresa('optionalTag')}
                error={errors.country?.message}
              >
                <Input
                  id="country"
                  type="text"
                  placeholder={tEmpresa('fieldCountryPlaceholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('country')}
                />
              </Field>
              <Field
                id="city"
                label={tEmpresa('fieldCity')}
                optional={tEmpresa('optionalTag')}
                error={errors.city?.message}
              >
                <Input
                  id="city"
                  type="text"
                  placeholder={tEmpresa('fieldCityPlaceholder')}
                  className="bg-card/50 border-border focus-visible:ring-primary"
                  {...register('city')}
                />
              </Field>
              <Field
                id="operatingScope"
                label={tEmpresa('fieldScope')}
                optional={tEmpresa('optionalTag')}
                error={errors.operatingScope?.message}
              >
                <Controller
                  name="operatingScope"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full bg-card/50 border-border focus:ring-primary">
                        <SelectValue
                          placeholder={tEmpresa('selectScopePlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">
                          {tEmpresa('scopeNacional')}
                        </SelectItem>
                        <SelectItem value="internacional">
                          {tEmpresa('scopeInternacional')}
                        </SelectItem>
                        <SelectItem value="ambos">
                          {tEmpresa('scopeAmbos')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field
              id="website"
              label={tEmpresa('fieldWebsite')}
              optional={tEmpresa('optionalTag')}
              error={errors.website?.message}
            >
              <Input
                id="website"
                type="url"
                placeholder={tEmpresa('fieldWebsitePlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-primary"
                {...register('website')}
              />
            </Field>

            <Field
              id="description"
              label={tEmpresa('fieldDescription')}
              optional={tEmpresa('optionalTag')}
              hint={tCommon('minCharsLabel', { n: 20 })}
              error={errors.description?.message}
            >
              <Textarea
                id="description"
                rows={4}
                placeholder={tEmpresa('fieldDescriptionPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-primary"
                {...register('description')}
              />
            </Field>

            <input type="hidden" {...register('logo')} />
            <ImageUploadField
              label={tEmpresa('fieldLogoUpload')}
              title={tEmpresa('uploadLogoTitle')}
              preview={logoPreview}
              uploading={uploadingLogo}
              disabled={loading}
              onSelect={handleLogoChange}
            />
            {errors.logo?.message && (
              <p className="text-xs font-semibold text-destructive">
                {errors.logo.message}
              </p>
            )}
          </section>

          {/* El correo viaja oculto (no editable); la BD lo congela igual. */}
          <input type="hidden" {...register('contactEmail')} />
          <input type="hidden" {...register('profilePhoto')} />

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

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: string | undefined
  hint?: string | undefined
  error?: string | undefined
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-bold flex justify-between items-center gap-2"
      >
        <span>
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({optional})
            </span>
          )}
        </span>
        {hint && (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  )
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold block">{label}</Label>
      <Input
        type="text"
        value={value}
        readOnly
        disabled
        className="bg-muted/40 border-border text-muted-foreground"
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function ImageUploadField({
  label,
  title,
  preview,
  uploading,
  disabled,
  rounded,
  onSelect,
}: {
  label: string
  title: string
  preview: string | null
  uploading: boolean
  disabled: boolean
  rounded?: boolean
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const tEmpresa = useTranslations('Empresa')
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold block text-left">{label}</Label>
      <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-card/40 border border-dashed border-border rounded-xl hover:border-primary/50 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]">
        <div
          className={cn(
            'w-20 h-20 bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden relative',
            rounded ? 'rounded-full' : 'rounded-xl',
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">
            {tEmpresa('uploadFormats')}
          </p>
          <label className="inline-block">
            <span className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 text-[11px] font-bold rounded-lg transition-all">
              <Upload className="w-3.5 h-3.5" />
              {tEmpresa('selectFile')}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={disabled}
              onChange={onSelect}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
