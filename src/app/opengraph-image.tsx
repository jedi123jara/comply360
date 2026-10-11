/**
 * Imagen para redes sociales (/opengraph-image). Se usa en toda página que no
 * tenga su propia `opengraph-image`. Identidad del sitio: azul marino + ámbar.
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Comply360: tu área de cumplimiento, sin tenerla en planilla'
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
          justifyContent: 'space-between',
          background: '#0B1B36',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#ffffff' }}>
            Comply<span style={{ color: '#F5B301' }}>360</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#F5B301',
            }}
          >
            Cumplimiento normativo para empresas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, fontWeight: 800, lineHeight: 1.05, color: '#ffffff' }}>
            <span>Tu área de cumplimiento,</span>
            <span style={{ color: '#F5B301' }}>sin tenerla en planilla</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#CBD5E1' }}>
            Laboral · SST · Hostigamiento sexual · Capacitaciones
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: '#ffffff' }}>comply360.pe</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
