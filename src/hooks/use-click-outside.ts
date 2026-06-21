/**
 * Cierra un panel al hacer click/touch fuera del elemento referenciado o al
 * presionar Escape. Reemplaza el patrón frágil de `onBlur + setTimeout` que
 * usaban los dropdowns del organigrama (no cerraban al click-fuera y dependían
 * de un timeout adivinado).
 *
 * Solo engancha los listeners cuando `enabled` es true (el panel está abierto),
 * así no corre nada mientras el dropdown está cerrado.
 *
 *   const ref = useRef<HTMLDivElement>(null)
 *   useClickOutside(ref, () => setOpen(false), open)
 */
'use client'

import { useEffect, useRef, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  enabled = true,
) {
  // Guardamos el callback en un ref para no re-suscribir los listeners en cada
  // render (el callback suele ser una arrow inline) ni arrastrar closures viejos.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!enabled) return

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const el = ref.current
      if (el && !el.contains(event.target as Node)) onCloseRef.current()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, enabled])
}
