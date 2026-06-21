/**
 * Modal shell reutilizable para el v2.
 *
 * Proporciona el backdrop animado, contenedor centrado, animaciones
 * spring, atajos de teclado (Escape cierra) y header consistente.
 */
'use client'

import { m, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Selector de elementos focusables dentro del panel del modal. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export interface ModalShellProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
  /** Footer custom — si se omite, no se muestra. */
  footer?: ReactNode
}

const WIDTH_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  width = 'md',
  children,
  footer,
}: ModalShellProps) {
  // Id unico por instancia para enlazar el panel con su titulo (aria-labelledby).
  const titleId = useId()
  // Ref al panel del modal: lo usamos para focus inicial y para el focus-trap.
  const panelRef = useRef<HTMLDivElement>(null)
  // Guarda el elemento que tenia el foco antes de abrir, para restaurarlo al cerrar.
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Atajo Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus management: al abrir guardamos el foco previo y enfocamos el panel
  // (o el primer focusable). Respetamos cualquier autoFocus de los children.
  // Al cerrar restauramos el foco al elemento que lo tenia.
  useEffect(() => {
    if (!open) return

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    // Si algun child ya tomo el foco (p.ej. input con autoFocus), no se lo robamos.
    const autoFocused =
      panel && panel.contains(document.activeElement) && document.activeElement !== panel

    if (panel && !autoFocused) {
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstFocusable ?? panel).focus()
    }

    return () => {
      previouslyFocused.current?.focus()
    }
  }, [open])

  // Focus trap: Tab / Shift+Tab circulan dentro del panel sin escapar.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (focusables.length === 0) {
        // Sin focusables: mantenemos el foco en el panel para no escapar del modal.
        e.preventDefault()
        panel.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[92vh] w-full ${WIDTH_CLASS[width]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
          >
            <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                {icon && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3">
                {footer}
              </footer>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
