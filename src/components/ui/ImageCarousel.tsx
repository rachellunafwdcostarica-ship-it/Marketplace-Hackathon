'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselSlide {
  src: string
  alt: string
}

interface ImageCarouselProps {
  slides: CarouselSlide[]
  autoPlayInterval?: number
}

export function ImageCarousel({
  slides,
  autoPlayInterval = 4500,
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback(
    (index: number) => {
      setCurrent((index + slides.length) % slides.length)
    },
    [slides.length],
  )

  const prev = useCallback(() => goTo(current - 1), [current, goTo])
  const next = useCallback(() => goTo(current + 1), [current, goTo])

  useEffect(() => {
    if (isHovered) return
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, autoPlayInterval)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoPlayInterval, slides.length, isHovered])

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '460px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
        backgroundColor: '#f0f0f0',
      }}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.6s ease-in-out',
            zIndex: i === current ? 1 : 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={slide.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
          {/* Bottom vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}

      {/* Left arrow */}
      <button
        onClick={prev}
        aria-label="Anterior"
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          color: '#0a6cb9',
          transition: 'background 0.2s, transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,1)'
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.88)'
          e.currentTarget.style.transform = 'translateY(-50%)'
        }}
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>

      {/* Right arrow */}
      <button
        onClick={next}
        aria-label="Siguiente"
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          color: '#0a6cb9',
          transition: 'background 0.2s, transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,1)'
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.88)'
          e.currentTarget.style.transform = 'translateY(-50%)'
        }}
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </button>

      {/* Dot indicators */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Diapositiva ${i + 1}`}
            aria-current={i === current}
            style={{
              width: i === current ? '24px' : '8px',
              height: '8px',
              borderRadius: i === current ? '4px' : '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: i === current ? '#ffffff' : 'rgba(255,255,255,0.5)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}
