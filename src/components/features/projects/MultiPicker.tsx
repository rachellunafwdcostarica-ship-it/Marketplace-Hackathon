'use client'

import { cn } from '@/lib/utils/cn'

interface MultiPickerOption {
  id: string
  nombre: string
}

interface MultiPickerProps {
  options: MultiPickerOption[]
  value: string[]
  onChange: (next: string[]) => void
  ariaLabel: string
  disabled?: boolean
}

/**
 * Selector múltiple en formato de pills (categorías, tecnologías). Usa
 * primitivos existentes; no agrega dependencias. Accesible por teclado.
 */
export function MultiPicker({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: MultiPickerProps) {
  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => toggle(option.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-semibold',
              'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card/50 text-muted-foreground hover:border-primary/50',
            )}
          >
            {option.nombre}
          </button>
        )
      })}
    </div>
  )
}
