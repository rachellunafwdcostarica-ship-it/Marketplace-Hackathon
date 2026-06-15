import { z } from 'zod'
import { useTranslations } from 'next-intl'

/**
 * Schema del perfil del empresario (SRS RF-16). Cubre datos de la empresa
 * (tabla `empresarios`) y datos personales del empresario (tabla `usuarios`).
 *
 * Los campos personales y los de ubicación/alcance son OPCIONALES en esta capa
 * de datos; la Fase B (formulario) ajusta la obligatoriedad y la validación fina
 * por campo. `contactEmail` (correo de la cuenta) y el estado de verificación son
 * de solo lectura: la BD los congela para el rol `authenticated`.
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

export function createCompanyProfileSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return z.object({
    // Datos personales (tabla usuarios) — editables salvo el correo.
    firstName: z.string().optional(),
    lastName1: z.string().optional(),
    lastName2: z.string().optional(),
    birthDate: z.string().optional(),
    profilePhoto: z.string().optional(),
    // Datos de la empresa (tabla empresarios).
    name: z.string().min(2, { message: t('companyNameMin') }),
    companyType: z.enum(COMPANY_TYPES, {
      message: t('companyTypeRequired'),
    }),
    sector: z.string().min(2, { message: t('sectorRequired') }),
    cedula: z.string().regex(CEDULA_CR_REGEX, { message: t('cedulaInvalid') }),
    description: z.string().min(20, { message: t('companyDescriptionMin') }),
    contactEmail: z.string().email({ message: t('emailInvalid') }),
    website: z.string().regex(HTTP_URL_REGEX, { message: t('urlWebsite') }),
    logo: z
      .string()
      .refine((value) => value === '' || HTTP_URL_REGEX.test(value), {
        message: t('urlLogo'),
      }),
    country: z.string().optional(),
    city: z.string().optional(),
    operatingScope: z.enum(OPERATING_SCOPES).optional(),
  })
}

export const CompanyProfileDbSchema = z.object({
  firstName: z.string().optional(),
  lastName1: z.string().optional(),
  lastName2: z.string().optional(),
  birthDate: z.string().optional(),
  profilePhoto: z.string().optional(),
  name: z.string().min(2),
  companyType: z.enum(COMPANY_TYPES),
  sector: z.string().min(2),
  cedula: z.string().regex(CEDULA_CR_REGEX),
  description: z.string().min(20),
  contactEmail: z.string().email(),
  website: z.string().regex(HTTP_URL_REGEX),
  logo: z
    .string()
    .refine((value) => value === '' || HTTP_URL_REGEX.test(value)),
  country: z.string().optional(),
  city: z.string().optional(),
  operatingScope: z.enum(OPERATING_SCOPES).optional(),
})

export type CompanyProfileInput = z.infer<
  ReturnType<typeof createCompanyProfileSchema>
>

/**
 * Lo que devuelve `getCompanyProfile`: los campos editables más los de solo
 * lectura que gestiona el admin (estado de verificación).
 */
export interface CompanyProfileView extends CompanyProfileInput {
  verificationStatus: VerificationStatus | null
}
