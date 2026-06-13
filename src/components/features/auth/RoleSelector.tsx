'use client'

import React from 'react'
import { GraduationCap, Building2 } from 'lucide-react'
import type { UserRole } from '@/types'

interface RoleSelectorProps {
  selected: UserRole
  onChange: (role: UserRole) => void
  label?: string
}

const ROLES: {
  value: UserRole
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: 'junior',
    label: 'Junior',
    description: 'Busco proyectos',
    icon: GraduationCap,
  },
  {
    value: 'empresa',
    label: 'Empresa',
    description: 'Publico proyectos',
    icon: Building2,
  },
]

export function RoleSelector({ selected, onChange, label }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-bold text-ink uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((role) => {
          const Icon = role.icon
          const isSelected = selected === role.value
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value)}
              className={`
                relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 focus:outline-none cursor-pointer
                ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-border-strong hover:bg-surface-sunken/80 bg-surface'
                }
              `}
              aria-pressed={isSelected}
            >
              {/* Selected indicator dot */}
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-ink-subtle'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-bold leading-none ${
                  isSelected ? 'text-primary' : 'text-ink-muted'
                }`}
              >
                {role.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
