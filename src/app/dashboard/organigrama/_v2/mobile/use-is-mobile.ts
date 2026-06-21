/**
 * Hook que detecta si el viewport es mobile (<768px).
 *
 * Usa `matchMedia` con suscripción para responder a cambios de tamaño en
 * vivo (ej. rotación, drawer DevTools).
 *
 * Devuelve `undefined` durante el render del servidor y el primer render del
 * cliente (no conocemos el viewport todavía). Recién en el efecto post-montaje
 * resuelve a `true`/`false`. Así el primer render del cliente coincide con el
 * del servidor y se evita el hydration mismatch + el flash de canvas→lista en
 * móvil. Los consumidores deben tratar `undefined` como "aún no sé".
 */
'use client'

import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler) // Safari < 14
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [])

  return isMobile
}
