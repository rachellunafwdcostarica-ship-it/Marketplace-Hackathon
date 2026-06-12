import { z } from 'zod'
import { useTranslations } from 'next-intl'

/**
 * Schema del perfil editable de empresa (SRS RF-16 + Brief §13).
 * Los nombres de campo coinciden con los de la interfaz Company para
 * permitir un merge directo en StateContext.updateCompany.
 *
 * Patrón de cédula: jurídica CR (3-101-234567) o física (1-1450-0678).
 */
const CEDULA_CR_REGEX = /^\d-\d{3,4}-\d{4,6}$/
const HTTP_URL_REGEX = /^https?:\/\/.+/

export function createCompanyProfileSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return z.object({
    name: z.string().min(2, { message: t('companyNameMin') }),
    companyType: z.enum(['formal', 'emprendedor'] as const, {
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
  })
}

export const CompanyProfileDbSchema = z.object({
  name: z.string().min(2),
  companyType: z.enum(['formal', 'emprendedor'] as const),
  sector: z.string().min(2),
  cedula: z.string().regex(CEDULA_CR_REGEX),
  description: z.string().min(20),
  contactEmail: z.string().email(),
  website: z.string().regex(HTTP_URL_REGEX),
  logo: z
    .string()
    .refine((value) => value === '' || HTTP_URL_REGEX.test(value)),
})

export type CompanyProfileInput = z.infer<
  ReturnType<typeof createCompanyProfileSchema>
>
