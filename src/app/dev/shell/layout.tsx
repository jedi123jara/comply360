import type { ReactNode } from 'react'

// Página dev sandbox — cliente-only, no tiene sentido prerender.
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
