import type { ReactNode } from 'react'
import { CalculatorSchema } from '@/components/seo/calculator-schema'

export const metadata = {
  title: 'Matriz IPERC SUNAFIL 2026 — Calculadora de Nivel de Riesgo (gratis)',
  description:
    'Calcula el Nivel de Riesgo (NR = IP × IS) de una tarea con la matriz oficial SUNAFIL R.M. 050-2013-TR. Sin IA, sin estimaciones. La función pura que usa COMPLY360 internamente.',
  keywords: [
    'matriz iperc',
    'calculadora iperc',
    'r.m. 050-2013-tr',
    'manual iperc sunafil',
    'nivel de riesgo iperc',
    'probabilidad severidad sst',
    'ley 29783',
    'plantilla iperc peru',
  ],
  alternates: { canonical: 'https://comply360.pe/calculadoras/iperc' },
}

const FAQS = [
  {
    q: '¿Qué es la matriz IPERC?',
    a: 'IPERC = Identificación de Peligros, Evaluación y Control de Riesgos. Es la herramienta obligatoria por Ley 29783 Art. 21 para evaluar cada tarea de trabajo. SUNAFIL la exige en toda inspección de SST.',
  },
  {
    q: '¿Cómo se calcula el Nivel de Riesgo?',
    a: 'NR = Índice de Probabilidad (IP) × Índice de Severidad (IS). IP = A + B + C + D donde A es personas expuestas, B procedimientos, C capacitación, D exposición. Cada factor va de 1 a 3. NR final va de 4 a 36.',
  },
  {
    q: '¿Qué clasificación corresponde a cada NR?',
    a: 'Trivial (NR=4), Tolerable (5-8), Moderado (9-16), Importante (17-24), Intolerable (25-36). Moderado en adelante se considera "riesgo significativo" y obliga a documentar plan de control.',
  },
  {
    q: '¿La matriz IPERC es obligatoria?',
    a: 'Sí. La Ley 29783 Art. 21 obliga a toda empresa con 1+ trabajador a evaluar riesgos antes de cada tarea. R.M. 050-2013-TR estandariza el formato. Su ausencia es infracción muy grave.',
  },
  {
    q: '¿Cuándo debo actualizar el IPERC?',
    a: 'Anualmente como mínimo, y obligatorio cada vez que: cambias proceso, introduces equipo nuevo, ocurre accidente, hay cambio de personal en puesto crítico, o tras inspección SUNAFIL.',
  },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CalculatorSchema
        name="Calculadora de Matriz IPERC SUNAFIL Perú 2026"
        description="Calcula el Nivel de Riesgo (NR) de una tarea según la matriz oficial Probabilidad × Severidad de SUNAFIL (R.M. 050-2013-TR). Tabla 11 con clasificación oficial Trivial/Tolerable/Moderado/Importante/Intolerable."
        path="/calculadoras/iperc"
        category="Seguridad y Salud en el Trabajo"
        faqs={FAQS}
      />
      {children}
    </>
  )
}
