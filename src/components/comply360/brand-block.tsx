'use client'

/**
 * BrandBlockA — "Sello notarial" (Variant A del prototipo).
 *
 * Escudo compacto esmeralda gradiente con icono shield-check blanco,
 * wordmark "Comply" Geist bold + badge "360" monospace emerald tenue,
 * caption "COMPLIANCE · PERÚ" con dot pulsante.
 *
 * Variant A es la final después del feedback del usuario en el chat:
 * "me referia que me gusta la opcion A"
 */
export function BrandBlockA() {
  return (
    <div className="c360-sb-brand">
      <div className="brand-mark">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <div className="c360-sb-brand-wordmark">
        <div className="brand-name">
          Comply<span className="num-tag">360</span>
        </div>
        <div className="brand-meta">
          <span className="dot" />
          Compliance · Perú
        </div>
      </div>
    </div>
  )
}
