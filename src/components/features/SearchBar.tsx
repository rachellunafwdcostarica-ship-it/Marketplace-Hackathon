'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps) {
  const t = useTranslations('Common')

  return (
    <div className={`relative flex items-center ${className ?? ''}`}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('search') + '...'}
        className="pl-9 pr-4 h-10 w-full bg-card/60 backdrop-blur-sm border-border hover:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
      />
    </div>
  )
}
