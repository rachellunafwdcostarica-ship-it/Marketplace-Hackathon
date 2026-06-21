import 'server-only'
import countriesJson from './data/countries.json'
import subdivisionsJson from './data/subdivisions.json'
import {
  type CountryOption,
  type CountryRecord,
  type Subdivision,
  filterSubdivisionsByCountry,
  findCountryName,
  findSubdivisionName,
  isKnownCountry,
  isSubdivisionOfCountry,
  toCountryOptions,
} from './catalog-logic'

/**
 * Acceso server-only al catálogo geográfico. Los JSON (países ~15 KB,
 * subdivisiones ~257 KB) se importan solo aquí; este módulo nunca debe
 * importarse desde un componente `'use client'`, o el dataset acabaría en el
 * bundle del navegador. El cliente recibe los países vía props del server
 * component y las subdivisiones bajo demanda por el route handler.
 */
const COUNTRIES = countriesJson as CountryRecord[]
const SUBDIVISIONS = subdivisionsJson as Subdivision[]

/** Países resueltos al locale, para el combobox (desde un server component). */
export function getCountryOptions(locale: string): CountryOption[] {
  return toCountryOptions(COUNTRIES, locale)
}

/** Subdivisiones de un país (para el route handler `/api/geo/subdivisions`). */
export function getSubdivisions(countryCode: string): Subdivision[] {
  return filterSubdivisionsByCountry(SUBDIVISIONS, countryCode)
}

/** Validación server-side: ¿el código de país existe en el catálogo? */
export function isValidCountry(code: string): boolean {
  return isKnownCountry(COUNTRIES, code)
}

/** Validación server-side: ¿la subdivisión pertenece realmente al país? */
export function isValidSubdivision(
  subdivisionCode: string,
  countryCode: string,
): boolean {
  return isSubdivisionOfCountry(SUBDIVISIONS, subdivisionCode, countryCode)
}

/** Nombre del país por código ISO, resuelto al locale (display / prompt IA). */
export function getCountryName(code: string, locale: string): string | null {
  return findCountryName(COUNTRIES, code, locale)
}

/** Nombre local de una subdivisión por código ISO (display / prompt IA). */
export function getSubdivisionName(code: string): string | null {
  return findSubdivisionName(SUBDIVISIONS, code)
}
