import { LOCALES } from '@/i18n/config'

/**
 * Quita un prefijo de locale conocido (`/es`, `/en`) del inicio de una ruta
 * interna. El router locale-aware de next-intl (`localePrefix: 'always'`)
 * antepone el locale activo a la ruta que recibe; si esa ruta ya trae un
 * prefijo de locale (porque el productor lo guardó hardcodeado en
 * `url_destino`), el resultado queda duplicado (`/en/es/...`) y rompe en 404.
 * Normalizar aquí cubre de un solo punto a todos los productores y a las
 * notificaciones ya guardadas, sin tocar la base de datos.
 *
 * Reusa `LOCALES` (no hardcodea los idiomas) y preserva el query string.
 * Es no-op para rutas que ya vienen sin prefijo (`/egresado/...`, `/admin/...`).
 */
export function stripLocalePrefix(path: string): string {
  for (const locale of LOCALES) {
    if (path === `/${locale}`) return '/'
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1)
  }
  return path
}
