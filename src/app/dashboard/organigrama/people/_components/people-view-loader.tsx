/**
 * Loader del Trombinoscopio. Hace dynamic import del client + monta los
 * providers necesarios (react-query) para que los hooks `useQuery` funcionen.
 *
 * El dashboard layout no monta QueryClientProvider globalmente, así que
 * envolvemos local en cada ruta del v2 que lo necesite.
 */
'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { QueryProvider } from '@/providers/query-provider'

const PeopleViewClient = dynamic(
  () => import('./people-view-client').then((m) => m.PeopleViewClient),
  { ssr: false },
)

export function PeopleViewLoader({ fallback }: { fallback: ReactNode }) {
  void fallback
  return (
    <QueryProvider>
      <PeopleViewClient />
    </QueryProvider>
  )
}
