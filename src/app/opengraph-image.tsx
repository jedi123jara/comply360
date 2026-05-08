/**
 * OG image root — generado por Next.js como /opengraph-image.
 *
 * Se sirve automáticamente como fallback para cualquier página que no
 * exporte su propia `opengraph-image`. Individual pages (calculadoras,
 * planes, etc.) pueden tener su propio `opengraph-image.tsx` adyacente
 * al `page.tsx` si quieren customización.
 *
 * Basado en `ImageResponse` de Next.js 16 (edge runtime, renderiza JSX
 * a PNG en tiempo de request). No requiere @vercel/og — ya viene con Next.
 */
import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/brand'

export const runtime = 'edge'

export const alt = `${BRAND.name} — ${BRAND.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #1a1f2e 50%, #172554 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Grid decorativo sutil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              'linear-gradient(rgba(16, 185, 129, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.6) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Glow esmeralda superior derecho */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Header con logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 28,
              fontWeight: 800,
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
            }}
          >
            C
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
              gap: 2,
            }}
          >
            <span>COMPLY</span>
            <span style={{ color: '#60a5fa' }}>360</span>
          </div>
        </div>

        {/* Contenido central — tagline grande */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            zIndex: 10,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            Tu escudo contra <span style={{ color: '#60a5fa', marginLeft: 16 }}>multas SUNAFIL</span>
          </div>
          <div
            style={{
              color: '#94a0b4',
              fontSize: 28,
              fontWeight: 400,
              marginTop: 24,
              lineHeight: 1.4,
              maxWidth: 850,
            }}
          >
            Compliance laboral integral para empresas peruanas. Diagnóstico, simulacro, IA y
            garantía anti-multa.
          </div>
        </div>

        {/* Footer con URL + badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              color: '#94a0b4',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            comply360.pe
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['13 calculadoras', '135 preguntas', 'IA laboral'].map((badge) => (
              <div
                key={badge}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#93c5fd',
                  fontSize: 18,
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
