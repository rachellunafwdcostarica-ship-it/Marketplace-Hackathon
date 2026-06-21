/**
 * Lógica pura del catálogo geográfico (ISO 3166-1 países + ISO 3166-2
 * subdivisiones). No accede a datos ni a `server-only`: recibe los arrays como
 * argumento para ser testeable en vitest (Node). El binding con los JSON reales
 * vive en `catalog.ts` (server-only), que nunca llega al bundle del cliente.
 */

/** País del JSON curado: código ISO 3166-1 alpha-2 + nombres es/en. */
export interface CountryRecord {
  code: string
  nameEs: string
  nameEn: string
}

/** País ya resuelto a un locale, listo para poblar el combobox. */
export interface CountryOption {
  code: string
  name: string
}

/** Subdivisión ISO 3166-2: `code` (ej. `CR-SJ`), `name` local, `parent` país. */
export interface Subdivision {
  code: string
  name: string
  parent: string
}

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/
const SUBDIVISION_CODE_PATTERN = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

/** Nombre del país en el locale pedido (español por defecto). */
export function resolveCountryName(
  country: CountryRecord,
  locale: string,
): string {
  return locale === 'en' ? country.nameEn : country.nameEs
}

/** Países resueltos al locale, en el orden del dataset (alfabético en es). */
export function toCountryOptions(
  countries: CountryRecord[],
  locale: string,
): CountryOption[] {
  return countries.map((country) => ({
    code: country.code,
    name: resolveCountryName(country, locale),
  }))
}

/** Subdivisiones cuyo país padre es `countryCode`. */
export function filterSubdivisionsByCountry(
  subdivisions: Subdivision[],
  countryCode: string,
): Subdivision[] {
  return subdivisions.filter(
    (subdivision) => subdivision.parent === countryCode,
  )
}

/** ¿`code` corresponde a un país presente en el catálogo? */
export function isKnownCountry(
  countries: CountryRecord[],
  code: string,
): boolean {
  return countries.some((country) => country.code === code)
}

/**
 * ¿`subdivisionCode` pertenece a `countryCode` según el catálogo? Es la guarda
 * que impide combinaciones imposibles (ej. `CR-SJ` declarado bajo `BR`).
 */
export function isSubdivisionOfCountry(
  subdivisions: Subdivision[],
  subdivisionCode: string,
  countryCode: string,
): boolean {
  return subdivisions.some(
    (subdivision) =>
      subdivision.code === subdivisionCode &&
      subdivision.parent === countryCode,
  )
}

/** ¿`value` tiene forma de código de país ISO 3166-1 (dos mayúsculas)? */
export function hasCountryCodeFormat(value: string): boolean {
  return COUNTRY_CODE_PATTERN.test(value)
}

/** ¿`value` tiene forma de código de subdivisión ISO 3166-2 (`XX-YYY`)? */
export function hasSubdivisionCodeFormat(value: string): boolean {
  return SUBDIVISION_CODE_PATTERN.test(value)
}

/** Nombre del país por código, resuelto al locale; null si no está. */
export function findCountryName(
  countries: CountryRecord[],
  code: string,
  locale: string,
): string | null {
  const country = countries.find((entry) => entry.code === code)
  return country ? resolveCountryName(country, locale) : null
}

/** Nombre local de una subdivisión por código; null si no está. */
export function findSubdivisionName(
  subdivisions: Subdivision[],
  code: string,
): string | null {
  return subdivisions.find((entry) => entry.code === code)?.name ?? null
}
