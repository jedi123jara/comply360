'use client'

/**
 * Error boundary del segmento /admin/*.
 *
 * Sin este archivo, un crash en `page.tsx` o sus children deja la pantalla
 * en blanco (el sidebar sigue visible porque vive en el layout, pero el
 * children no renderiza). Con este archivo capturamos el error y mostramos
 * stack trace + opciones de retry/log.
 */

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log a la consola del browser para que el operador pueda copiarlo.
    console.error('[admin/error] crash capturado:', error)
  }, [error])

  return (
    <div
      style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 12,
        padding: 24,
        margin: '20px 0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ margin: 0, color: '#991b1b', fontSize: 18 }}>
        ⚠ Error al renderizar esta página
      </h2>
      <p style={{ marginTop: 8, color: '#7f1d1d', fontSize: 14, lineHeight: 1.5 }}>
        {error.message || 'Ocurrió un error inesperado en el panel admin.'}
      </p>
      {error.digest ? (
        <p style={{ marginTop: 6, color: '#7f1d1d', fontSize: 12, opacity: 0.7 }}>
          Digest: <code>{error.digest}</code>
        </p>
      ) : null}
      {error.stack ? (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
            Ver stack trace
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 12,
              background: '#fff',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.4,
              overflowX: 'auto',
              color: '#450a0a',
              maxHeight: 320,
            }}
          >
            {error.stack}
          </pre>
        </details>
      ) : null}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/admin'
          }}
          style={{
            background: 'white',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Ir al overview
        </button>
      </div>
    </div>
  )
}
