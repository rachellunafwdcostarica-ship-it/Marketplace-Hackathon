import React from 'react'
import { Button } from '@/components/ui/button'

interface OAuthButtonsProps {
  onGoogleClick: () => void
  onGitHubClick: () => void
  disabled?: boolean
  googleText: string
  githubText: string
}

export function OAuthButtons({
  onGoogleClick,
  onGitHubClick,
  disabled,
  googleText,
  githubText,
}: OAuthButtonsProps) {
  return (
    <div className="space-y-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={onGoogleClick}
        disabled={disabled}
        className="w-full h-12 rounded-full border border-border-strong hover:bg-surface-sunken bg-surface font-semibold text-ink text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.052 14.958 0 12 0 7.354 0 3.307 2.67 1.341 6.576l3.925 3.189z"
          />
          <path
            fill="#4285F4"
            d="M16.04 15.345c-1.077.733-2.502 1.107-4.04 1.107-2.927 0-5.414-1.986-6.3-4.664L1.75 14.94A11.94 11.94 0 0 0 12 24c3.24 0 6.19-1.08 8.4-2.91l-4.36-3.745z"
          />
          <path
            fill="#FBBC05"
            d="M5.7 11.788a7.07 7.07 0 0 1 0-2.024L1.775 6.576a11.942 11.942 0 0 0 0 10.848l3.926-3.636z"
          />
          <path
            fill="#34A853"
            d="M23.49 12.275c0-.825-.075-1.62-.215-2.385H12v4.56h6.48A5.54 5.54 0 0 1 16.04 18l4.36 3.745c2.55-2.35 4.09-5.81 4.09-9.47z"
          />
        </svg>
        <span>{googleText}</span>
      </Button>

      <Button
        type="button"
        onClick={onGitHubClick}
        disabled={disabled}
        className="w-full h-12 rounded-full bg-ink-strong hover:bg-ink-strong/90 text-surface font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-sm"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"
          />
        </svg>
        <span>{githubText}</span>
      </Button>
    </div>
  )
}
