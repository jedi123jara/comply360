'use client'

import { useSyncExternalStore } from 'react'
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles } from 'lucide-react'

/**
 * AppToaster — el único sistema de avisos de la app.
 *
 * Mount once en root layout. Usar desde cualquier componente:
 *   import { toast } from '@/components/ui/sonner-toaster'
 *   toast.success('Trabajador creado')
 *   toast.error('No se pudo guardar', { description: '...' })
 *   toast.promise(promise, { loading, success, error })
 *
 * El `useToast()` heredado (`@/components/ui/toast`) es un adaptador sobre este
 * mismo toaster, así que todos los avisos se ven igual.
 *
 * Colores: salen de variables de tema (`--bg-elevated`, `--text-*`, tonos de
 * estado), así que siguen al tema claro del dashboard y al oscuro del resto.
 * Cada tipo lleva un ícono de forma distinta: el color nunca es la única señal.
 */

const LIGHT_THEME_CLASS = 'c360-dashboard-light'

type ToasterTheme = 'light' | 'dark'

function subscribeToBodyClass(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function getBodyTheme(): ToasterTheme {
  return document.body.classList.contains(LIGHT_THEME_CLASS) ? 'light' : 'dark'
}

function getServerTheme(): ToasterTheme {
  return 'dark'
}

/** El dashboard activa el tema claro poniendo una clase en <body>. */
function useBodyTheme(): ToasterTheme {
  return useSyncExternalStore(subscribeToBodyClass, getBodyTheme, getServerTheme)
}

// Tinta por tono: colores por función --status-* (respaldo: valor del tema claro).
const TONE_INK = {
  success: 'text-[color:var(--status-success-fg,#166534)]',
  error: 'text-[color:var(--status-danger-fg,#9f1239)]',
  warning: 'text-[color:var(--status-warning-fg,#92400e)]',
  info: 'text-[color:var(--status-info-fg,#1d4ed8)]',
} as const

export function AppToaster() {
  const theme = useBodyTheme()

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors={false}
      closeButton
      duration={5000}
      visibleToasts={5}
      offset={20}
      gap={10}
      containerAriaLabel="Notificaciones"
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar aviso',
        classNames: {
          toast:
            'group !rounded-xl !border !border-[color:var(--border-default)] ' +
            '!bg-[color:var(--bg-elevated)] ' +
            '!shadow-[var(--elevation-3)] !text-[color:var(--text-primary)] ' +
            '!p-4 !gap-3',
          title: '!text-sm !font-semibold !text-[color:var(--text-primary)]',
          description: '!text-xs !text-[color:var(--text-secondary)] !leading-relaxed',
          actionButton:
            '!bg-emerald-600 !text-white !rounded-md !px-2.5 !py-1 !text-xs !font-semibold',
          cancelButton:
            '!bg-[color:var(--bg-inset)] !text-[color:var(--text-secondary)] !rounded-md !px-2.5 !py-1 !text-xs',
          closeButton:
            '!bg-[color:var(--bg-surface)] !border !border-[color:var(--border-default)] !text-[color:var(--text-secondary)] hover:!bg-[color:var(--bg-surface-hover)]',
          success: '!border-[color:var(--status-success-border,#bbf7d0)]',
          error: '!border-[color:var(--status-danger-border,#fecdd3)]',
          warning: '!border-[color:var(--status-warning-border,#fde68a)]',
          info: '!border-[color:var(--status-info-border,#bfdbfe)]',
        },
      }}
      icons={{
        success: <CheckCircle2 className={`h-5 w-5 ${TONE_INK.success}`} aria-hidden="true" />,
        error: <XCircle className={`h-5 w-5 ${TONE_INK.error}`} aria-hidden="true" />,
        warning: <AlertTriangle className={`h-5 w-5 ${TONE_INK.warning}`} aria-hidden="true" />,
        info: <Info className={`h-5 w-5 ${TONE_INK.info}`} aria-hidden="true" />,
        loading: <Sparkles className="h-5 w-5 animate-pulse text-emerald-600" aria-hidden="true" />,
      }}
    />
  )
}

export const toast = sonnerToast
export type { ExternalToast } from 'sonner'
