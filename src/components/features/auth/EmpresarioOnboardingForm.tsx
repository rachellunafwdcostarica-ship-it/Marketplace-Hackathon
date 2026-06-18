'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Upload, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveEmpresarioProfile } from '@/lib/auth/actions'

interface EmpresarioOnboardingFormProps {
  userId: string
}

export function EmpresarioOnboardingForm({
  userId,
}: EmpresarioOnboardingFormProps) {
  const tO = useTranslations('Onboarding')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxBirthDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
  }, [])

  const schema = useMemo(
    () =>
      z.object({
        nombre: z.string().min(2, tO('fieldMin2')).max(80),
        primer_apellido: z.string().min(2, tO('fieldMin2')).max(80),
        segundo_apellido: z.string().min(1, tO('fieldRequired')).max(80),
        fecha_nacimiento: z
          .string()
          .min(1, tO('fieldRequired'))
          .regex(/^\d{4}-\d{2}-\d{2}$/, tO('invalidDate'))
          .refine((val) => {
            const birth = new Date(val + 'T00:00:00')
            const now = new Date()
            const age = now.getFullYear() - birth.getFullYear()
            const m = now.getMonth() - birth.getMonth()
            return (
              age > 18 ||
              (age === 18 &&
                (m > 0 || (m === 0 && now.getDate() >= birth.getDate())))
            )
          }, tO('mustBe18')),
        nombre_empresa: z.string().min(2, tO('fieldMin2')).max(150),
        tipo_empresario: z.enum(['empresa_formal', 'emprendedor'], {
          errorMap: () => ({ message: tO('fieldRequired') }),
        }),
        pais: z.string().min(2, tO('fieldMin2')).max(80),
        ciudad: z.string().min(2, tO('fieldMin2')).max(80),
        alcance_operativo: z.enum(['nacional', 'internacional', 'ambos'], {
          errorMap: () => ({ message: tO('fieldRequired') }),
        }),
        acepta_terminos: z.boolean().refine((v) => v === true, {
          message: tO('terminosRequired'),
        }),
      }),
    [tO],
  )

  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acepta_terminos: false },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValidType = ['image/jpeg', 'image/png'].includes(file.type)
    const isValidSize = file.size <= 5 * 1024 * 1024

    if (!isValidType || !isValidSize) {
      toast.error(tO('fotoError'))
      return
    }

    setFotoPreview(URL.createObjectURL(file))
    setPhotoUploading(true)

    const supabase = createSupabaseBrowserClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('fotos-perfil')
      .upload(path, file, { upsert: true })

    if (error) {
      toast.error(tO('fotoError'))
      setPhotoUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('fotos-perfil').getPublicUrl(path)

    setFotoUrl(publicUrl)
    setPhotoUploading(false)
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    const result = await saveEmpresarioProfile({
      nombre: data.nombre,
      primer_apellido: data.primer_apellido,
      segundo_apellido: data.segundo_apellido,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_perfil_url: fotoUrl,
      nombre_empresa: data.nombre_empresa,
      tipo_empresario: data.tipo_empresario,
      pais: data.pais,
      ciudad: data.ciudad,
      alcance_operativo: data.alcance_operativo,
    })
    setLoading(false)

    if (result.ok) {
      toast.success(tO('profileSaved'))
      router.push('/pending-approval')
      return
    }

    toast.error(tO('profileSaveError'))
  }

  const inputClass =
    'w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)]'
  const selectClass =
    'w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer'
  const labelClass = 'block text-xs font-semibold text-ink-muted mb-1.5'
  const errorClass = 'text-xs font-semibold text-destructive mt-1'

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4">
      <div className="space-y-2 text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-subtle">
          {tO('sectionPersonal')}
        </p>
        <h1 className="text-2xl font-bold font-heading text-ink-strong">
          {tO('empresarioTitle')}
          <span className="text-primary">.</span>
        </h1>
        <p className="text-sm text-ink-muted">{tO('empresarioSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        {/* ── Datos personales ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-subtle border-b border-border pb-2">
            {tO('sectionPersonal')}
          </h2>

          {/* Foto de perfil */}
          <div>
            <span className={labelClass}>{tO('labelFotoPerfil')}</span>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                {fotoPreview ? (
                  <img
                    src={fotoPreview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-ink-subtle" />
                )}
              </div>
              <div className="space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="rounded-lg h-8 text-xs font-semibold"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {photoUploading ? tO('fotoUploading') : tO('fotoUpload')}
                </Button>
                <p className="text-[11px] text-ink-subtle">{tO('fotoHint')}</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nombre y apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{tO('labelNombre')}</label>
              <input
                {...register('nombre')}
                type="text"
                autoComplete="given-name"
                className={inputClass}
              />
              {errors.nombre && (
                <p className={errorClass}>{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>{tO('labelPrimerApellido')}</label>
              <input
                {...register('primer_apellido')}
                type="text"
                autoComplete="family-name"
                className={inputClass}
              />
              {errors.primer_apellido && (
                <p className={errorClass}>{errors.primer_apellido.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>{tO('labelSegundoApellido')}</label>
              <input
                {...register('segundo_apellido')}
                type="text"
                className={inputClass}
              />
              {errors.segundo_apellido && (
                <p className={errorClass}>{errors.segundo_apellido.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>{tO('labelFechaNacimiento')}</label>
              <input
                {...register('fecha_nacimiento')}
                type="date"
                max={maxBirthDate}
                className={inputClass}
              />
              {errors.fecha_nacimiento && (
                <p className={errorClass}>{errors.fecha_nacimiento.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Datos de la empresa ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-subtle border-b border-border pb-2">
            {tO('sectionEmpresa')}
          </h2>

          <div>
            <label className={labelClass}>{tO('labelNombreEmpresa')}</label>
            <input
              {...register('nombre_empresa')}
              type="text"
              className={inputClass}
            />
            {errors.nombre_empresa && (
              <p className={errorClass}>{errors.nombre_empresa.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>{tO('labelTipoEmpresario')}</label>
            <select {...register('tipo_empresario')} className={selectClass}>
              <option value="">{tO('tipoSelectPlaceholder')}</option>
              <option value="emprendedor">{tO('tipoEmprendedor')}</option>
              <option value="empresa_formal">{tO('tipoEmpresaFormal')}</option>
            </select>
            {errors.tipo_empresario && (
              <p className={errorClass}>{errors.tipo_empresario.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{tO('labelPais')}</label>
              <input
                {...register('pais')}
                type="text"
                autoComplete="country-name"
                className={inputClass}
              />
              {errors.pais && (
                <p className={errorClass}>{errors.pais.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>{tO('labelCiudad')}</label>
              <input
                {...register('ciudad')}
                type="text"
                autoComplete="address-level2"
                className={inputClass}
              />
              {errors.ciudad && (
                <p className={errorClass}>{errors.ciudad.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>{tO('labelAlcance')}</label>
            <select {...register('alcance_operativo')} className={selectClass}>
              <option value="">{tO('tipoSelectPlaceholder')}</option>
              <option value="nacional">{tO('alcanceNacional')}</option>
              <option value="internacional">
                {tO('alcanceInternacional')}
              </option>
              <option value="ambos">{tO('alcanceAmbos')}</option>
            </select>
            {errors.alcance_operativo && (
              <p className={errorClass}>{errors.alcance_operativo.message}</p>
            )}
          </div>
        </section>

        {/* ── Términos y condiciones ── */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
          <input
            type="checkbox"
            {...register('acepta_terminos')}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-xs text-muted-foreground">
            {tO('terminosLabel')}
          </span>
        </label>
        {errors.acepta_terminos && (
          <p className={errorClass}>{errors.acepta_terminos.message}</p>
        )}

        <Button
          type="submit"
          disabled={loading || photoUploading}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] cursor-pointer"
        >
          {loading ? tO('saving') : tO('saveProfile')}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}
