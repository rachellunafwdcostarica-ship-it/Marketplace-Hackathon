import { NextResponse } from 'next/server'
import { getSubdivisions } from '@/lib/geo/catalog'
import { hasCountryCodeFormat } from '@/lib/geo/catalog-logic'

/** Cache de un día en cliente/CDN; los datos ISO casi no cambian. */
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

/**
 * Subdivisiones ISO 3166-2 de un país, para el combobox dependiente. Datos
 * estáticos públicos: el cliente recibe solo las del país pedido, nunca el
 * dataset completo. Un país válido sin subdivisiones (micro-Estados) devuelve
 * una lista vacía con 200.
 */
export function GET(request: Request): NextResponse {
  const country = new URL(request.url).searchParams.get('country') ?? ''
  if (!hasCountryCodeFormat(country)) {
    return NextResponse.json({ subdivisions: [] }, { status: 400 })
  }
  return NextResponse.json(
    { subdivisions: getSubdivisions(country) },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  )
}
