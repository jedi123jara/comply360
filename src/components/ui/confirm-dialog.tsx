'use client'

/**
 * ConfirmDialog — reemplazo accesible del `window.confirm()` nativo.
 *
 * Por qué: `window.confirm()` rompe la estética (look del OS), no se puede
 * estilar, no es accesible con screen readers tan bien como un diálogo
 * ARIA, y no es posible asincronizar con feedback (loading, error).
 *
 * Dos formas de usarlo:
 *
 *   1) Imperativa (reemplazo drop-in de `confirm()`):
 *      const ok = await confirm({
 *        title: '¿Eliminar trabajador?',
 *        description: 'Esta acción no se puede deshacer.',
 *        confirmLabel: 'Eliminar',
 *        tone: 'danger',
 *      })
 *      if (!ok) return
 *
 *   2) Declarativa (JSX, cuando necesitas más control):
 *      <ConfirmDialog
 *        open={open}
 *        onClose={() => setOpen(false)}
 *        onConfirm={async () => { ... }}
 *        title="…"
 *        description="…"
 *        tone="danger"
 *      />
 *
 * Internamente monta Radix Dialog reutilizando el estilado de `Modal`.
 * Soporta:
 *  - tone: 'default' | 'danger' | 'warn'
 *  - loading state durante onConfirm
 *  - onConfirm puede ser async — el dialog queda abierto hasta que resuelve
 *  - Enter confirma, Esc cancela
 */

import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Trash2, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmTone = 'default' | 'danger' | 'warn'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  /**
   * Si true, el diálogo se cierra automáticamente tras onConfirm exitoso.
   * Default: true.
   */
  autoCloseOnConfirm?: boolean
}

const TONE_STYLES: Record<
  ConfirmTone,
  {
    iconBg: string
    iconColor: string
    Icon: typeof AlertTriangle
    confirmBtn: string
  }
> = {
  default: {
    iconBg: 'bg-blue-500/12 ring-1 ring-blue-400/25',
    iconColor: 'text-blue-300',
    Icon: HelpCircle,
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
  danger: {
    iconBg: 'bg-red-500/12 ring-1 ring-red-400/25',
    iconColor: 'text-red-300',
    Icon: Trash2,
    confirmBtn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
  warn: {
    iconBg: 'bg-amber-500/12 ring-1 ring-amber-400/25',
    iconColor: 'text-amber-300',
    Icon: AlertTriangle,
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
  },
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  autoCloseOnConfirm = true,
}: ConfirmDialogProps) {
  const tokens = TONE_STYLES[tone]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const descriptionId = useId()

  useEffect(() => {
    if (!open) {
      const resetTimer = window.setTimeout(() => {
        setLoading(false)
        setError(null)
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }
  }, [open])

  async function handleConfirm() {
    setError(null)
    setLoading(true)
    try {
      await onConfirm()
      if (autoCloseOnConfirm) onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[var(--z-modal-backdrop)]',
            'bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
          )}
        />
        <Dialog.Content
          aria-describedby={description ? descriptionId : undefined}
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-md',
            'rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]',
            'shadow-[var(--elevation-4)]',
            'data-[state=open]:animate-scale-in data-[state=open]:motion-fade-in',
            'focus:outline-none',
            'p-6',
          )}
        >
          <div className="flex gap-4">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center',
                tokens.iconBg,
              )}
            >
              <tokens.Icon className={cn('w-5 h-5', tokens.iconColor)} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-[color:var(--text-primary)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description
                  id={descriptionId}
                  className="mt-1.5 text-sm text-[color:var(--text-secondary)]"
                >
                  {description}
                </Dialog.Description>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-3 text-sm text-red-200 bg-red-500/12 ring-1 ring-red-400/25 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium ring-1 ring-slate-300',
                'bg-[color:var(--bg-surface)] hover:bg-[color:var(--bg-surface-hover)] text-[color:var(--text-secondary)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-canvas)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              autoFocus
              className={cn(
                'inline-flex items-center justify-center gap-1.5',
                'px-4 py-2 rounded-xl text-sm font-medium text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                tokens.confirmBtn,
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Procesando…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Imperative API ────────────────────────────────────────────────────

type ImperativeOptions = Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>

/**
 * Reemplazo de `window.confirm()` con UI accesible + styling consistente.
 * Retorna Promise<boolean>: true si el usuario confirmó, false si canceló.
 *
 * Usage:
 *   const ok = await confirm({ title: '¿Eliminar?', tone: 'danger' })
 *   if (!ok) return
 *   // proceder con la acción
 */
export function confirm(options: ImperativeOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    let root: Root | null = createRoot(container)

    const cleanup = () => {
      try {
        root?.unmount()
      } catch {
        /* ignored */
      }
      root = null
      if (container.parentNode) container.parentNode.removeChild(container)
    }

    const handleConfirm = () => resolve(true)
    const handleClose = () => {
      resolve(false)
      // permitir que la animación de salida termine
      setTimeout(cleanup, 200)
    }

    root.render(
      <ConfirmDialog
        open
        onClose={handleClose}
        onConfirm={() => {
          handleConfirm()
          setTimeout(cleanup, 200)
        }}
        {...options}
      />,
    )
  })
}
