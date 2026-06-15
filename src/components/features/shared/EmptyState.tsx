import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
  actionText?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl bg-card/50 backdrop-blur-sm animate-fade-in my-6">
      <div className="p-4 bg-muted rounded-full text-muted-foreground/80 mb-4 ring-8 ring-muted/50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          className="bg-primary text-primary-foreground hover:bg-primary/95 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {actionText}
        </Button>
      )}
    </div>
  )
}
