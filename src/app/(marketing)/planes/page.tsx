import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import {
  PLANES_IGUALA,
  PRECIOS_CAPACITACION,
  PRECIOS_DEFENSA,
  SERVICIOS_PRECIO_FIJO,
  TRAMOS_TAMANO,
  soles,
} from '@/lib/sitio/planes'
import { ORGANIZACION_REF, construirMetadata } from '@/lib/sitio/seo'
import { CTA, SITE_URL } from '@/lib/sitio/site'

export const metadata: Metadata = construirMetadata({
  titulo: 'Planes y precios: iguala, SST y capacitaciones',
  descripcion:
    'Iguala mensual desde S/ 390, implementación de SST desde S/ 1,500 y Plan Anual de Capacitaciones a S/ 3,300, todo más IGV. Precios claros antes de empezar.',
  ruta: '/planes',
  keywords: ['precio asesoría laboral empresas', 'iguala laboral precio', 'precio implementación SST', 'precio capacitación SST', 'cuánto cuesta un consultor SST'],
})

const FAQS = [
  {
    pregunta: '¿Los precios incluyen IGV?',
    respuesta: 'No. Todos los precios de esta página son más IGV.',
  },
  {
    pregunta: '¿Cómo se paga?',
    respuesta:
      'La iguala es un contrato anual con pago mensual por adelantado. Los proyectos de implementación se pagan 50% al empezar y 50% al entregar.',
  },
  {
    pregunta: '¿Por qué un precio distinto según el número de trabajadores?',
    respuesta:
      'Porque las obligaciones crecen con el tamaño: desde 20 trabajadores necesitas comités y reglamentos, y más trabajadores significa más registros y más capacitaciones.',
  },
  {
    pregunta: '¿Hay descuentos?',
    respuesta:
      'Los tres módulos de implementación juntos tienen 15% de descuento. El Plan Anual de Capacitaciones cuesta 15% menos si tienes iguala. Y el diagnóstico completo se descuenta si contratas la implementación dentro de 30 días.',
  },
  {
    pregunta: '¿Mi empresa tiene más de 250 trabajadores o varias sedes?',
    respuesta: 'Escríbenos y te preparamos una propuesta a medida.',
  },
]

export default function PlanesPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'OfferCatalog',
          name: 'Planes de iguala de Comply360',
          url: `${SITE_URL}/planes`,
          itemListElement: PLANES_IGUALA.map((p) => ({
            '@type': 'Offer',
            name: `Iguala ${p.nombre} (${p.para})`,
            price: p.precioMensual,
            priceCurrency: 'PEN',
            offeredBy: ORGANIZACION_REF,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: p.precioMensual,
              priceCurrency: 'PEN',
              unitText: 'MES',
              valueAddedTaxIncluded: false,
            },
          })),
        }}
      />
      <PublicHero
        align="left"
        wide
        eyebrow="Planes y precios"
        title={
          <>
            Sabes cuánto pagas <span className={pub.highlightOnNavy}>antes de empezar</span>
          </>
        }
        description="Iguala mensual para mantenerte en regla, precios fijos para ponerte al día y capacitaciones con evidencia. Todo más IGV."
        media={<Breadcrumbs items={[{ nombre: 'Planes', ruta: '/planes' }]} className="mb-0" />}
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </PublicHero>

      <section className="bg-[#ffffff]" aria-labelledby="iguala">
        <div className={cn(pub.containerWide, pub.section)}>
          <SectionHeader
            id="iguala"
            kicker="Iguala mensual"
            titulo="Planes para mantenerte en regla"
            bajada="Contrato anual con pago mensual. Elige según el número de trabajadores de tu empresa."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLANES_IGUALA.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  pub.card,
                  'relative flex flex-col p-6',
                  plan.destacado && 'border-2 border-[#F5B301] shadow-[0_18px_44px_rgba(245,179,1,0.18)]',
                )}
              >
                {plan.destacado ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#F5B301] px-3 py-1 text-xs font-bold text-[#0B1B36]">
                    Recomendado desde 20 trabajadores
                  </span>
                ) : null}
                <h3 className="text-xl font-extrabold tracking-[-0.01em] text-[#0B1B36]">{plan.nombre}</h3>
                <p className={cn(pub.faint, 'mt-1')}>{plan.para}</p>
                <p className="mt-5 text-4xl font-extrabold tracking-[-0.02em] text-[#0B1B36] tabular-nums">
                  {soles(plan.precioMensual)}
                </p>
                <p className={cn(pub.faint, 'mt-1')}>al mes + IGV</p>
                <ul className="mt-6 grid flex-1 gap-2.5">
                  {plan.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#0B1B36]">
                      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/contacto?interes=iguala`}
                  className={cn(plan.destacado ? pub.btnPrimary : pub.btnSecondary, 'mt-6 w-full')}
                >
                  Quiero este plan
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="fijos">
        <div className={cn(pub.containerWide, pub.section)}>
          <SectionHeader
            id="fijos"
            kicker="Precio fijo"
            titulo="Para ponerte al día"
            bajada="Pago único. Los tres módulos de implementación juntos tienen 15% de descuento."
          />
          <div className={cn(pub.card, 'mt-8 overflow-x-auto')}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Servicios de precio fijo por tamaño de empresa</caption>
              <thead>
                <tr className="border-b border-[#E5EAF2] bg-[#F5F7FB] text-xs uppercase tracking-[0.08em] text-[#5A6A80]">
                  <th scope="col" className="px-5 py-3 font-bold">Servicio</th>
                  {TRAMOS_TAMANO.map((t) => (
                    <th key={t} scope="col" className="px-5 py-3 text-right font-bold">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF2]">
                {SERVICIOS_PRECIO_FIJO.map((s) => (
                  <tr key={s.servicio}>
                    <th scope="row" className="normal-case text-sm tracking-normal px-5 py-3.5 font-semibold text-[#0B1B36]">
                      {s.servicio}
                    </th>
                    {s.precios.map((p, i) => (
                      <td key={TRAMOS_TAMANO[i]} className="px-5 py-3.5 text-right font-bold tabular-nums text-[#0B1B36]">
                        {soles(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn(pub.body, 'mt-4')}>
            El diagnóstico express es gratis. El completo se descuenta si contratas la implementación dentro de 30 días.
          </p>
        </div>
      </section>

      <section className="bg-[#ffffff]" aria-labelledby="capacitaciones-precios">
        <div className={cn(pub.containerWide, pub.section, 'grid gap-10 lg:grid-cols-2')}>
          <div>
            <SectionHeader id="capacitaciones-precios" kicker="Capacitaciones" titulo="Con la evidencia incluida" />
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
            <Link href="/capacitaciones" className={cn(pub.linkMore, 'mt-4 text-sm')}>
              Ver el catálogo de capacitaciones <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <SectionHeader kicker="Defensa ante SUNAFIL" titulo="Si llega el inspector" />
            <dl className={cn(pub.card, pub.divide, 'mt-6')}>
              {PRECIOS_DEFENSA.map((p) => (
                <div key={p.servicio} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="text-sm font-semibold text-[#0B1B36]">{p.servicio}</dt>
                  <dd className="shrink-0 text-sm font-extrabold text-[#0B1B36]">{p.precio}</dd>
                </div>
              ))}
            </dl>
            <p className={cn(pub.body, 'mt-4')}>Con iguala Integral o Corporativo, la defensa cuesta 20% a 30% menos.</p>
          </div>
        </div>
      </section>

      <div className={cn(pub.containerWide, pub.section)}>
        <Faq faqs={FAQS} />
      </div>

      <CtaBand titulo="¿No sabes qué plan te toca?" texto="Haz el diagnóstico gratis y te recomendamos el plan según tu tamaño y lo que te falta." />
    </>
  )
}
