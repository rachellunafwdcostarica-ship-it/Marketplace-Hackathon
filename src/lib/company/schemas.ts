import { z } from 'zod'
import { useTranslations } from 'next-intl'

/**
 * Schema del perfil del empresario (SRS RF-16). Cubre datos de la empresa
 * (tabla `empresarios`) y datos personales del empresario (tabla `usuarios`).
 *
 * Obligatorios: nombre y primer apellido (NOT NULL en usuarios), nombre de
 * empresa, tipo, sector y cédula. El resto es opcional, alineado a que esas
 * columnas son nullable en la BD. `contactEmail` (correo de la cuenta) y el
 * estado de verificación son de solo lectura: la BD los congela para el rol
 * `authenticated`.
 *
 * Patrón de cédula: jurídica CR (3-101-234567) o física (1-1450-0678).
 */
const CEDULA_CR_REGEX = /^\d-\d{3,4}-\d{4,6}$/
const HTTP_URL_REGEX = /^https?:\/\/.+/
const COMPANY_TYPES = ['formal', 'emprendedor'] as const
const OPERATING_SCOPES = ['nacional', 'internacional', 'ambos'] as const

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
  return z.object({
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
    cedula: z.string().regex(CEDULA_CR_REGEX, { message: t('cedulaInvalid') }),
    description: optionalDescription(t('companyDescriptionMin')),
    contactEmail: z.string().email({ message: t('emailInvalid') }),
    website: optionalUrl(t('urlWebsite')),
    logo: optionalUrl(t('urlLogo')),
    country: z.string().optional(),
    city: z.string().optional(),
    operatingScope: z.enum(OPERATING_SCOPES).optional(),
  })
}

export const CompanyProfileDbSchema = z.object({
  firstName: z.string().min(2),
  lastName1: z.string().min(2),
  lastName2: z.string().optional(),
  birthDate: z.string().optional(),
  profilePhoto: optionalUrl(),
  name: z.string().min(2),
  companyType: z.enum(COMPANY_TYPES),
  sector: z.string().min(2),
  cedula: z.string().regex(CEDULA_CR_REGEX),
  description: optionalDescription(),
  contactEmail: z.string().email(),
  website: optionalUrl(),
  logo: optionalUrl(),
  country: z.string().optional(),
  city: z.string().optional(),
  operatingScope: z.enum(OPERATING_SCOPES).optional(),
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
