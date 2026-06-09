import * as React from 'react'

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Tabs logic and styling
    return <div ref={ref} className={className} {...props} />
  },
)
Tabs.displayName = 'Tabs'
