import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    // TODO: Implement Button logic and styling
    return (
      <button ref={ref} className={className} {...props}>
        {props.children}
      </button>
    )
  },
)
Button.displayName = 'Button'
