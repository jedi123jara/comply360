import type { ReactNode } from 'react'

export const metadata = {
  title: 'Programa Consultor para Contadores — COMPLY360',
  description:
    'Gestiona compliance laboral de +25 empresas desde un solo dashboard. Más revenue sin más trabajo, marca blanca opcional, pricing especial para estudios contables.',
  keywords: [
    'comply360 contadores',
    'programa consultor',
    'contadores peru',
    'estudios contables',
    'compliance multi-empresa',
    'partner program',
  ],
  alternates: { canonical: 'https://comply360.pe/contadores' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
