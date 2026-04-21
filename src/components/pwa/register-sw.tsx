'use client'

import { useEffect } from 'react'

/**
 * Service worker de COMPLY360.
 *
 * - Producción: registra `/sw.js` para cache offline + push notifications.
 * - Desarrollo: **desregistra** cualquier SW previo y vacía caches.
 *   Esto evita que chunks antiguos queden cacheados entre builds
 *   (causa común del error "module factory is not available" en Turbopack HMR).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // En dev → garbage collect cualquier SW registrado en una sesión previa
    // y limpiar caches que podrían servir chunks stale.
    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((r) => r.unregister()))
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(
              keys
                .filter((k) => k.startsWith('comply360-'))
                .map((k) => caches.delete(k))
            )
          }
        } catch {
          /* non-fatal */
        }
      })()
      return
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[COMPLY360] SW registration failed', err)
        })
    }

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)

    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
