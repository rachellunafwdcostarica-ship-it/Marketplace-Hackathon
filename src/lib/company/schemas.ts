import { z } from 'zod'
import { useTranslations } from 'next-intl'

/**
 * Schema del perfil del empresario (SRS RF-16). Datos de la empresa
 * (tabla `empresarios`) + datos personales del representante (tabla `usuarios`).
 *
 * Obligatorios: nombre y primer apellido (NOT NULL en usuarios), nombre de
 * empresa, tipo, sector, país, alcance y cédula. La cédula es obligatoria para
 * ambos tipos: jurídica/ID fiscal para "empresa formal", de identidad para el
 * "emprendedor individual". SIN formato por país: la plataforma acepta empresas
 * internacionales (EIN, CIF, RFC...), que no usan el formato CR; la legitimidad
 * la valida el admin (`estado_verificacion`). `contactEmail` (correo de la
 * cuenta) y el estado de verificación son de solo lectura: la BD los congela.
 */
const HTTP_URL_REGEX = /^https?:\/\/.+/
const COMPANY_TYPES = ['formal', 'emprendedor'] as const
const OPERATING_SCOPES = ['nacional', 'internacional', 'ambos'] as const
const MIN_TAX_ID_LENGTH = 4

export type CompanyType = (typeof COMPANY_TYPES)[number]
export type OperatingScope = (typeof OPERATING_SCOPES)[number]
export type VerificationStatus = 'pendiente' | 'verificado' | 'rechazado'

/** URL opcional: cadena vacía o URL http(s) válida. */
const optionalUrl = (message?: string) => {
  const test = (value: string) => value === '' || HTTP_URL_REGEX.test(value)
  return message === undefined
    ? z.string().refine(test)
    : z.string().refine(test, { message })
}

/** Descripción opcional: vacía o de al menos 20 caracteres. */
const optionalDescription = (message?: string) => {
  const test = (value: string) => value === '' || value.length >= 20
  return message === undefined
    ? z.string().refine(test)
    : z.string().refine(test, { message })
}

export function createCompanyProfileSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return z
    .object({
      // Datos personales (tabla usuarios) — editables salvo el correo.
      firstName: z.string().min(2, { message: t('firstNameMin') }),
      lastName1: z.string().min(2, { message: t('lastNameMin') }),
      lastName2: z.string().optional(),
      birthDate: z.string().optional(),
      profilePhoto: optionalUrl(t('urlPhoto')),
      // Datos de la empresa (tabla empresarios).
      name: z.string().min(2, { message: t('companyNameMin') }),
      companyType: z.enum(COMPANY_TYPES, {
        message: t('companyTypeRequired'),
      }),
      sector: z.string().min(2, { message: t('sectorRequired') }),
      cedula: z.string().optional(),
      description: optionalDescription(t('companyDescriptionMin')),
      contactEmail: z.string().email({ message: t('emailInvalid') }),
      website: optionalUrl(t('urlWebsite')),
      logo: optionalUrl(t('urlLogo')),
      country: z.string().min(2, { message: t('countryRequired') }),
      city: z.string().optional(),
      operatingScope: z.enum(OPERATING_SCOPES).optional(),
    })
    .superRefine((data, ctx) => {
      // Cédula obligatoria para ambos tipos (jurídica o de identidad).
      if ((data.cedula ?? '').trim().length < MIN_TAX_ID_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          path: ['cedula'],
          message: t('cedulaRequired'),
        })
      }
      if (!data.operatingScope) {
        ctx.addIssue({
          code: 'custom',
          path: ['operatingScope'],
          message: t('scopeRequired'),
        })
      }
    })
}

export const CompanyProfileDbSchema = z
  .object({
    firstName: z.string().min(2),
    lastName1: z.string().min(2),
    lastName2: z.string().optional(),
    birthDate: z.string().optional(),
    profilePhoto: optionalUrl(),
    name: z.string().min(2),
    companyType: z.enum(COMPANY_TYPES),
    sector: z.string().min(2),
    cedula: z.string().optional(),
    description: optionalDescription(),
    contactEmail: z.string().email(),
    website: optionalUrl(),
    logo: optionalUrl(),
    country: z.string().min(2),
    city: z.string().optional(),
    operatingScope: z.enum(OPERATING_SCOPES).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.cedula ?? '').trim().length < MIN_TAX_ID_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['cedula'],
        message: 'cedulaRequired',
      })
    }
    if (!data.operatingScope) {
      ctx.addIssue({
        code: 'custom',
        path: ['operatingScope'],
        message: 'scopeRequired',
      })
    }
  })

export type CompanyProfileInput = z.infer<
  ReturnType<typeof createCompanyProfileSchema>
>

/**
 * Lo que devuelve la lectura del perfil: los campos editables más los de solo
 * lectura que gestiona el admin (estado de verificación).
 */
export interface CompanyProfileView extends CompanyProfileInput {
  verificationStatus: VerificationStatus | null
}
