/**
 * ConfettiCard — Card de "celebración" para milestones del trabajador.
 *
 * Mock-up del diseño Claude Design (handoff 2026-04-28):
 * - Background gradient gold/amber
 * - Confetti decorativo con box-shadows múltiples (sin assets externos)
 * - Title en Instrument Serif con `<em>` italic gold
 * - Eyebrow uppercase con icon (PartyPopper, Cake, etc.)
 *
 * Casos de uso:
 * - Aniversario en la empresa ("¡3 años, chamba dura!")
 * - Cumpleaños del trabajador
 * - Capacitación completada
 * - Streak de asistencia (30 días sin tardanza)
 */

import type { LucideIcon } from 'lucide-react'

interface ConfettiCardProps {
  icon: LucideIcon
  eyebrow: string
  title: string
  titleEmText?: string  // texto que va en italic gold (ej. "chamba dura")
  sub: string
}

export function ConfettiCard({ icon: Icon, eyebrow, title, titleEmText, sub }: ConfettiCardProps) {
  // Si pasa titleEmText, divide el title alrededor de él
  const titleParts = titleEmText
    ? title.split(titleEmText)
    : [title]

  return (
    <div
      className="relative overflow-hidden"
      style={{
        margin: 0,
        borderRadius: 20,
        padding: 20,
        background: 'radial-gradient(ellipse at top, #fef3c7, white 70%)',
        border: '0.5px solid #d4a853',
        boxShadow:
          '0 1px 2px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.04), 0 0 0 0.5px rgba(15,23,42,0.05)',
      }}
    >
      {/* Confetti dots (top-left) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: 18,
          left: 30,
          width: 8,
          height: 8,
          borderRadius: 2,
          background: '#d4a853',
          transform: 'rotate(20deg)',
          boxShadow: `
            20px 14px 0 #10b981,
            50px -4px 0 #ef4444,
            90px 24px 0 #34d399,
            140px 8px 0 #e0bc6e,
            180px 30px 0 #059669
          `,
        }}
      />
      {/* Confetti dots (bottom-right) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          bottom: 18,
          right: 24,
          width: 8,
          height: 8,
          borderRadius: 2,
          background: '#10b981',
          transform: 'rotate(-30deg)',
          boxShadow: `
            -30px -12px 0 #d4a853,
            -70px 4px 0 #ef4444,
            -110px -18px 0 #34d399
          `,
        }}
      />

      {/* Eyebrow with icon */}
      <div
        className="flex items-center gap-2.5 mb-1.5"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Icon className="w-5 h-5" style={{ color: '#b8923e' }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#b8923e',
          }}
        >
          {eyebrow}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 24,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          fontWeight: 400,
          position: 'relative',
          zIndex: 1,
          color: 'var(--text-primary)',
        }}
      >
        {titleParts[0]}
        {titleEmText && (
          <em style={{ color: '#b8923e', fontStyle: 'italic' }}>
            {titleEmText}
          </em>
        )}
        {titleParts[1]}
      </h3>

      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginTop: 6,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {sub}
      </p>
    </div>
  )
}
