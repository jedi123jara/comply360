import type { ReactNode } from 'react'
import { CalculatorSchema } from '@/components/seo/calculator-schema'

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

const FAQS = [
  {
    q: '¿Cuándo se paga la gratificación en Perú?',
    a: 'Hay dos gratificaciones legales por año: julio (Fiestas Patrias) y diciembre (Navidad). Deben pagarse antes del 15 de julio y 15 de diciembre respectivamente, conforme a la Ley 27735.',
  },
  {
    q: '¿Cómo se calcula la gratificación?',
    a: 'Se paga 1 sueldo completo por cada gratificación si trabajaste el semestre completo. Si trabajaste menos, se prorratea por meses (1/6 del sueldo por cada mes completo trabajado en el semestre).',
  },
  {
    q: '¿Qué es la bonificación extraordinaria del 9%?',
    a: 'La Ley 29351 (extendida por Ley 30334) establece que el aporte de EsSalud (9%) se entrega al trabajador como bonificación extraordinaria, libre de descuentos. Aplica a ambas gratificaciones.',
  },
  {
    q: '¿Los trabajadores MYPE reciben gratificación?',
    a: 'MYPE Micro: NO reciben gratificación. MYPE Pequeña: reciben 50% de la gratificación legal. Régimen general: 100%.',
  },
  {
    q: '¿La asignación familiar entra a la gratificación?',
    a: 'Sí. La remuneración computable incluye sueldo bruto + asignación familiar (10% RMV) cuando aplica.',
  },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CalculatorSchema
        name="Calculadora de Gratificación Perú 2026"
        description="Gratificación julio + bonificación extraordinaria 9% calculadas según Ley 27735 y Ley 30334. Incluye prorrateo por meses trabajados."
        path="/calculadoras/gratificacion"
        category="Beneficios Sociales"
        faqs={FAQS}
      />
      {children}
    </>
  )
}
