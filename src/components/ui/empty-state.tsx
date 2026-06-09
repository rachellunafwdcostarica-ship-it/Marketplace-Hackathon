import * as React from 'react'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, message, ...props }, ref) => {
    // TODO: Implement EmptyState logic and styling
    return (
      <div ref={ref} className={className} {...props}>
        <p>{message || 'No data available'}</p>
      </div>
    )
  },
)
EmptyState.displayName = 'EmptyState'
