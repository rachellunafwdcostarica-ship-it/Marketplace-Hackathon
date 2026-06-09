import * as React from 'react'

export interface ModalityChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  modality?: 'remote' | 'hybrid' | 'onsite'
}

export const ModalityChip = React.forwardRef<
  HTMLSpanElement,
  ModalityChipProps
>(({ className, modality, ...props }, ref) => {
  // TODO: Implement ModalityChip logic and styling
  return (
    <span ref={ref} className={className} {...props}>
      {modality}
    </span>
  )
})
ModalityChip.displayName = 'ModalityChip'
