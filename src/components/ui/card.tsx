import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Card logic and styling
    return <div ref={ref} className={className} {...props} />
  },
)
Card.displayName = 'Card'
