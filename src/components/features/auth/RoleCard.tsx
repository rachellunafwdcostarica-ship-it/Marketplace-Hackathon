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
          ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
          : 'border-border hover:border-border-strong hover:bg-surface-sunken bg-surface'
      }`}
    >
      <div
        className={`p-3 rounded-xl transition-colors ${
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-ink-muted'
        }`}
      >
        {IconComponent && <IconComponent className="w-6 h-6" />}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-bold text-ink-strong text-base">{title}</h3>
        <p className="text-xs text-ink-muted font-medium leading-relaxed">
          {description}
        </p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected
            ? 'border-primary bg-primary'
            : 'border-border-strong bg-surface'
        }`}
      >
        {selected && (
          <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
        )}
      </div>
    </button>
  )
}
