'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker de COMPLY360 en producción.
 * En desarrollo no se registra para evitar interferir con HMR.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => {
          console.warn('[COMPLY360] SW registration failed', err)
        })
    }

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)

    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
