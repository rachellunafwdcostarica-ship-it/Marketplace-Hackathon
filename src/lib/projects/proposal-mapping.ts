import type { CatalogRef } from './schemas'

/**
 * Resuelve los nombres que propone la IA contra el catálogo real
 * (errolpendiente §2): match case-insensitive por nombre, descarta los que no
 * existen y deduplica por id. Así la IA nunca mete categorías/tecnologías
 * inventadas; solo del catálogo (RF-22).
 */
export function resolveCatalog(
  nombres: string[],
  catalog: CatalogRef[],
): CatalogRef[] {
  const porNombre = new Map(
    catalog.map((item) => [item.nombre.trim().toLowerCase(), item]),
  )
  const vistos = new Set<string>()
  const refs: CatalogRef[] = []
  for (const nombre of nombres) {
    const match = porNombre.get(nombre.trim().toLowerCase())
    if (match && !vistos.has(match.id)) {
      vistos.add(match.id)
      refs.push({ id: match.id, nombre: match.nombre })
    }
  }
  return refs
}
