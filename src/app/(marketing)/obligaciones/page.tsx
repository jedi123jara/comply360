import type { Metadata } from 'next'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { ObligacionesExplorer } from '@/components/sitio/obligaciones-explorer'
import { SectionHeader } from '@/components/sitio/section-header'
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
      <PublicHero
        align="left"
        eyebrow="Herramienta gratis"
        title={
          <>
            ¿Qué obligaciones tiene tu empresa <span className={pub.highlightOnNavy}>según su tamaño?</span>
          </>
        }
        description="Indica cuántos trabajadores tienes y mira lo que te exige la ley en SST, hostigamiento sexual, laboral y más, con la base legal y la gravedad de cada falta."
        media={<Breadcrumbs items={[{ nombre: '¿Qué debo cumplir?', ruta: '/obligaciones' }]} className="mb-0" />}
      />

      <section aria-label="Explorador de obligaciones">
        <div className={cn(pub.container, pub.section)}>
          <ObligacionesExplorer />
          <p className={cn(pub.note, 'mt-8')}>
            Verificado con el texto vigente al 10 de octubre de 2026. Es una guía general: no reemplaza una revisión de tu
            caso. La gravedad corresponde al reglamento de inspección (D.S. 019-2006-TR) salvo que se indique otra
            autoridad.
          </p>
        </div>
      </section>

      <section className="bg-[#ffffff]" aria-labelledby="tabla-completa">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="tabla-completa"
            kicker="Referencia"
            titulo="Todas las obligaciones, con su base legal"
            bajada="La tabla completa, ordenada por área y por umbral."
          />
          {AREAS_OBLIGACION.map((area) => {
            const lista = OBLIGACIONES.filter((o) => o.area === area)
            return (
              <div key={area} className="mt-8">
                <h3 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{area}</h3>
                <div className={cn(pub.card, 'mt-3 overflow-x-auto')}>
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <caption className="sr-only">Obligaciones de {area}</caption>
                    <thead>
                      <tr className="border-b border-[#E5EAF2] bg-[#F5F7FB] text-xs uppercase tracking-[0.08em] text-[#5A6A80]">
                        <th scope="col" className="px-4 py-3 font-bold">Desde</th>
                        <th scope="col" className="px-4 py-3 font-bold">Obligación</th>
                        <th scope="col" className="px-4 py-3 font-bold">Base legal</th>
                        <th scope="col" className="px-4 py-3 font-bold">Falta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF2] align-top">
                      {lista.map((o) => (
                        <tr key={o.id}>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#0B1B36]">{o.desde}</td>
                          <th scope="row" className="normal-case text-sm tracking-normal px-4 py-3 font-semibold text-[#0B1B36]">
                            {o.obligacion}
                            {o.nota ? <span className="mt-1 block text-xs font-normal text-[#5A6A80]">{o.nota}</span> : null}
                          </th>
                          <td className="px-4 py-3 text-[#475569]">{o.base}</td>
                          <td className="px-4 py-3 text-[#475569]">{o.falta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className={cn(pub.container, pub.section)}>
        <Faq faqs={FAQS} />
      </div>

      <CtaBand titulo="¿Quieres saber cuáles cumples y cuáles no?" />
    </>
  )
}
