import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardList, FileCheck2, UserCheck } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import { CATALOGO_RESUMEN, EVIDENCIA_ENTREGADA } from '@/lib/sitio/capacitaciones'
import { PRECIOS_CAPACITACION } from '@/lib/sitio/planes'
import { construirMetadata } from '@/lib/sitio/seo'
import { CTA, SITE_URL } from '@/lib/sitio/site'

const DESCRIPCION =
  'Capacitaciones obligatorias para empresas: las 4 de SST, inducción, comité, hostigamiento sexual y brigadas, con especialistas y la evidencia lista para SUNAFIL.'

export const metadata: Metadata = construirMetadata({
  titulo: 'Capacitaciones obligatorias para empresas',
  descripcion: DESCRIPCION,
  ruta: '/capacitaciones',
  keywords: [
    'capacitaciones obligatorias empresas',
    'capacitación SST Trujillo',
    'plan anual de capacitación SST',
    'capacitación hostigamiento sexual',
    'capacitación brigadas',
  ],
})

const PASOS = [
  {
    icono: ClipboardList,
    titulo: 'Comply360 organiza',
    texto: 'Armamos contigo el cronograma anual según tu IPERC, coordinamos fechas y grupos, y respondemos por la calidad.',
  },
  {
    icono: UserCheck,
    titulo: 'Un especialista competente dicta',
    texto:
      'El reglamento de SST permite que un tercero capacite si son profesionales competentes y con experiencia (arts. 28 y 29). Cada tema lo dicta el especialista que corresponde.',
  },
  {
    icono: FileCheck2,
    titulo: 'Tú recibes la evidencia',
    texto: 'El inspector no pregunta si capacitaste: pide la prueba. Te entregamos el archivo completo, listo para mostrar.',
  },
] as const

const PLAN_ANUAL = [
  'Las 4 capacitaciones de SST del año',
  'La capacitación anual especializada de hostigamiento sexual',
  'La capacitación de brigadas de emergencia',
  'Cronograma anual acordado al firmar',
  'Toda la evidencia de cada sesión',
] as const

const FAQS = [
  {
    pregunta: '¿Qué capacitaciones son obligatorias para una empresa en Perú?',
    respuesta:
      'Como mínimo: la inducción de SST al ingresar, al menos 4 capacitaciones de SST al año (Ley 29783, art. 35 b), y en hostigamiento sexual una al inicio de la relación laboral y una anual especializada para RRHH y el comité (D.S. 014-2019-MIMP, art. 11).',
  },
  {
    pregunta: '¿Pueden ser virtuales?',
    respuesta:
      'La inducción y las capacitaciones por cambio de puesto o tecnología deben ser presenciales. Las demás pueden darse por otros medios (Reglamento de SST, art. 27-A).',
  },
  {
    pregunta: '¿Entregan certificado?',
    respuesta:
      'Entregamos constancias de capacitación firmadas por el instructor y Comply360, más el registro y la asistencia, que es lo que revisa el inspector. Son constancias privadas, no certificados emitidos por el Estado.',
  },
  {
    pregunta: '¿Quién paga la capacitación y en qué horario?',
    respuesta: 'La empresa. La capacitación de SST va dentro de la jornada de trabajo y su costo nunca lo asume el trabajador.',
  },
  {
    pregunta: '¿Atienden fuera de Trujillo?',
    respuesta:
      'Las capacitaciones presenciales las damos en La Libertad. Las virtuales en vivo, en todo el Perú. Para otras regiones, consúltanos.',
  },
]

export default function CapacitacionesPage() {
  const conPagina = CATALOGO_RESUMEN.filter((c) => c.slug)
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Capacitaciones obligatorias para empresas',
          itemListElement: conPagina.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/capacitaciones/${c.slug}`,
            name: c.nombre,
          })),
        }}
      />
      <PublicHero
        align="left"
        eyebrow="Capacitaciones"
        title={
          <>
            Capacitaciones obligatorias para empresas,{' '}
            <span className={pub.highlightOnNavy}>con la evidencia que pide el inspector</span>
          </>
        }
        description="Las 4 de SST, la inducción, el comité, hostigamiento sexual y brigadas. Las dictan especialistas competentes y tú recibes el archivo completo."
        media={<Breadcrumbs items={[{ nombre: 'Capacitaciones', ruta: '/capacitaciones' }]} className="mb-0" />}
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href={CTA.cotizar.href} className={pub.btnPrimaryLg}>
            {CTA.cotizar.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <a href="#catalogo" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver el catálogo
          </a>
        </div>
      </PublicHero>

      <section className="bg-[#ffffff]" aria-labelledby="como-funciona">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader id="como-funciona" kicker="Cómo funciona" titulo="Tú no buscas instructores ni armas carpetas" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PASOS.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className={cn(pub.card, 'p-6')}>
                <span className={pub.iconBox}>
                  <Icono aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{titulo}</h3>
                <p className={cn(pub.body, 'mt-2')}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="plan-anual">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start')}>
          <div>
            <SectionHeader
              id="plan-anual"
              kicker="El producto estrella"
              titulo="Plan Anual de Capacitaciones"
              bajada="No vendemos charlas sueltas: te resolvemos el año completo, con la evidencia de cada sesión."
            />
            <ul className="mt-6 grid gap-3">
              {PLAN_ANUAL.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.95rem] text-[#0B1B36]">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(pub.card, 'p-6 sm:p-8')}>
            <p className={pub.kicker}>Precio</p>
            <p className="mt-2 text-4xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">S/ 3,300</p>
            <p className={cn(pub.body, 'mt-1')}>al año + IGV, o S/ 275 al mes. 6 sesiones in-company de hasta 25 personas. Con iguala, 15% menos.</p>
            <Link href={CTA.cotizar.href} className={cn(pub.btnPrimary, 'mt-6 w-full')}>
              {CTA.cotizar.label} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="catalogo" className="scroll-mt-24 bg-[#ffffff]" aria-labelledby="catalogo-titulo">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="catalogo-titulo"
            kicker="Catálogo"
            titulo="Todas las capacitaciones"
            bajada="Las marcadas como disponibles tienen ficha con temario y precio. Las demás las organizamos a pedido con el especialista que corresponde."
          />
          <div className={cn(pub.card, 'mt-8 overflow-x-auto')}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Catálogo de capacitaciones</caption>
              <thead>
                <tr className="border-b border-[#E5EAF2] bg-[#F5F7FB] text-xs uppercase tracking-[0.08em] text-[#5A6A80]">
                  <th scope="col" className="px-4 py-3 font-bold">Capacitación</th>
                  <th scope="col" className="px-4 py-3 font-bold">Para quién</th>
                  <th scope="col" className="px-4 py-3 font-bold">Frecuencia</th>
                  <th scope="col" className="px-4 py-3 font-bold">Dicta</th>
                  <th scope="col" className="px-4 py-3 font-bold">Modalidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF2] align-top">
                {CATALOGO_RESUMEN.map((c) => (
                  <tr key={c.nombre}>
                    <th scope="row" className="normal-case text-sm tracking-normal px-4 py-3 font-semibold text-[#0B1B36]">
                      {c.slug ? (
                        <Link href={`/capacitaciones/${c.slug}`} className={pub.link}>
                          {c.nombre}
                        </Link>
                      ) : (
                        c.nombre
                      )}
                      {c.disponibilidad === 'A pedido' ? (
                        <span className="ml-2 inline-block rounded-full bg-[#F5F7FB] px-2 py-0.5 text-[11px] font-semibold text-[#5A6A80]">
                          A pedido
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-[#475569]">{c.para}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.frecuencia}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.dicta}</td>
                    <td className="px-4 py-3 text-[#475569]">{c.modalidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="evidencia">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-2')}>
          <div>
            <SectionHeader id="evidencia" kicker="La evidencia" titulo="Lo que te entregamos de cada sesión" />
            <ul className="mt-6 grid gap-3">
              {EVIDENCIA_ENTREGADA.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.95rem] text-[#0B1B36]">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader kicker="Precios" titulo="Cuánto cuesta" bajada="Todos los precios son más IGV." />
            <dl className={cn(pub.card, pub.divide, 'mt-6')}>
              {PRECIOS_CAPACITACION.map((p) => (
                <div key={p.producto} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="text-sm font-semibold text-[#0B1B36]">
                    {p.producto}
                    {p.detalle ? <span className="block text-xs font-normal text-[#5A6A80]">{p.detalle}</span> : null}
                  </dt>
                  <dd className="shrink-0 text-sm font-extrabold text-[#0B1B36]">{p.precio}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className={cn(pub.container, 'pb-4')}>
        <Faq faqs={FAQS} />
      </div>

      <CtaBand
        titulo="¿Armamos tu plan de capacitaciones del año?"
        texto="Cuéntanos cuántos trabajadores tienes y en qué sedes, y te enviamos el cronograma con su precio."
        mensajeWhatsapp="Hola, quiero cotizar el Plan Anual de Capacitaciones de Comply360."
      />
    </>
  )
}
