import { ImageResponse } from 'next/og'
import { PLANS } from '@/lib/constants'
import { formatSolesMarketing } from '@/lib/format/peruvian'

export const runtime = 'edge'
export const alt = 'Planes y precios COMPLY360 — desde 249 nuevos soles/mes'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const cards = [
    { label: 'Starter', price: formatSolesMarketing(PLANS.STARTER.price) },
    { label: 'Pro', price: formatSolesMarketing(PLANS.PRO.price) },
    { label: 'Empresa', price: formatSolesMarketing(PLANS.EMPRESA.price) },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #172554 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -150,
            right: -150,
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 10 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 0,
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <span>COMPLY</span>
            <span style={{ color: '#60a5fa' }}>360</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              color: '#60a5fa',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Planes y precios · IGV incluido
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 74,
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 1.05,
              display: 'flex',
            }}
          >
            Desde {formatSolesMarketing(249)}/mes
          </div>
          <div
            style={{
              color: '#94a0b4',
              fontSize: 32,
              marginTop: 20,
              lineHeight: 1.4,
              maxWidth: 900,
              display: 'flex',
            }}
          >
            Compliance laboral peruano con evidencia, IA y alertas accionables.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ color: '#94a0b4', fontSize: 22, fontWeight: 500 }}>
            comply360.pe/planes
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {cards.map(({ label, price }) => (
              <div
                key={label}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: '#93c5fd', fontSize: 14, fontWeight: 600, display: 'flex' }}>
                  {label}
                </div>
                <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, display: 'flex' }}>
                  {price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
