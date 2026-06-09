import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Badge logic and styling
    return <span ref={ref} className={className} {...props} />
  },
)
Badge.displayName = 'Badge'
