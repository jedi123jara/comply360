import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Calculadoras laborales gratuitas — CTS, gratificación, multas SUNAFIL'
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
          background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #eff6ff 100%)',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              color: '#0f172a',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <span>COMPLY</span>
            <span style={{ color: '#1d4ed8' }}>360</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              color: '#1d4ed8',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Calculadoras laborales · Perú 2026
          </div>
          <div
            style={{
              color: '#0f172a',
              fontSize: 68,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            Calculá CTS, gratificación y multas SUNAFIL <span style={{ color: '#1d4ed8', marginLeft: 12 }}>gratis</span>
          </div>
          <div
            style={{
              color: '#475569',
              fontSize: 28,
              marginTop: 24,
              lineHeight: 1.4,
            }}
          >
            Sin registro · Actualizado 2026 · Con base legal citada en cada cálculo
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 22, fontWeight: 500 }}>
            comply360.pe/calculadoras
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['D.S. 001-97-TR', 'Ley 27735', 'D.S. 019-2006-TR'].map((norma) => (
              <div
                key={norma}
                style={{
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#1e40af',
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  fontFamily: 'monospace',
                }}
              >
                {norma}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
