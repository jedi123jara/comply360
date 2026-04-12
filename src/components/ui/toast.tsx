'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  title: string
  description?: string
  type: ToastType
  duration: number
}

interface ToastInput {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => string
  dismiss: (id: string) => void
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_VISIBLE = 5

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-500" />,
}

const borderColorMap: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
}

const bgMap: Record<ToastType, string> = {
  success: 'bg-green-50',
  error: 'bg-red-50',
  warning: 'bg-amber-50',
  info: 'bg-blue-50',
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

/* -------------------------------------------------------------------------- */
/*  Single toast item                                                         */
/* -------------------------------------------------------------------------- */

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData
  onDismiss: (id: string) => void
}) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startDismiss = useCallback(() => {
    setExiting(true)
    // Wait for the exit animation to finish before actually removing
    setTimeout(() => onDismiss(data.id), 300)
  }, [data.id, onDismiss])

  useEffect(() => {
    timerRef.current = setTimeout(startDismiss, data.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data.duration, startDismiss])

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-l-4 bg-[#141824] bg-[#141824] border-white/[0.08] p-4 shadow-lg transition-all duration-300',
        borderColorMap[data.type],
        bgMap[data.type],
        exiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100 animate-[slideInRight_0.3s_ease-out]'
      )}
    >
      {iconMap[data.type]}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{data.title}</p>
        {data.description && (
          <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
            {data.description}
          </p>
        )}
      </div>

      <button
        onClick={startDismiss}
        className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newToast: ToastData = {
        id,
        title: input.title,
        description: input.description,
        type: input.type ?? 'info',
        duration: input.duration ?? 5000,
      }

      setToasts((prev) => {
        const next = [...prev, newToast]
        // If we exceed the maximum, drop the oldest
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE)
        }
        return next
      })

      return id
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container — bottom-right, above everything */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} data={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
