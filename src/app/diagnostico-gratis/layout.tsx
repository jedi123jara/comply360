import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { construirMetadata } from '@/lib/sitio/seo'

// La página es interactiva (client component): la metadata vive aquí.
export const metadata: Metadata = construirMetadata({
  titulo: 'Diagnóstico de cumplimiento laboral gratis',
  descripcion:
    'Responde un cuestionario corto y descubre qué le falta a tu empresa en lo laboral, SST y hostigamiento sexual, y cuánto arriesga en multas SUNAFIL. Gratis.',
  ruta: '/diagnostico-gratis',
  keywords: ['diagnóstico SUNAFIL gratis', 'autodiagnóstico laboral', 'checklist inspección SUNAFIL', 'diagnóstico SST empresa'],
})

export default function DiagnosticoGratisLayout({ children }: { children: ReactNode }) {
  return children
}
