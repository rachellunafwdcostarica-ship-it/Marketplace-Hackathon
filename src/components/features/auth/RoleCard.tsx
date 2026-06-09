import React from 'react'
import * as LucideIcons from 'lucide-react'

interface RoleCardProps {
  title: string
  description: string
  iconName: keyof typeof LucideIcons
  selected: boolean
  onClick: () => void
}

export function RoleCard({
  title,
  description,
  iconName,
  selected,
  onClick,
}: RoleCardProps) {
  const IconComponent = LucideIcons[iconName] as React.ComponentType<{
    className?: string
  }>

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-start gap-4 focus:outline-none cursor-pointer ${
        selected
          ? 'border-[#0A6CB9] bg-[#0A6CB9]/5 shadow-md scale-[1.01]'
          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 bg-white'
      }`}
    >
      <div
        className={`p-3 rounded-xl transition-colors ${
          selected ? 'bg-[#0A6CB9] text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {IconComponent && <IconComponent className="w-6 h-6" />}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          {description}
        </p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? 'border-[#0A6CB9] bg-[#0A6CB9]'
            : 'border-gray-300 bg-white'
        }`}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
      </div>
    </button>
  )
}
