import { cn } from '@/lib/utils/cn'

interface FwdLogoProps {
  className?: string
}

export function FwdLogo({ className }: FwdLogoProps) {
  return (
    <svg
      className={cn('shrink-0', className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="22"
        y="22"
        width="56"
        height="56"
        rx="8"
        transform="rotate(0 50 50)"
        className="stroke-accent fill-highlight"
        strokeWidth="4.5"
      />
      <rect
        x="22"
        y="22"
        width="56"
        height="56"
        rx="8"
        transform="rotate(45 50 50)"
        className="stroke-accent fill-secondary"
        strokeWidth="4.5"
      />
      <rect
        x="25"
        y="25"
        width="50"
        height="50"
        rx="6"
        transform="rotate(22.5 50 50)"
        className="stroke-magenta fill-primary"
        strokeWidth="3.5"
      />
      <path
        d="M50 28 L54 42 L68 42 L57 50 L61 64 L50 56 L39 64 L43 50 L32 42 L46 42 Z"
        className="fill-magenta"
      />
      <circle cx="50" cy="50" r="4.5" className="fill-highlight" />
    </svg>
  )
}
