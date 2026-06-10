'use client'

import React, { useState, useEffect } from 'react'

interface Slide {
  src: string
  alt: string
}

interface HeroBgCarouselProps {
  slides: Slide[]
  interval?: number
}

export function HeroBgCarousel({
  slides,
  interval = 5000,
}: HeroBgCarouselProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [slides.length, interval])

  return (
    <>
      {slides.map((slide, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out',
            zIndex: 0,
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
        </div>
      ))}

      {/* Dots indicator at bottom center */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
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
            onClick={() => setCurrent(i)}
            aria-label={`Imagen ${i + 1}`}
            style={{
              width: i === current ? '28px' : '8px',
              height: '8px',
              borderRadius: i === current ? '4px' : '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background:
                i === current
                  ? 'var(--surface)'
                  : 'color-mix(in oklch, var(--surface) 45%, transparent)',
              transition: 'width 0.4s ease, background 0.4s ease',
            }}
          />
        ))}
      </div>
    </>
  )
}
