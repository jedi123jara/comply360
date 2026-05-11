'use client'

import { forwardRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Sheet — side drawer built on Radix Dialog.
 * Used by: AI Copilot drawer, calculator drawer, filters panel, worker quick-view.
 */

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetPortal = Dialog.Portal
export const SheetTitle = Dialog.Title
export const SheetDescription = Dialog.Description

export const SheetOverlay = forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[var(--z-drawer)]',
      'bg-neutral-900/40 backdrop-blur-sm',
      'data-[state=open]:motion-fade-in',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const sheetVariants = cva(
  [
    'fixed z-[var(--z-drawer)]',
    'bg-[color:var(--bg-elevated)]',
    'border-[color:var(--border-strong)]',
    'shadow-[var(--elevation-4)]',
    'flex flex-col',
    'focus:outline-none',
    'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  ],
  {
    variants: {
      side: {
        right: [
          'right-0 top-0 bottom-0 h-full w-[var(--copilot-width)] max-w-[92vw]',
          'border-l',
          'data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
        ],
        left: [
          'left-0 top-0 bottom-0 h-full w-[var(--sidebar-width)] max-w-[92vw]',
          'border-r',
          'data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full',
        ],
        top: [
          'top-0 left-0 right-0 w-full h-auto max-h-[80vh]',
          'border-b',
          'data-[state=open]:translate-y-0 data-[state=closed]:-translate-y-full',
        ],
        bottom: [
          'bottom-0 left-0 right-0 w-full h-auto max-h-[80vh]',
          'border-t rounded-t-2xl',
          'data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full',
        ],
      },
      size: {
        sm: '',
        md: '',
        lg: '',
        xl: '',
      },
    },
    defaultVariants: { side: 'right' },
    compoundVariants: [
      { side: 'right', size: 'sm', className: 'w-[320px]' },
      { side: 'right', size: 'md', className: 'w-[400px]' },
      { side: 'right', size: 'lg', className: 'w-[560px]' },
      { side: 'right', size: 'xl', className: 'w-[720px]' },
      { side: 'left', size: 'sm', className: 'w-[280px]' },
      { side: 'left', size: 'md', className: 'w-[360px]' },
      { side: 'left', size: 'lg', className: 'w-[480px]' },
    ],
  }
)

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean
}

export const SheetContent = forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(({ side, size, className, children, hideClose, ...props }, ref) => (
  <Dialog.Portal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(sheetVariants({ side, size }), className)}
      {...props}
    >
      {hideClose ? null : (
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <X className="w-5 h-5" />
          </button>
        </Dialog.Close>
      )}
      {children}
    </Dialog.Content>
  </Dialog.Portal>
))
SheetContent.displayName = 'SheetContent'

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 px-6 py-4 border-b border-[color:var(--border-subtle)]',
        className
      )}
      {...props}
    />
  )
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)]',
        className
      )}
      {...props}
    />
  )
}
