'use client'

import React, { useEffect, useRef } from 'react'

export function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Particle nodes for financial network
    const particleCount = Math.min(Math.floor(width / 35), 45)
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      baseAlpha: number
    }

    const particles: Particle[] = []
    const colors = [
      'rgba(0, 210, 255, ',   // Electric Cyan
      'rgba(0, 114, 255, ',   // Deep Blue
      'rgba(255, 122, 0, ',   // Blazing Orange
      'rgba(245, 158, 11, '   // Gold Amber
    ]

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.4 + 0.2
      })
    }

    // Interactive mouse coordinates
    let mouse = { x: -1000, y: -1000, radius: 140 }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX
        mouse.y = e.touches[0].clientY
      }
    }
    const handleTouchEnd = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.15
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0, 210, 255, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // 2. Connect to mouse
      if (mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < particles.length; i++) {
          const dx = particles[i].x - mouse.x
          const dy = particles[i].y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.3
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255, 122, 0, ${alpha})`
            ctx.lineWidth = 1
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.stroke()
          }
        }
      }

      // 3. Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.x += p.vx
        p.y += p.vy

        // Wrap boundaries smoothly
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color + p.baseAlpha + ')'
        ctx.shadowColor = p.color + '0.6)'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0 // reset shadow for performance
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#050814]">
      {/* ── 1. AMBIENT GLOW ORBS ──────────────────────────────────────── */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-[#00D2FF]/15 via-[#0072FF]/10 to-transparent rounded-full blur-[140px] animate-pulse [animation-duration:8s]" />
      <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-[#FF7A00]/15 via-[#F59E0B]/10 to-transparent rounded-full blur-[160px] animate-pulse [animation-duration:10s]" />
      <div className="absolute -bottom-32 left-1/4 w-[650px] h-[650px] bg-gradient-to-tr from-[#0072FF]/10 via-[#00D2FF]/5 to-transparent rounded-full blur-[160px]" />

      {/* ── 2. FINTECH TERMINAL SVG GRID WITH CROSSHAIR MARKERS ──────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.14]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="fintech-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#00D2FF" strokeWidth="0.6" strokeDasharray="3 3" />
            <path d="M 24 22 L 24 26 M 22 24 L 26 24" fill="none" stroke="#00D2FF" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fintech-grid)" />
      </svg>

      {/* ── 3. FLOATING FINANCIAL MARKET CANDLESTICKS / CHART WAVE ────── */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-72 sm:h-96 opacity-[0.18]"
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0072FF" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#00D2FF" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#FFD700" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#050814" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Filled wave under chart */}
        <path
          d="M0 240 Q 240 180, 480 210 T 960 120 T 1440 90 L 1440 320 L 0 320 Z"
          fill="url(#chartFill)"
        />

        {/* Dynamic Financial Trend Line */}
        <path
          d="M0 240 Q 240 180, 480 210 T 960 120 T 1440 90"
          stroke="url(#chartGradient)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="6 3"
        />

        {/* Secondary subtle market line */}
        <path
          d="M0 280 Q 320 230, 640 260 T 1120 180 T 1440 150"
          stroke="#00D2FF"
          strokeWidth="1"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* Financial Candlestick Bars */}
        <g opacity="0.65">
          {/* Green / Cyan bullish candles */}
          <line x1="160" y1="190" x2="160" y2="270" stroke="#00D2FF" strokeWidth="1" />
          <rect x="156" y="210" width="8" height="40" rx="1" fill="#00D2FF" fillOpacity="0.4" stroke="#00D2FF" strokeWidth="1" />

          <line x1="380" y1="160" x2="380" y2="240" stroke="#00D2FF" strokeWidth="1" />
          <rect x="376" y="175" width="8" height="45" rx="1" fill="#00D2FF" fillOpacity="0.4" stroke="#00D2FF" strokeWidth="1" />

          <line x1="720" y1="130" x2="720" y2="210" stroke="#FFD700" strokeWidth="1" />
          <rect x="716" y="145" width="8" height="50" rx="1" fill="#FFD700" fillOpacity="0.4" stroke="#FFD700" strokeWidth="1" />

          {/* Orange / Gold breakout candle */}
          <line x1="1080" y1="80" x2="1080" y2="180" stroke="#FF7A00" strokeWidth="1" />
          <rect x="1075" y="95" width="10" height="60" rx="1" fill="#FF7A00" fillOpacity="0.45" stroke="#FF7A00" strokeWidth="1" />

          <line x1="1320" y1="60" x2="1320" y2="150" stroke="#FF7A00" strokeWidth="1" />
          <rect x="1315" y="75" width="10" height="55" rx="1" fill="#FF7A00" fillOpacity="0.45" stroke="#FF7A00" strokeWidth="1" />
        </g>
      </svg>

      {/* ── 4. DYNAMIC INTERACTIVE NETWORK CANVAS ─────────────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ── 5. VIGNETTE RADIAL MASK ───────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050814_90%)] opacity-85" />
    </div>
  )
}
