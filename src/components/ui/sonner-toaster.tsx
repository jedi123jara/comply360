'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles } from 'lucide-react'

/**
 * SonnerToaster — toaster con skin dark.
 *
 * Mount once en root layout. Usar desde cualquier componente:
 *   import { toast } from '@/components/ui/sonner-toaster'
 *   toast.success('Trabajador creado')
 *   toast.error('No se pudo guardar', { description: '...' })
 *   toast.promise(promise, { loading, success, error })
 */
export function AppToaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors={false}
      closeButton
      duration={5000}
      visibleToasts={5}
      offset={20}
      gap={10}
      toastOptions={{
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
            '!bg-[color:var(--bg-surface)] !border !border-[color:var(--border-default)] !text-[color:var(--text-tertiary)] hover:!bg-[color:var(--bg-surface-hover)]',
          success:
            '!border-emerald-400/30 [&>[data-icon]]:!text-emerald-300',
          error:
            '!border-crimson-400/30 [&>[data-icon]]:!text-crimson-300',
          warning:
            '!border-amber-400/30 [&>[data-icon]]:!text-amber-300',
          info:
            '!border-cyan-400/25 [&>[data-icon]]:!text-cyan-200',
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        error: <XCircle className="h-5 w-5 text-crimson-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        info: <Info className="h-5 w-5 text-cyan-600" />,
        loading: <Sparkles className="h-5 w-5 animate-pulse text-emerald-600" />,
      }}
    />
  )
}

export const toast = sonnerToast
export type { ExternalToast } from 'sonner'
