import * as React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Select logic and styling
    return (
      <select ref={ref} className={className} {...props}>
        {props.children}
      </select>
    )
  },
)
Select.displayName = 'Select'
