'use client'

/**
 * Adaptador de compatibilidad del antiguo `useToast()` / `<ToastProvider>`.
 *
 * Ya no hay un segundo sistema de avisos: `useToast().toast(...)` pinta con
 * sonner, en el mismo `<AppToaster />` que `toast.*` de
 * `@/components/ui/sonner-toaster`, así que todos los avisos se ven igual.
 *
 * - La API pública es la misma de siempre: `toast({ title, description, type,
 *   duration })` devuelve el id y `dismiss(id)` lo cierra.
 * - `useToast()` devuelve SIEMPRE el mismo objeto: se puede poner `toast` en
 *   las dependencias de useCallback/useEffect sin provocar renders en bucle.
 * - `ToastProvider` solo renderiza `children` (el layout raíz lo sigue montando).
 *
 * Para código nuevo usa `toast` de `@/components/ui/sonner-toaster`.
 */

import type { ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastInput {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => string
  dismiss: (id: string) => void
}

const DEFAULT_DURATION = 5000

let toastCounter = 0

/**
 * El id lo generamos nosotros (string) y se lo pasamos a sonner: así
 * `dismiss(id)` encuentra el aviso (sonner compara ids con ===, y por defecto
 * usa números).
 */
const toastApi: ToastContextValue = {
  toast({ title, description, type = 'info', duration = DEFAULT_DURATION }) {
    toastCounter += 1
    const id = `c360-toast-${toastCounter}`
    const show = sonnerToast[type] ?? sonnerToast.info
    show(title, { id, description, duration })
    return id
  },
  dismiss(id: string) {
    sonnerToast.dismiss(id)
  },
}

export function useToast(): ToastContextValue {
  return toastApi
}

/**
 * No-op provider — el toaster real es <AppToaster /> en el layout raíz.
 * Se mantiene para que los `<ToastProvider>` existentes sigan compilando.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
