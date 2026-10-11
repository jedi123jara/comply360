import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { cn } from '@/lib/utils'
import { construirMetadata } from '@/lib/sitio/seo'

const CALCS = [
  {
    slug: 'cts',
    title: 'CTS: Compensación por Tiempo de Servicios',
    description: 'Calcula el depósito semestral de mayo o noviembre con la remuneración computable.',
    usage: 'D.S. 001-97-TR',
  },
  {
    slug: 'gratificacion',
    title: 'Gratificación',
    description: 'Gratificación de julio o diciembre y la bonificación extraordinaria del 9% (Ley 29351).',
    usage: 'Ley 27735',
  },
  {
    slug: 'multa-sunafil',
    title: 'Multa SUNAFIL',
    description: '¿Cuánto cuesta una infracción? Calcula la multa y el efecto de subsanar a tiempo.',
    usage: 'D.S. 019-2006-TR',
  },
  {
    slug: 'iperc',
    title: 'Matriz IPERC de SST',
    description: 'Calcula el nivel de riesgo de una tarea con la matriz oficial de probabilidad por severidad.',
    usage: 'R.M. 050-2013-TR',
  },
] as const

const RESTO = [
  'Diagnóstico de cumplimiento con la multa estimada de cada brecha',
  'Implementación de SST, hostigamiento sexual y documentos laborales',
  'Iguala mensual con alertas de vencimientos y consultas',
  'Capacitaciones obligatorias con especialistas y evidencia para SUNAFIL',
  'Acompañamiento si llega una inspección',
] as const

export const metadata: Metadata = construirMetadata({
  titulo: 'Calculadoras laborales gratuitas',
  descripcion:
    'CTS, gratificación, multas SUNAFIL y matriz IPERC: calculadoras laborales gratis, actualizadas con la UIT 2026 de S/ 5,500 y sin registro.',
  ruta: '/calculadoras',
  keywords: ['calculadora CTS 2026', 'calculadora gratificación', 'calculadora multa SUNAFIL', 'matriz IPERC', 'calculadoras laborales Perú'],
})

export default function CalculadorasIndex() {
  return (
    <>
      <HeroPagina
        migas={[{ nombre: 'Calculadoras', ruta: '/calculadoras' }]}
        etiqueta="Gratis, sin registro"
        titulo={
          <>
            Calculadoras <span className="text-[#F5B301]">laborales</span>
          </>
        }
        bajada="CTS, gratificación, multas SUNAFIL y matriz IPERC, con la base legal a la vista y actualizadas con la UIT 2026."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Calculadoras', valor: `${CALCS.length} herramientas` },
              { etiqueta: 'Costo', valor: 'Gratis, sin crear cuenta' },
              { etiqueta: 'Referencia', valor: 'UIT 2026: S/ 5,500' },
            ]}
          />
        }
      />

      <Seccion id="calculadoras" numero="01" etiqueta="Herramientas" titulo="Elige qué quieres calcular">
        <ol className="border-t border-[#0B1B36]">
          {CALCS.map((c, i) => (
            <li key={c.slug} className="border-b border-[#E1E7F0]">
              <Link href={`/calculadoras/${c.slug}`} className="group grid grid-cols-[3rem_1fr_auto] gap-x-4 py-8">
                <span className="pt-1.5 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block text-[1.4rem] font-extrabold tracking-[-0.02em] text-[#0B1B36]">{c.title}</span>
                  <span className="mt-2 block max-w-2xl text-[1.02rem] leading-7 text-[#475569]">{c.description}</span>
                  <span className="mt-3 block font-mono text-xs text-[#7C8BA3]">{c.usage}</span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="mt-2 h-5 w-5 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-[#5A6A80]">
          Los resultados son referenciales. Para decisiones sobre tu planilla, revisa el caso con tu contador o con nosotros.
        </p>
      </Seccion>

      <Seccion
        id="mas-alla"
        etiqueta="Más allá del cálculo"
        tono="oscuro"
        titulo={
          <>
            Un cálculo es <span className="text-[#F5B301]">una parte</span> del cumplimiento
          </>
        }
        bajada="Comply360 se encarga del resto."
      >
        <ul className="border-t border-[#ffffff]/15">
          {RESTO.map((f) => (
            <li key={f} className="flex items-start gap-3 border-b border-[#ffffff]/10 py-4 text-[1.02rem] text-[#CBD5E1]">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#F5B301]" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/diagnostico-gratis" className={pub.btnPrimaryLg}>
            Diagnóstico gratis <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/servicios" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver servicios
          </Link>
        </div>
      </Seccion>
    </>
  )
}
