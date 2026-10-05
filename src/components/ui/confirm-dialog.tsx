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
 * Internamente monta Radix Dialog reutilizando el estilado de `Modal`
 * (misma capa de fondo y z-index) y los botones de `Button`.
 * Soporta:
 *  - tone: 'default' | 'danger' | 'warn'
 *  - loading state durante onConfirm
 *  - onConfirm puede ser async — el dialog queda abierto hasta que resuelve
 *  - Enter confirma, Esc cancela
 *  - `role="alertdialog"` + `aria-modal`, título y descripción enlazados, y el
 *    foco vuelve al botón que lo abrió (también en la forma imperativa)
 */

import { useEffect, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, AlertTriangle, Trash2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { statusToneClasses } from '@/components/ui/badge'
import {
  dialogLayerClassName,
  dialogOverlayClassName,
  returnFocusOnClose,
  useDialogReturnFocus,
} from '@/components/ui/modal'

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

/**
 * Colores por tono: el ícono usa los tonos de estado de Badge (AA en tema
 * claro y oscuro) y el botón de confirmar reutiliza las variantes de Button.
 * `warn` usa tinta oscura sobre ámbar: con texto blanco no llega a 4,5:1.
 */
const TONE_STYLES: Record<
  ConfirmTone,
  {
    iconTile: string
    Icon: typeof AlertTriangle
    confirmVariant: 'primary' | 'danger'
    confirmClassName?: string
  }
> = {
  default: {
    iconTile: statusToneClasses.info,
    Icon: HelpCircle,
    confirmVariant: 'primary',
  },
  danger: {
    iconTile: statusToneClasses.danger,
    Icon: Trash2,
    confirmVariant: 'danger',
  },
  warn: {
    iconTile: statusToneClasses.warning,
    Icon: AlertTriangle,
    confirmVariant: 'primary',
    confirmClassName:
      'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-none hover:shadow-none',
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
  const returnFocus = useDialogReturnFocus(open)

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
      setError(e instanceof Error ? e.message : 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogOverlayClassName} />
        <Dialog.Content
          role="alertdialog"
          aria-modal="true"
          // Radix enlaza la descripción solo; sin descripción no deja aria-describedby colgando.
          {...(description ? {} : { 'aria-describedby': undefined })}
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
          onCloseAutoFocus={returnFocusOnClose(returnFocus)}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            dialogLayerClassName,
            'w-[calc(100vw-2rem)] max-w-md',
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
                'w-11 h-11 rounded-xl border flex-shrink-0 flex items-center justify-center',
                tokens.iconTile,
              )}
            >
              <tokens.Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-[color:var(--text-primary)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                  {description}
                </Dialog.Description>
              )}
              {error && (
                <p
                  role="alert"
                  className={cn(
                    'mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                    statusToneClasses.danger,
                  )}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={tokens.confirmVariant}
              onClick={handleConfirm}
              loading={loading}
              autoFocus
              className={tokens.confirmClassName}
            >
              {loading ? 'Procesando…' : confirmLabel}
            </Button>
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
