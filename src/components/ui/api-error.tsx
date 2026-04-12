'use client'

import { Lock, Search, Clock, ServerCrash, WifiOff, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  API Error Display — inline error component for failed fetches             */
/* -------------------------------------------------------------------------- */

interface ApiErrorProps {
  /** Human-readable error message */
  message?: string
  /** HTTP status code (omit for network errors) */
  statusCode?: number
  /** Retry callback — shows a retry button when provided */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
  /** Compact mode — less padding, smaller text */
  compact?: boolean
}

interface ErrorVariant {
  icon: React.ElementType
  title: string
  defaultMessage: string
  color: {
    bg: string
    border: string
    icon: string
    title: string
    text: string
    button: string
    buttonHover: string
  }
}

function getVariant(statusCode?: number): ErrorVariant {
  // Auth errors
  if (statusCode === 401 || statusCode === 403) {
    return {
      icon: Lock,
      title: 'Acceso denegado',
      defaultMessage: 'No tienes permisos para acceder a este recurso. Verifica tu sesión o contacta al administrador.',
      color: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        text: 'text-amber-700',
        button: 'bg-amber-600',
        buttonHover: 'hover:bg-amber-700',
      },
    }
  }

  // Not found
  if (statusCode === 404) {
    return {
      icon: Search,
      title: 'No encontrado',
      defaultMessage: 'El recurso solicitado no existe o fue eliminado.',
      color: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        text: 'text-blue-700',
        button: 'bg-blue-600',
        buttonHover: 'hover:bg-blue-700',
      },
    }
  }

  // Rate limit
  if (statusCode === 429) {
    return {
      icon: Clock,
      title: 'Demasiadas solicitudes',
      defaultMessage: 'Has realizado demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
      color: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-600',
        title: 'text-orange-900',
        text: 'text-orange-700',
        button: 'bg-orange-600',
        buttonHover: 'hover:bg-orange-700',
      },
    }
  }

  // Server errors (5xx)
  if (statusCode && statusCode >= 500) {
    return {
      icon: ServerCrash,
      title: 'Error del servidor',
      defaultMessage: 'El servidor encontró un error. Nuestro equipo ha sido notificado. Intenta de nuevo en unos minutos.',
      color: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        text: 'text-red-700',
        button: 'bg-red-600',
        buttonHover: 'hover:bg-red-700',
      },
    }
  }

  // Network / no status code
  if (!statusCode) {
    return {
      icon: WifiOff,
      title: 'Sin conexión',
      defaultMessage: 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.',
      color: {
        bg: 'bg-white/[0.02] bg-[#141824]/50',
        border: 'border-white/[0.08] border-white/[0.08]',
        icon: 'text-gray-500',
        title: 'text-gray-900',
        text: 'text-gray-600',
        button: 'bg-gray-700',
        buttonHover: 'hover:bg-gray-800',
      },
    }
  }

  // Generic fallback
  return {
    icon: AlertCircle,
    title: 'Error inesperado',
    defaultMessage: 'Ocurrió un error inesperado. Intenta de nuevo o contacta al soporte.',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      text: 'text-red-700',
      button: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    },
  }
}

export function ApiError({ message, statusCode, onRetry, className, compact = false }: ApiErrorProps) {
  const variant = getVariant(statusCode)
  const Icon = variant.icon

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-4 rounded-2xl border',
        variant.color.bg,
        variant.color.border,
        compact ? 'p-4' : 'p-6',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center rounded-full',
          compact ? 'h-9 w-9' : 'h-11 w-11',
          variant.color.bg
        )}
      >
        <Icon className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', variant.color.icon)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn('font-semibold', compact ? 'text-sm' : 'text-base', variant.color.title)}>
            {variant.title}
          </h4>
          {statusCode && (
            <span className={cn('text-xs font-mono opacity-60', variant.color.text)}>
              {statusCode}
            </span>
          )}
        </div>
        <p className={cn('mt-1', compact ? 'text-xs' : 'text-sm', variant.color.text)}>
          {message || variant.defaultMessage}
        </p>

        {/* Retry button */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-lg text-white text-sm font-medium transition-colors',
              compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2',
              variant.color.button,
              variant.color.buttonHover,
              'focus:outline-none focus:ring-2 focus:ring-offset-2'
            )}
          >
            <RefreshCw className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}

export default ApiError
