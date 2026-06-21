import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSidebarHidden,
  getSidebarHiddenServerSnapshot,
  subscribeToSidebarVisibility,
  toggleSidebarHidden,
} from './sidebar-visibility-store'

function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null =>
      Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: createLocalStorageMock(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sidebar-visibility-store', () => {
  it('arranca visible cuando no hay nada persistido', () => {
    expect(getSidebarHidden()).toBe(false)
  })

  it('toggle oculta y persiste la preferencia', () => {
    toggleSidebarHidden()
    expect(getSidebarHidden()).toBe(true)
  })

  it('toggle dos veces vuelve a visible', () => {
    toggleSidebarHidden()
    toggleSidebarHidden()
    expect(getSidebarHidden()).toBe(false)
  })

  it('notifica a los suscriptores en cada toggle', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToSidebarVisibility(listener)

    toggleSidebarHidden()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    toggleSidebarHidden()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('el snapshot de servidor siempre es visible', () => {
    expect(getSidebarHiddenServerSnapshot()).toBe(false)
  })
})
