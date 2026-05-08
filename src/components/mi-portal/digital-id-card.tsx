/**
 * DigitalIdCard — Tarjeta digital del trabajador (estilo "credencial física").
 *
 * Mock-up del diseño Claude Design (handoff 2026-04-28):
 * - Fondo oscuro neutral-900/800 con halo emerald
 * - Foto/inicial en gradient emerald
 * - QR generativo (visual mock — el QR real lo lee /api/workers/[id]/qr)
 * - Badge "ID Digital · Vigente" con dot pulsante
 * - Footer con QR + nombre de empresa + "Verificable en comply360.pe/v"
 *
 * Permite al trabajador mostrar su identidad laboral verificable en cualquier
 * lugar (ingresar a obra, recibir paquete, mostrar a SUNAFIL).
 */

import { Shield } from 'lucide-react'

interface DigitalIdCardProps {
  name: string
  position?: string | null
  dni: string
  code?: string
  org: string
  initial: string
}

export function DigitalIdCard({
  name,
  position,
  dni,
  code = 'C360',
  org,
  initial,
}: DigitalIdCardProps) {
  return (
    <section
      className="relative overflow-hidden grid"
      style={{
        margin: '0 0',
        borderRadius: 20,
        padding: 18,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        boxShadow:
          '0 1px 2px rgba(15,23,42,0.06), 0 8px 20px -4px rgba(15,23,42,0.08), 0 24px 48px -12px rgba(15,23,42,0.12), 0 0 0 0.5px rgba(15,23,42,0.05)',
        gridTemplateColumns: '76px 1fr',
        gap: 16,
        minHeight: 200,
      }}
    >
      {/* Halo emerald top-right */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-50%',
          right: '-20%',
          width: 240,
          height: 240,
          background:
            'radial-gradient(circle, rgba(16,185,129,0.35), transparent 60%)',
        }}
      />

      {/* Foto / inicial */}
      <div
        className="relative z-[1] grid place-items-center"
        style={{
          width: 76,
          height: 96,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #93c5fd, #1d4ed8)',
          fontFamily: 'var(--font-serif)',
          fontSize: 36,
          color: 'white',
          border: '1.5px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {initial}
      </div>

      {/* Body */}
      <div className="relative z-[1] flex flex-col justify-between min-w-0">
        <div className="flex justify-between items-start gap-2">
          <span
            className="inline-flex items-center gap-[5px]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#93c5fd',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#60a5fa',
                boxShadow: '0 0 6px #60a5fa',
                animation: 'idcard-pulse 2s ease-in-out infinite',
              }}
            />
            ID Digital · Vigente
          </span>
          <Shield className="w-[22px] h-[22px]" style={{ color: '#93c5fd' }} />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            marginTop: 6,
            marginBottom: 2,
          }}
        >
          {name}
        </div>

        {position && (
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 10,
            }}
          >
            {position}
          </div>
        )}

        <div
          className="grid"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 10px',
            fontSize: 10,
          }}
        >
          <div>
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                fontSize: 8.5,
                marginBottom: 1,
              }}
            >
              DNI
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                fontSize: 11,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              {dni}
            </div>
          </div>
          <div>
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                fontSize: 8.5,
                marginBottom: 1,
              }}
            >
              Código
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                fontSize: 11,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              {code}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="relative z-[1] flex justify-between items-center"
        style={{
          gridColumn: '1 / -1',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '0.5px solid rgba(255,255,255,0.15)',
        }}
      >
        {/* QR mock visual */}
        <div
          className="grid place-items-center"
          style={{
            width: 44,
            height: 44,
            background: 'white',
            borderRadius: 6,
            padding: 3,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 21 21" shapeRendering="crispEdges">
            {/* QR pattern mock — el QR real se genera server-side cuando se necesita */}
            {Array.from({ length: 21 }).map((_, y) =>
              Array.from({ length: 21 }).map((__, x) => {
                const seed = (x * 7 + y * 13 + x * y) % 11
                const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
                const cornerInner =
                  ((x > 1 && x < 5) && (y > 1 && y < 5)) ||
                  ((x > 15 && x < 19) && (y > 1 && y < 5)) ||
                  ((x > 1 && x < 5) && (y > 15 && y < 19))
                const cornerOuter1 = (x === 0 || x === 6 || y === 0 || y === 6) && (x < 7 && y < 7)
                const cornerOuter2 = (x === 14 || x === 20 || y === 0 || y === 6) && (x >= 14 && y < 7)
                const cornerOuter3 = (x === 0 || x === 6 || y === 14 || y === 20) && (x < 7 && y >= 14)
                const isOn = seed < 4 || cornerInner || (corner && (cornerOuter1 || cornerOuter2 || cornerOuter3))
                return isOn ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null
              }),
            )}
          </svg>
        </div>

        <div
          className="text-right"
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}
        >
          <strong style={{ color: 'white', fontWeight: 600 }}>{org}</strong>
          <br />
          Verificable en comply360.pe/v
        </div>
      </div>

      {/* Local keyframes */}
      <style jsx>{`
        @keyframes idcard-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </section>
  )
}
