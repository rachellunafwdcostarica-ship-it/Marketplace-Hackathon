import React from 'react'

interface AuthHeaderProps {
  welcomeText?: string
  title: string
  subtitle: string
}

export function AuthHeader({ welcomeText, title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center space-y-4 mb-8">
      {welcomeText && (
        <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] text-[#9A9A9A] uppercase block">
          {welcomeText}
        </span>
      )}
      <h1 className="text-4xl md:text-5xl font-bold font-heading text-black tracking-tight leading-none">
        {title}
        <span className="text-[#0A6CB9]">.</span>
      </h1>
      <p className="text-sm md:text-base text-gray-500 font-medium">
        {subtitle}
      </p>
    </div>
  )
}
