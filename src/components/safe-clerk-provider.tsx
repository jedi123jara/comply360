'use client'

import React, { Component, type ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

/* -------------------------------------------------------------------------- */
/*  SafeClerkProvider                                                         */
/*  Wraps ClerkProvider in an ErrorBoundary so that if Clerk JS fails to load  */
/*  (expired instance, network error, CORS, etc.), the app still renders.     */
/*  In development mode it shows a warning banner; in production it silently   */
/*  falls back to unauthenticated rendering.                                  */
/* -------------------------------------------------------------------------- */

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    console.warn(
      '[SafeClerkProvider] Clerk failed to initialize. The app will render without authentication.',
      error.message
    )
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <>
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                background: '#fef3c7',
                color: '#92400e',
                padding: '8px 16px',
                fontSize: '13px',
                textAlign: 'center',
                borderBottom: '1px solid #fbbf24',
              }}
            >
              <strong>Clerk auth unavailable</strong> — La instancia de Clerk no
              pudo cargarse ({this.state.error?.message}). La app funciona sin
              autenticacion en modo desarrollo.
            </div>
          )}
          {this.props.children}
        </>
      )
    }

    return this.props.children
  }
}

export default function SafeClerkProvider({ children }: Props) {
  return (
    <ClerkErrorBoundary>
      <ClerkProvider>
        {children}
      </ClerkProvider>
    </ClerkErrorBoundary>
  )
}
