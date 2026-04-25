import type { ReactNode } from 'react'

// Saltea prerender — la página es client-side interactiva (calculadora con
// estado). El SSR a demanda mantiene el SEO porque Google igual la indexa
// en el primer crawl.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calculadora de CTS 2026 — Compensación por Tiempo de Servicios',
  description:
    'Calculadora oficial de CTS actualizada con D.S. 001-97-TR y UIT/RMV 2026. Calcula tu depósito de mayo o noviembre paso a paso. Gratis, sin registro.',
  keywords: [
    'calculadora cts',
    'calculadora cts peru',
    'calcular cts 2026',
    'compensación por tiempo de servicios',
    'cts mayo',
    'cts noviembre',
    'd.s. 001-97-tr',
  ],
  alternates: { canonical: 'https://comply360.pe/calculadoras/cts' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
