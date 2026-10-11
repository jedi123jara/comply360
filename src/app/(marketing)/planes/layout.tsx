import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

// Mismo ancho que el resto del sitio: header, contenido y footer alineados.
export default function PlanesLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
