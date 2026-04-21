'use client'

/**
 * Legacy compatibility shim for the old `useToast()` / `<ToastProvider>` API.
 *
 * Internally now delegates to Sonner (`@/components/ui/sonner-toaster`).
 * The provider is a no-op — the real <AppToaster /> is mounted in the root
 * layout. `useToast()` returns an object with the same shape as before so
 * existing callers keep compiling while we migrate them to `toast.*`.
 *
 * DO NOT extend this file. Use `toast` from `@/components/ui/sonner-toaster`
 * for new code.
 */

import type { ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastInput {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => string
  dismiss: (id: string) => void
}

const TYPE_TO_SONNER: Record<
  ToastType,
  typeof sonnerToast.success
> = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  warning: sonnerToast.warning,
  info: sonnerToast.info,
}

export function useToast(): ToastContextValue {
  return {
    toast(input) {
      const fn = TYPE_TO_SONNER[input.type ?? 'info']
      const id = fn(input.title, {
        description: input.description,
        duration: input.duration ?? 5000,
      })
      return String(id)
    },
    dismiss(id: string) {
      sonnerToast.dismiss(id)
    },
  }
}

/**
 * No-op provider — the actual toaster is rendered by <AppToaster /> at the
 * root. Kept only so existing `<ToastProvider>` wrappers compile.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
