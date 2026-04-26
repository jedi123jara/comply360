import type { ReactNode } from 'react'
import { CalculatorSchema } from '@/components/seo/calculator-schema'

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

const FAQS = [
  {
    q: '¿Cuánto cuesta una multa SUNAFIL en 2026?',
    a: 'Las multas van de 0.045 UIT (leve, microempresa, 1 trabajador = S/ 248) hasta 52.53 UIT (muy grave, no MYPE, 1000+ trabajadores = S/ 288,915). Se calculan según el cuadro D.S. 019-2006-TR con UIT 2026 = S/ 5,500.',
  },
  {
    q: '¿Qué descuento da la subsanación voluntaria?',
    a: 'Si subsanas la infracción ANTES de iniciada la inspección, la multa baja 90% (Art. 40 Ley 28806). Si subsanas DURANTE la inspección, hasta 70% de descuento.',
  },
  {
    q: '¿Cómo varía la multa según el tamaño de la empresa?',
    a: 'Hay 3 tarifas: Microempresa (más baja), Pequeña empresa, y No MYPE (más alta). Por ejemplo, una infracción muy grave a 100 trabajadores cuesta S/ 22,000 en microempresa vs S/ 165,000 en no-MYPE.',
  },
  {
    q: '¿Qué es una infracción "muy grave"?',
    a: 'Las muy graves incluyen: trabajo de niños, no pago de remuneraciones, accidente fatal por incumplir SST, hostigamiento sexual no atendido. Las leves incluyen: faltas de registro, documentación incompleta.',
  },
  {
    q: '¿La reincidencia aumenta la multa?',
    a: 'Sí. La reincidencia en 6 meses incrementa la multa en 50%. SUNAFIL la marca explícitamente en el acta de inspección.',
  },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CalculatorSchema
        name="Calculadora de Multas SUNAFIL Perú 2026"
        description="Calcula el monto exacto de una multa laboral SUNAFIL con UIT 2026 (S/ 5,500). Cuadro oficial D.S. 019-2006-TR + descuento por subsanación 90%."
        path="/calculadoras/multa-sunafil"
        category="Inspección y Multas"
        faqs={FAQS}
      />
      {children}
    </>
  )
}
