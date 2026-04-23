import type { ReactNode } from 'react'

export const metadata = {
  title: 'Calculadora de Multas SUNAFIL 2026 — ¿Cuánto te costaría?',
  description:
    'Calcula el monto de una multa laboral SUNAFIL conforme a D.S. 019-2006-TR. Con descuento de subsanación voluntaria (–90%). UIT 2026 = S/ 5,500.',
  keywords: [
    'multa sunafil',
    'calculadora multas sunafil',
    'd.s. 019-2006-tr',
    'subsanación voluntaria',
    'uit 2026',
    'régimen mype multas',
  ],
  alternates: { canonical: 'https://comply360.pe/calculadoras/multa-sunafil' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
