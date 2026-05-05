/**
 * Modal shell reutilizable para el v2.
 *
 * Proporciona el backdrop animado, contenedor centrado, animaciones
 * spring, atajos de teclado (Escape cierra) y header consistente.
 */
'use client'

import { m, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export interface ModalShellProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  /** Footer custom — si se omite, no se muestra. */
  footer?: ReactNode
}

const WIDTH_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
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
  // Atajo Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

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
                  <h2 className="text-base font-semibold text-slate-900">{title}</h2>
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
