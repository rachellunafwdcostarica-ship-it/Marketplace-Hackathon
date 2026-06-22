import { logger } from '@/lib/logger'

/**
 * Store ligero de cliente para recordar si el usuario ocultó el sidebar.
 * Se respalda en localStorage y se expone vía `useSyncExternalStore` desde el
 * hook `useSidebarHidden`, de modo que cualquier consumidor (header del admin,
 * sidebar del empresario) reaccione al cambio aunque viva en otro subárbol.
 *
 * La preferencia es compartida entre roles a propósito: un usuario es admin o
 * empresario, nunca ambos en vivo, así que una sola clave es suficiente.
 */
const SIDEBAR_HIDDEN_STORAGE_KEY = 'fwd_sidebar_hidden'

/** Presencia del valor = oculto; ausencia = visible. */
const SIDEBAR_HIDDEN_FLAG = '1'

type SidebarVisibilityListener = () => void

const listeners = new Set<SidebarVisibilityListener>()

function notifyListeners(): void {
  listeners.forEach((listener) => listener())
}

/** Sincroniza pestañas: otra pestaña que togglee dispara `storage`. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key === SIDEBAR_HIDDEN_STORAGE_KEY) {
    notifyListeners()
  }
}

export function subscribeToSidebarVisibility(
  listener: SidebarVisibilityListener,
): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent)
  }
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent)
    }
  }
}

export function getSidebarHidden(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return (
      window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) ===
      SIDEBAR_HIDDEN_FLAG
    )
  } catch (error) {
    logger.warn('sidebar-visibility: lectura de localStorage falló', {
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/** Estado en servidor: siempre visible, porque no hay localStorage en SSR. */
export function getSidebarHiddenServerSnapshot(): boolean {
  return false
}

export function toggleSidebarHidden(): void {
  const shouldHide = !getSidebarHidden()

  if (typeof window !== 'undefined') {
    try {
      if (shouldHide) {
        window.localStorage.setItem(
          SIDEBAR_HIDDEN_STORAGE_KEY,
          SIDEBAR_HIDDEN_FLAG,
        )
      } else {
        window.localStorage.removeItem(SIDEBAR_HIDDEN_STORAGE_KEY)
      }
    } catch (error) {
      logger.warn('sidebar-visibility: escritura de localStorage falló', {
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  notifyListeners()
}
