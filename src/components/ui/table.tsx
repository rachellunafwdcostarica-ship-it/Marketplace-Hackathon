import * as React from 'react'

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Table logic and styling
    return <table ref={ref} className={className} {...props} />
  },
)
Table.displayName = 'Table'
