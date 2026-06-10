import React from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'

interface VerificationMessageProps {
  title: string
  description: string
  success?: boolean
}

export function VerificationMessage({
  title,
  description,
  success = false,
}: VerificationMessageProps) {
  return (
    <div className="text-center space-y-6 py-4 animate-fade-in">
      <div className="flex justify-center">
        {success ? (
          <div className="p-5 rounded-full bg-accent/10 text-accent animate-bounce">
            <CheckCircle2 className="w-16 h-16" />
          </div>
        ) : (
          <div className="p-5 rounded-full bg-primary/10 text-primary relative">
            <Mail className="w-16 h-16" />
            <span className="absolute top-4 right-4 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent"></span>
            </span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-heading text-ink-strong">
          {title}
        </h2>
        <p className="text-sm text-ink-muted font-medium leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>
    </div>
  )
}
