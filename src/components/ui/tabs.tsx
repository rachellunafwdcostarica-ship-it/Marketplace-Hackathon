'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  baseId: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('Los subcomponentes de Tabs deben usarse dentro de <Tabs>')
  }
  return ctx
}

interface TabsProps {
  defaultValue: string
  value?: string | undefined
  onValueChange?: ((value: string) => void) | undefined
  className?: string | undefined
  children: React.ReactNode
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue)
  const baseId = React.useId()
  const current = value ?? internal

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternal(next)
      onValueChange?.(next)
    },
    [value, onValueChange],
  )

  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  label: string
  className?: string | undefined
  children: React.ReactNode
}

export function TabsList({ label, className, children }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-surface-sunken p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  className?: string | undefined
  children: React.ReactNode
}

export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const { value: active, setValue, baseId } = useTabsContext()
  const isActive = active === value

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const list = event.currentTarget.parentElement
    if (!list) return
    const triggers = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    const index = triggers.indexOf(event.currentTarget)
    const dir = event.key === 'ArrowRight' ? 1 : -1
    const next = triggers[(index + dir + triggers.length) % triggers.length]
    if (next) {
      event.preventDefault()
      next.focus()
      next.click()
    }
  }

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setValue(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-surface text-primary shadow-sm'
          : 'text-ink-muted hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  className?: string | undefined
  children: React.ReactNode
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: active, baseId } = useTabsContext()
  if (active !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}
