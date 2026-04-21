'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles } from 'lucide-react'

/**
 * SonnerToaster — toaster con skin LIGHT.
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
      theme="light"
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
            '!bg-white ' +
            '!shadow-[var(--elevation-3)] !text-[color:var(--text-primary)] ' +
            '!p-4 !gap-3',
          title: '!text-sm !font-semibold !text-[color:var(--text-primary)]',
          description: '!text-xs !text-[color:var(--text-secondary)] !leading-relaxed',
          actionButton:
            '!bg-emerald-600 !text-white !rounded-md !px-2.5 !py-1 !text-xs !font-semibold',
          cancelButton:
            '!bg-[color:var(--neutral-100)] !text-[color:var(--text-secondary)] !rounded-md !px-2.5 !py-1 !text-xs',
          closeButton:
            '!bg-white !border !border-[color:var(--border-default)] !text-[color:var(--text-tertiary)] hover:!bg-[color:var(--neutral-50)]',
          success:
            '!border-emerald-200 [&>[data-icon]]:!text-emerald-600',
          error:
            '!border-crimson-200 [&>[data-icon]]:!text-crimson-600',
          warning:
            '!border-amber-200 [&>[data-icon]]:!text-amber-600',
          info:
            '!border-cyan-200 [&>[data-icon]]:!text-cyan-600',
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
