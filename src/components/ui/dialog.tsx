import * as React from 'react'

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, open, ...props }, ref) => {
    // TODO: Implement Dialog logic and styling
    if (!open) return null
    return <div ref={ref} className={className} {...props} />
  },
)
Dialog.displayName = 'Dialog'
