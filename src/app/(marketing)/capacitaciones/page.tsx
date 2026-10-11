import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
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
    titulo: 'Comply360 organiza',
    texto: 'Armamos contigo el cronograma anual según tu IPERC, coordinamos fechas y grupos, y respondemos por la calidad.',
  },
  {
    titulo: 'Un especialista competente dicta',
    texto:
      'El reglamento de SST permite que un tercero capacite si son profesionales competentes y con experiencia (arts. 28 y 29). Cada tema lo dicta el especialista que corresponde.',
  },
  {
    titulo: 'Tú recibes la evidencia',
    texto: 'En una inspección se revisa la prueba de cada capacitación. Te entregamos el archivo completo, listo para mostrar.',
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

const celdaCabecera = 'py-4 pr-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]'

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

      <HeroPagina
        migas={[{ nombre: 'Capacitaciones', ruta: '/capacitaciones' }]}
        etiqueta="Capacitaciones"
        titulo={
          <>
            Capacitaciones obligatorias, <span className="text-[#F5B301]">con la evidencia que pide el inspector</span>
          </>
        }
        bajada="Las 4 de SST, la inducción, el comité, hostigamiento sexual, brigadas y RRHH. Las dictan especialistas competentes y tú recibes el archivo completo."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Plan Anual', valor: 'S/ 3,300 + IGV al año, o S/ 275 al mes' },
              { etiqueta: 'Sesión suelta', valor: 'S/ 600 + IGV in-company' },
              { etiqueta: 'Modalidad', valor: 'Presencial en La Libertad · virtual en vivo en todo el Perú' },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={CTA.cotizar.href} className={pub.btnPrimaryLg}>
            {CTA.cotizar.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <a href="#catalogo" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver el catálogo
          </a>
        </div>
      </HeroPagina>

      {/* 01 — Cómo funciona */}
      <Seccion id="como-funciona" numero="01" etiqueta="Cómo funciona" titulo="Tú no buscas instructores ni armas carpetas">
        <ol className="grid gap-10 border-t border-[#0B1B36] pt-8 lg:grid-cols-3 lg:gap-8">
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <span className="text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{p.titulo}</h3>
              <p className="mt-3 text-[0.98rem] leading-7 text-[#475569]">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 02 — Plan Anual */}
      <Seccion
        id="plan-anual"
        numero="02"
        etiqueta="Plan Anual"
        tono="claro"
        titulo="Todo el año resuelto, en un solo contrato"
        bajada="En lugar de charlas sueltas, resolvemos el año completo con la evidencia de cada sesión."
      >
        <div className="grid gap-12 xl:grid-cols-[1.1fr_1fr] xl:items-start">
          <ul className="border-t border-[#0B1B36]">
            {PLAN_ANUAL.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-[#D9E0EA] py-4 text-[1.02rem] text-[#0B1B36]">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#B45309]" />
                {item}
              </li>
            ))}
          </ul>
          <aside className="rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">Plan Anual de Capacitaciones</p>
            <p className="mt-5 text-5xl font-extrabold tracking-[-0.04em] tabular-nums">S/ 3,300</p>
            <p className="mt-2 text-sm text-[#94A3B8]">al año + IGV, o S/ 275 al mes</p>
            <p className="mt-6 border-t border-[#ffffff]/10 pt-6 text-[0.98rem] leading-7 text-[#CBD5E1]">
              Seis sesiones in-company de hasta 25 personas. Si tienes iguala, cuesta 15% menos.
            </p>
            <Link href={CTA.cotizar.href} className={cn(pub.btnPrimary, 'mt-8 w-full')}>
              {CTA.cotizar.label} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </Seccion>

      {/* 03 — Catálogo */}
      <Seccion
        id="catalogo"
        numero="03"
        etiqueta="Catálogo"
        titulo="Todas las capacitaciones"
        bajada="Las que tienen enlace tienen ficha con temario y precio. Las demás las organizamos a pedido con el especialista que corresponde."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-t border-[#0B1B36] text-left">
            <caption className="sr-only">Catálogo de capacitaciones</caption>
            <thead>
              <tr className="border-b border-[#E1E7F0]">
                <th scope="col" className={cn(celdaCabecera, 'w-[34%]')}>Capacitación</th>
                <th scope="col" className={celdaCabecera}>Para quién</th>
                <th scope="col" className={celdaCabecera}>Frecuencia</th>
                <th scope="col" className={cn(celdaCabecera, 'pr-0')}>Modalidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E7F0] align-top">
              {CATALOGO_RESUMEN.map((c) => (
                <tr key={c.nombre}>
                  <th scope="row" className="normal-case py-5 pr-6 text-[0.98rem] font-semibold leading-6 tracking-normal text-[#0B1B36]">
                    {c.slug ? (
                      <Link href={`/capacitaciones/${c.slug}`} className="underline decoration-[#C9D1DD] underline-offset-4 transition-colors hover:decoration-[#0B1B36]">
                        {c.nombre}
                      </Link>
                    ) : (
                      c.nombre
                    )}
                    {c.disponibilidad === 'A pedido' ? (
                      <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A97AB]">A pedido</span>
                    ) : null}
                  </th>
                  <td className="py-5 pr-6 text-sm leading-6 text-[#475569]">{c.para}</td>
                  <td className="py-5 pr-6 text-sm leading-6 text-[#475569]">{c.frecuencia}</td>
                  <td className="py-5 text-sm leading-6 text-[#475569]">{c.modalidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* 04 — La evidencia */}
      <Seccion
        id="evidencia"
        numero="04"
        etiqueta="La evidencia"
        tono="claro"
        titulo="Lo que te entregamos de cada sesión"
        bajada="Es lo que revisa el inspector cuando pide demostrar que capacitaste."
      >
        <ul className="grid border-t border-[#0B1B36] sm:grid-cols-2 sm:gap-x-10">
          {EVIDENCIA_ENTREGADA.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-[#D9E0EA] py-4 text-[1.02rem] text-[#0B1B36]">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#B45309]" />
              {item}
            </li>
          ))}
        </ul>
      </Seccion>

      {/* 05 — Precios */}
      <Seccion id="precios" numero="05" etiqueta="Precios" titulo="Cuánto cuesta" bajada="Todos los precios son más IGV.">
        <dl className="border-t border-[#0B1B36]">
          {PRECIOS_CAPACITACION.map((p) => (
            <div key={p.producto} className="grid gap-1 border-b border-[#E1E7F0] py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
              <dt>
                <span className="block text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{p.producto}</span>
                {p.detalle ? <span className="mt-1 block text-sm text-[#5A6A80]">{p.detalle}</span> : null}
              </dt>
              <dd className="text-lg font-extrabold tracking-[-0.02em] text-[#0B1B36] sm:text-right">{p.precio}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      {/* 06 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="06" etiqueta="Preguntas frecuentes" tono="claro" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand
        titulo="¿Armamos tu plan de capacitaciones del año?"
        texto="Cuéntanos cuántos trabajadores tienes y en qué sedes, y te enviamos el cronograma con su precio."
        mensajeWhatsapp="Hola, quiero cotizar el Plan Anual de Capacitaciones de Comply360."
      />
    </>
  )
}
