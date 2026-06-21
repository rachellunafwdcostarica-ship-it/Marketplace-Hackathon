'use client'

import { useSyncExternalStore } from 'react'
import {
  getSidebarHidden,
  getSidebarHiddenServerSnapshot,
  subscribeToSidebarVisibility,
  toggleSidebarHidden,
} from '@/lib/ui/sidebar-visibility-store'

interface SidebarVisibility {
  isHidden: boolean
  toggle: () => void
}

/**
 * Lee y alterna la preferencia de visibilidad del sidebar, sincronizada con
 * localStorage. Al estar respaldada por un store externo, todos los
 * consumidores reaccionan al toggle aunque estén en árboles distintos.
 */
export function useSidebarHidden(): SidebarVisibility {
  const isHidden = useSyncExternalStore(
    subscribeToSidebarVisibility,
    getSidebarHidden,
    getSidebarHiddenServerSnapshot,
  )

  return { isHidden, toggle: toggleSidebarHidden }
}
