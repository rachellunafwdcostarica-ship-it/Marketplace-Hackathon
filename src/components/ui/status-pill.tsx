import * as React from 'react'

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'active' | 'inactive' | 'pending'
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, status, ...props }, ref) => {
    // TODO: Implement StatusPill logic and styling
    return (
      <span ref={ref} className={className} {...props}>
        {status}
      </span>
    )
  },
)
StatusPill.displayName = 'StatusPill'
