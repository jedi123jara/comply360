import type { ReactNode } from 'react'

export const metadata = {
  title: 'Calculadora de Gratificación Julio/Diciembre 2026',
  description:
    'Calcula tu gratificación legal (Ley 27735) más la bonificación extraordinaria del 9% (Ley 29351). Actualizado 2026. Gratis, sin registro.',
  keywords: [
    'calculadora gratificación',
    'calcular grati peru',
    'gratificación julio',
    'gratificación diciembre',
    'bonificación extraordinaria 9%',
    'ley 27735',
  ],
  alternates: { canonical: 'https://comply360.pe/calculadoras/gratificacion' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
