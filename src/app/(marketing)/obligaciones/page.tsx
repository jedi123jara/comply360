import type { Metadata } from 'next'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { ObligacionesExplorer } from '@/components/sitio/obligaciones-explorer'
import { cn } from '@/lib/utils'
import { AREAS_OBLIGACION, OBLIGACIONES } from '@/lib/sitio/obligaciones'
import { construirMetadata } from '@/lib/sitio/seo'
import { SITE_URL } from '@/lib/sitio/site'

const DESCRIPCION =
  'Indica cuántos trabajadores tiene tu empresa y mira qué obligaciones laborales, de SST y de hostigamiento sexual te aplican, con base legal y gravedad de la falta.'

export const metadata: Metadata = construirMetadata({
  titulo: '¿Qué obligaciones tiene mi empresa? Herramienta gratis',
  descripcion: DESCRIPCION,
  ruta: '/obligaciones',
  keywords: [
    'obligaciones laborales de una empresa en Perú',
    'obligaciones del empleador según número de trabajadores',
    'obligaciones SST empresa',
    'checklist SUNAFIL',
    'qué debe cumplir una empresa',
  ],
})

const FAQS = [
  {
    pregunta: '¿Qué obligaciones tiene una empresa con menos de 20 trabajadores?',
    respuesta:
      'Entre otras: sistema de gestión de SST con IPERC y registros, supervisor de SST, 4 capacitaciones de SST al año, exámenes médicos ocupacionales, delegado de hostigamiento sexual, cuadro de categorías y funciones, control de asistencia y Seguro Vida Ley.',
  },
  {
    pregunta: '¿Qué cambia al llegar a 20 trabajadores?',
    respuesta:
      'Necesitas comité de SST paritario en lugar de supervisor, reglamento interno de SST, comité de intervención frente al hostigamiento sexual en lugar de delegado y política interna de hostigamiento.',
  },
  {
    pregunta: '¿Y con más de 50 o más de 100 trabajadores?',
    respuesta:
      'Con más de 50 se suma la cuota de empleo de personas con discapacidad del 3%. Con más de 100, el reglamento interno de trabajo.',
  },
  {
    pregunta: '¿Esta lista reemplaza una asesoría?',
    respuesta:
      'No. Es una guía general verificada con la norma vigente. Cada empresa tiene particularidades (régimen, sector, sedes); para saber qué cumples y qué no, haz el diagnóstico.',
  },
]

const celdaCabecera = 'py-4 pr-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]'

export default function ObligacionesPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: '¿Qué debe cumplir mi empresa?',
          url: `${SITE_URL}/obligaciones`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          inLanguage: 'es-PE',
          description: DESCRIPCION,
          offers: { '@type': 'Offer', price: 0, priceCurrency: 'PEN' },
        }}
      />

      <HeroPagina
        migas={[{ nombre: '¿Qué debo cumplir?', ruta: '/obligaciones' }]}
        etiqueta="Herramienta gratis"
        titulo={
          <>
            ¿Qué obligaciones tiene tu empresa <span className="text-[#F5B301]">según su tamaño?</span>
          </>
        }
        bajada="Indica cuántos trabajadores tienes y mira lo que te exige la ley en SST, hostigamiento sexual, laboral y más, con la base legal y la gravedad de cada falta."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Obligaciones', valor: `${OBLIGACIONES.length} verificadas con la norma vigente` },
              { etiqueta: 'Actualizado', valor: '10 de octubre de 2026' },
              { etiqueta: 'Costo', valor: 'Gratis, sin registrarte' },
            ]}
          />
        }
      />

      {/* 01 — La herramienta */}
      <Seccion id="herramienta" numero="01" etiqueta="La herramienta" titulo="Tu empresa, en un minuto">
        <ObligacionesExplorer />
        <p className="mt-10 max-w-3xl border-t border-[#E1E7F0] pt-6 text-sm leading-6 text-[#5A6A80]">
          Verificado con el texto vigente al 10 de octubre de 2026. Es una guía general y no reemplaza la revisión de tu
          caso. La gravedad corresponde al reglamento de inspección (D.S. 019-2006-TR), salvo que se indique otra
          autoridad.
        </p>
      </Seccion>

      {/* 02 — Referencia completa */}
      <Seccion
        id="referencia"
        numero="02"
        etiqueta="Referencia"
        tono="claro"
        titulo="Todas las obligaciones, con su base legal"
        bajada="La tabla completa, ordenada por área y por umbral."
      >
        <div className="grid gap-14">
          {AREAS_OBLIGACION.map((area) => {
            const lista = OBLIGACIONES.filter((o) => o.area === area)
            return (
              <div key={area}>
                <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{area}</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-t border-[#0B1B36] text-left">
                    <caption className="sr-only">Obligaciones de {area}</caption>
                    <thead>
                      <tr className="border-b border-[#D9E0EA]">
                        <th scope="col" className={cn(celdaCabecera, 'w-[18%]')}>Desde</th>
                        <th scope="col" className={celdaCabecera}>Obligación</th>
                        <th scope="col" className={cn(celdaCabecera, 'w-[24%]')}>Base legal</th>
                        <th scope="col" className={cn(celdaCabecera, 'w-[16%] pr-0')}>Falta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E0EA] align-top">
                      {lista.map((o) => (
                        <tr key={o.id}>
                          <td className="py-4 pr-6 text-sm font-semibold text-[#0B1B36]">{o.desde}</td>
                          <th scope="row" className="normal-case py-4 pr-6 text-[0.98rem] font-semibold leading-6 tracking-normal text-[#0B1B36]">
                            {o.obligacion}
                            {o.nota ? <span className="mt-1 block text-sm font-normal leading-6 text-[#5A6A80]">{o.nota}</span> : null}
                          </th>
                          <td className="py-4 pr-6 text-sm leading-6 text-[#5A6A80]">{o.base}</td>
                          <td className="py-4 text-sm font-semibold text-[#0B1B36]">{o.falta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </Seccion>

      {/* 03 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="03" etiqueta="Preguntas frecuentes" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand titulo="¿Quieres saber cuáles cumples y cuáles no?" />
    </>
  )
}
