'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterX } from 'lucide-react'

interface ProjectFiltersProps {
  selectedStack: string
  setSelectedStack: (val: string) => void
  selectedMode: string
  setSelectedMode: (val: string) => void
  selectedDuration: string
  setSelectedDuration: (val: string) => void
  selectedBudget: string
  setSelectedBudget: (val: string) => void
  availableStacks: string[]
  onClear: () => void
}

export function ProjectFilters({
  selectedStack,
  setSelectedStack,
  selectedMode,
  setSelectedMode,
  selectedDuration,
  setSelectedDuration,
  selectedBudget,
  setSelectedBudget,
  availableStacks,
  onClear,
}: ProjectFiltersProps) {
  const tCommon = useTranslations('Common')
  const tJunior = useTranslations('Junior')

  const showClearBtn =
    selectedStack || selectedMode || selectedDuration || selectedBudget

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-xl bg-card/40 backdrop-blur-sm shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tJunior('selectStack')}
          </label>
          <Select
            value={selectedStack || 'all'}
            onValueChange={(val) =>
              setSelectedStack(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tJunior('selectStack')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              {availableStacks.map((stack) => (
                <SelectItem key={stack} value={stack}>
                  {stack}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tJunior('selectMode')}
          </label>
          <Select
            value={selectedMode || 'all'}
            onValueChange={(val) =>
              setSelectedMode(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tJunior('selectMode')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="remoto">{tCommon('remoto')}</SelectItem>
              <SelectItem value="hibrido">{tCommon('hibrido')}</SelectItem>
              <SelectItem value="presencial">
                {tCommon('presencial')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tJunior('selectDuration')}
          </label>
          <Select
            value={selectedDuration || 'all'}
            onValueChange={(val) =>
              setSelectedDuration(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tJunior('selectDuration')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="short">1 - 2 {tCommon('weeks')}</SelectItem>
              <SelectItem value="medium">3 - 4 {tCommon('weeks')}</SelectItem>
              <SelectItem value="long">1+ {tCommon('months')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tJunior('selectBudget')}
          </label>
          <Select
            value={selectedBudget || 'all'}
            onValueChange={(val) =>
              setSelectedBudget(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tJunior('selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="low">&lt; 500 USD</SelectItem>
              <SelectItem value="mid">500 - 800 USD</SelectItem>
              <SelectItem value="high">800+ USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showClearBtn && (
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive flex items-center gap-1.5"
          >
            <FilterX className="w-4 h-4" />
            {tCommon('clearFilters')}
          </Button>
        </div>
      )}
    </div>
  )
}
