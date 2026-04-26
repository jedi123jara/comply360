import type { ReactNode } from 'react'
import { CalculatorSchema } from '@/components/seo/calculator-schema'

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

const FAQS = [
  {
    q: '¿Cuándo se paga la CTS en Perú?',
    a: 'La CTS se deposita en dos cuotas semestrales: antes del 15 de mayo (cubre noviembre-abril) y antes del 15 de noviembre (cubre mayo-octubre), conforme al D.S. 001-97-TR.',
  },
  {
    q: '¿Cómo se calcula la CTS?',
    a: 'La fórmula es: (Remuneración computable / 12) × meses + (Remuneración computable / 360) × días. La remuneración computable incluye sueldo bruto + asignación familiar + 1/6 de la última gratificación.',
  },
  {
    q: '¿Quiénes tienen derecho a CTS?',
    a: 'Los trabajadores del régimen general (D.Leg. 728) con jornada mínima de 4 horas diarias. Los trabajadores MYPE Micro NO tienen CTS; los MYPE Pequeña tienen 50%.',
  },
  {
    q: '¿La asignación familiar entra al cálculo de CTS?',
    a: 'Sí. La asignación familiar (10% RMV = S/ 113 en 2026) se suma a la remuneración computable cuando el trabajador tiene hijos menores de 18 años (o hasta 24 si estudian).',
  },
  {
    q: '¿Qué pasa si no se deposita la CTS a tiempo?',
    a: 'El empleador debe pagar intereses legales laborales (D.Ley 25920) desde el día siguiente al vencimiento. Además SUNAFIL puede multar hasta 26.12 UIT por infracción muy grave.',
  },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CalculatorSchema
        name="Calculadora de CTS Perú 2026"
        description="Calcula tu CTS gratis con la fórmula oficial D.S. 001-97-TR. Sueldo + asignación familiar + 1/6 gratificación. Resultado al instante."
        path="/calculadoras/cts"
        category="Beneficios Sociales"
        faqs={FAQS}
      />
      {children}
    </>
  )
}
