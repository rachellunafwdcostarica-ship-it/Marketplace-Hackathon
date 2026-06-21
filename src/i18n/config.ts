/**
 * Configuración de i18n liviana (locales + locale por defecto), SIN dependencias
 * de navegación. `routing.ts` la consume para definir el ruteo, pero esta config
 * se puede importar desde código de servidor (server actions, `lib/`) sin
 * arrastrar `next/navigation` — que `createNavigation` necesita y que no se
 * resuelve en entornos de test (vitest corre en Node, sin el resolver de Next).
 */
export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'
