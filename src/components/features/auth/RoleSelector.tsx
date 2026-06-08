'use client'

import React from 'react'
import { GraduationCap, Building2, ShieldCheck } from 'lucide-react'
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
  {
    value: 'admin',
    label: 'Admin',
    description: 'Gestiono la plataforma',
    icon: ShieldCheck,
  },
]

export function RoleSelector({ selected, onChange, label }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
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
                    ? 'border-[#0A6CB9] bg-[#0A6CB9]/5 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80 bg-white'
                }
              `}
              aria-pressed={isSelected}
            >
              {/* Selected indicator dot */}
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0A6CB9]" />
              )}
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-[#0A6CB9] text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-bold leading-none ${
                  isSelected ? 'text-[#0A6CB9]' : 'text-gray-600'
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
