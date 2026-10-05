'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Modal — Radix Dialog with Obsidian+Esmeralda skin.
 *
 * Backwards-compatible API: existing callers using
 * `<Modal isOpen onClose title size>{...}</Modal>` continue to work.
 *
 * New: `description` (accessible subtitle), `footer` slot, `hideClose`, size `full`.
 * Dialog primitives (`Modal.Root`, `Modal.Trigger`, `Modal.Content`, …) are
 * also exposed for advanced composition.
 *
 * Accesibilidad (compartida con Sheet y ConfirmDialog):
 *  - `role="dialog"` + `aria-modal="true"`, título enlazado por `aria-labelledby`
 *  - Escape cierra; el foco queda atrapado mientras está abierta
 *  - al cerrar, el foco vuelve al botón que la abrió, aunque no se use
 *    `ModalTrigger` (Radix solo lo hace con su propio Trigger)
 *  - misma capa de fondo: overlay en `--z-modal-backdrop` y contenido en `--z-modal`
 */

// ─── Piezas compartidas por Modal, Sheet y ConfirmDialog ────────────────

/**
 * Capa de fondo común de todas las ventanas. El velo es un color fijo (navy
 * #0f172a al 40 %): `bg-neutral-900` no sirve porque en el tema oscuro la rampa
 * neutral está invertida y el velo salía blanco.
 */
export const dialogOverlayClassName = cn(
  'fixed inset-0 z-[var(--z-modal-backdrop,290)]',
  'bg-[rgba(15,23,42,0.4)] backdrop-blur-sm',
  'c360-modal-overlay',
  'data-[state=open]:motion-fade-in'
)

/** Capa (z-index) del contenido de cualquier ventana, por encima del overlay. */
export const dialogLayerClassName = 'z-[var(--z-modal,300)]'

type ReturnFocusRef = RefObject<HTMLElement | null>

/**
 * Recuerda qué elemento tenía el foco justo antes de abrirse la ventana
 * (normalmente el botón que la abrió). Corre en un layout effect del padre:
 * el Portal de Radix monta el contenido en un segundo render, así que en este
 * punto el foco todavía no se ha movido dentro de la ventana.
 */
export function useDialogReturnFocus(open: boolean | undefined): ReturnFocusRef {
  const targetRef = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const active = document.activeElement
    targetRef.current = active instanceof HTMLElement && active !== document.body ? active : null
  }, [open])
  return targetRef
}

/**
 * Handler para `onCloseAutoFocus`: devuelve el foco al elemento recordado.
 * Si quien usa el componente ya hizo `preventDefault`, no hace nada; si no hay
 * elemento recordado, deja el comportamiento de Radix (foco a su Trigger).
 */
export function returnFocusOnClose(
  targetRef: ReturnFocusRef | null | undefined,
  handler?: (event: Event) => void
) {
  return (event: Event) => {
    handler?.(event)
    if (event.defaultPrevented) return
    const target = targetRef?.current
    if (target && target.isConnected) {
      event.preventDefault()
      target.focus()
    }
  }
}

/** Contexto para que `ModalContent` / `SheetContent` usen el foco que recordó su Root. */
export const DialogReturnFocusContext = createContext<ReturnFocusRef | null>(null)

function CloseIconButton({ className }: { className?: string }) {
  return (
    <Dialog.Close asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Cerrar"
        className={cn('shrink-0 text-[color:var(--text-tertiary)]', className)}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>
    </Dialog.Close>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────

const contentVariants = cva(
  [
    'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    dialogLayerClassName,
    'w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] overflow-hidden',
    'rounded-2xl border border-[color:var(--border-default)]',
    'bg-[color:var(--bg-elevated)]',
    'shadow-[var(--elevation-4)]',
    'data-[state=open]:animate-scale-in data-[state=open]:motion-fade-in',
    'c360-modal-content',
    'focus:outline-none',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw] max-h-[90vh]',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

export interface ModalProps extends VariantProps<typeof contentVariants> {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  children: ReactNode
  hideClose?: boolean
  contentClassName?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  footer,
  size,
  children,
  hideClose = false,
  contentClassName,
}: ModalProps) {
  const returnFocus = useDialogReturnFocus(isOpen)

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        // Escape, clic fuera y la X llegan aquí: onClose se llama una sola vez.
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={dialogOverlayClassName} />
        <Dialog.Content
          aria-modal="true"
          // Sin descripción no se deja un aria-describedby colgando.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(contentVariants({ size }), contentClassName)}
          onCloseAutoFocus={returnFocusOnClose(returnFocus)}
        >
          {title ? (
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[color:var(--border-subtle)]">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-bold tracking-tight text-[color:var(--text-primary)]">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              {hideClose ? null : <CloseIconButton />}
            </div>
          ) : (
            // title-less modals: show a floating close button
            !hideClose && <CloseIconButton className="absolute right-4 top-4 z-10" />
          )}

          <div className="overflow-y-auto px-6 py-5 max-h-[70vh]">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)]">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Advanced composition API — for when the simple `Modal` prop shape
 * isn't enough (e.g. a trigger button elsewhere in the tree).
 *
 * `ModalRoot` recuerda el elemento con foco al abrirse (si es controlado con
 * `open`) para que `ModalContent` se lo devuelva al cerrar.
 */
export function ModalRoot(props: React.ComponentProps<typeof Dialog.Root>) {
  const returnFocus = useDialogReturnFocus(props.open)
  return (
    <DialogReturnFocusContext.Provider value={returnFocus}>
      <Dialog.Root {...props} />
    </DialogReturnFocusContext.Provider>
  )
}
export const ModalTrigger = Dialog.Trigger
export const ModalClose = Dialog.Close
export const ModalPortal = Dialog.Portal
export const ModalOverlay = forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay ref={ref} className={cn(dialogOverlayClassName, className)} {...props} />
))
ModalOverlay.displayName = 'ModalOverlay'

export const ModalContent = forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> &
    VariantProps<typeof contentVariants>
>(({ className, size, onCloseAutoFocus, ...props }, ref) => {
  const returnFocus = useContext(DialogReturnFocusContext)
  return (
    <Dialog.Content
      ref={ref}
      aria-modal="true"
      className={cn(contentVariants({ size }), className)}
      onCloseAutoFocus={returnFocusOnClose(returnFocus, onCloseAutoFocus)}
      {...props}
    />
  )
})
ModalContent.displayName = 'ModalContent'

export const ModalTitle = Dialog.Title
export const ModalDescription = Dialog.Description
