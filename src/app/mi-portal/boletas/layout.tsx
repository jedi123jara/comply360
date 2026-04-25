import type { ReactNode } from 'react'

// Saltea prerender — la página depende de sesión Clerk + datos del worker.
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
