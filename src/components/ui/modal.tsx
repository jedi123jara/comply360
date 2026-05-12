'use client'

import { forwardRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Modal — Radix Dialog with Obsidian+Esmeralda skin.
 *
 * Backwards-compatible API: existing callers using
 * `<Modal isOpen onClose title size>{...}</Modal>` continue to work.
 *
 * New: `description` (accessible subtitle), `footer` slot, `hideClose`, size `full`.
 * Dialog primitives (`Modal.Root`, `Modal.Trigger`, `Modal.Content`, …) are
 * also exposed for advanced composition.
 */

const contentVariants = cva(
  [
    'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    'z-[var(--z-modal)] w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] overflow-hidden',
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
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[var(--z-modal)]',
            'bg-neutral-900/40 backdrop-blur-sm',
            'c360-modal-overlay',
            'data-[state=open]:motion-fade-in'
          )}
        />
        <Dialog.Content
          className={cn(contentVariants({ size }), contentClassName)}
          onEscapeKeyDown={() => onClose()}
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
              {hideClose ? null : (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    className="shrink-0 rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              )}
            </div>
          ) : (
            // title-less modals: show a floating close button
            !hideClose && (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            )
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
 */
export const ModalRoot = Dialog.Root
export const ModalTrigger = Dialog.Trigger
export const ModalClose = Dialog.Close
export const ModalPortal = Dialog.Portal
export const ModalOverlay = forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[var(--z-modal)] bg-neutral-900/40 backdrop-blur-sm',
      'data-[state=open]:motion-fade-in',
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = 'ModalOverlay'

export const ModalContent = forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> &
    VariantProps<typeof contentVariants>
>(({ className, size, ...props }, ref) => (
  <Dialog.Content
    ref={ref}
    className={cn(contentVariants({ size }), className)}
    {...props}
  />
))
ModalContent.displayName = 'ModalContent'

export const ModalTitle = Dialog.Title
export const ModalDescription = Dialog.Description
