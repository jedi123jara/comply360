'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createQueryClient } from '@/lib/query-client'

/**
 * React Query provider for COMPLY360.
 * Creates a stable QueryClient per component instance (safe for SSR).
 * Includes ReactQueryDevtools in development mode.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  )
}
