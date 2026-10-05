import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

// Header, footer y fondo vienen del tema público compartido (mismo que
// calculadoras, diagnóstico y registro). `wide` deja espacio a la grilla de 5 planes.
export default function PlanesLayout({ children }: { children: ReactNode }) {
  return <PublicShell wide>{children}</PublicShell>
}
