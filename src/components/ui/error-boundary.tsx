'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Error Boundary — catches render errors in child components                */
/* -------------------------------------------------------------------------- */

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional custom fallback UI. Receives error and reset fn. */
  fallback?: React.ReactNode | ((props: { error: Error; reset: () => void }) => React.ReactNode)
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Optional className for the fallback wrapper */
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Structured console log
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'ErrorBoundary caught a render error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      })
    )

    // Forward to external handler (e.g. Sentry)
    this.props.onError?.(error, errorInfo)

    // Sentry integration — only in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Sentry = (window as any).__SENTRY__
      if (Sentry?.captureException) {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    const { fallback } = this.props
    const { error } = this.state

    // Custom fallback — function variant
    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.handleReset })
    }

    // Custom fallback — element variant
    if (fallback) {
      return fallback
    }

    // Default fallback UI
    return <DefaultErrorFallback error={error} reset={this.handleReset} className={this.props.className} />
  }
}

/* -------------------------------------------------------------------------- */
/*  Default Fallback UI                                                       */
/* -------------------------------------------------------------------------- */

interface DefaultErrorFallbackProps {
  error: Error
  reset: () => void
  className?: string
}

function DefaultErrorFallback({ error, reset, className }: DefaultErrorFallbackProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center',
        'border-red-200 bg-red-50',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-7 w-7 text-red-600" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-red-900">
          Algo sali&oacute; mal
        </h3>
        <p className="max-w-md text-sm text-red-700">
          Ocurri&oacute; un error inesperado. Puedes intentar de nuevo o contactar al soporte si el problema persiste.
        </p>
      </div>

      {/* Show error message in development */}
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-red-100 p-3 text-left text-xs text-red-800">
          {error.message}
        </pre>
      )}

      <button
        type="button"
        onClick={reset}
        className={cn(
          'mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
          'bg-red-600 text-white hover:bg-red-700',
          'bg-red-700',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
        )}
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  )
}

export default ErrorBoundary
