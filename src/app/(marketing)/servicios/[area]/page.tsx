import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, GraduationCap } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import { capacitacionPorSlug } from '@/lib/sitio/capacitaciones'
import { obligacionesDeArea } from '@/lib/sitio/obligaciones'
import { SERVICIOS_PRECIO_FIJO, TRAMOS_TAMANO, soles } from '@/lib/sitio/planes'
import { construirMetadata, servicioLd } from '@/lib/sitio/seo'
import { AREAS_SERVICIO, areaPorSlug, type SlugArea } from '@/lib/sitio/servicios'
import { CTA } from '@/lib/sitio/site'

const TITULO_LEY: Record<SlugArea, string> = {
  sst: 'Obligaciones de SST según el tamaño de tu empresa',
  hostigamiento: 'Obligaciones frente al hostigamiento sexual',
  laboral: 'Obligaciones laborales según el tamaño de tu empresa',
}

// Solo existen los slugs del catálogo: cualquier otro responde 404 real (no soft 404).
export const dynamicParams = false

export function generateStaticParams() {
  return AREAS_SERVICIO.map((a) => ({ area: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area: slug } = await params
  const area = areaPorSlug(slug)
  if (!area) return { title: 'Servicio no encontrado' }
  return construirMetadata({
    titulo: area.metaTitulo,
    descripcion: area.metaDescripcion,
    ruta: `/servicios/${area.slug}`,
    keywords: area.keywords,
  })
}

export default async function AreaServicioPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: slug } = await params
  const area = areaPorSlug(slug)
  if (!area) notFound()

  const obligaciones = obligacionesDeArea(...area.areasObligacion)
  const precio = SERVICIOS_PRECIO_FIJO.find((s) => s.servicio === area.servicioPrecio)
  const capacitaciones = area.capacitaciones
    .map((s) => capacitacionPorSlug(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
  const ruta = `/servicios/${area.slug}`

  return (
    <>
      <JsonLd
        data={servicioLd({
          nombre: area.titulo,
          descripcion: area.metaDescripcion,
          ruta,
          tipo: area.metaTitulo,
          precioDesde: precio?.precios[0],
        })}
      />
      <PublicHero
        align="left"
        eyebrow={area.nombreCorto}
        title={area.titulo}
        description={area.resumen}
        media={
          <Breadcrumbs
            items={[
              { nombre: 'Servicios', ruta: '/servicios' },
              { nombre: area.nombreCorto, ruta },
            ]}
            className="mb-0"
          />
        }
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href={`/contacto?interes=implementacion`} className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Pide una cotización
          </Link>
        </div>
      </PublicHero>

      <section className="bg-[#ffffff]" aria-labelledby="por-que">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1fr_1.2fr]')}>
          <SectionHeader id="por-que" kicker="Por qué importa" titulo="Lo que está en juego" />
          <ul className="grid gap-4">
            {area.porQueImporta.map((texto) => (
              <li key={texto} className={cn(pub.inset, 'flex items-start gap-3 p-4')}>
                <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
                <span className="text-[0.95rem] leading-7 text-[#0B1B36]">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="ley">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="ley"
            kicker="Qué exige la ley"
            titulo={TITULO_LEY[area.slug]}
            bajada="Verificado con el texto vigente. La falta es la del reglamento de inspección (D.S. 019-2006-TR)."
          />
          <div className={cn(pub.card, 'mt-8 overflow-x-auto')}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Obligaciones y base legal</caption>
              <thead>
                <tr className="border-b border-[#E5EAF2] bg-[#F5F7FB] text-xs uppercase tracking-[0.08em] text-[#5A6A80]">
                  <th scope="col" className="px-4 py-3 font-bold">Desde</th>
                  <th scope="col" className="px-4 py-3 font-bold">Obligación</th>
                  <th scope="col" className="px-4 py-3 font-bold">Base legal</th>
                  <th scope="col" className="px-4 py-3 font-bold">Falta</th>
                  <th scope="col" className="px-4 py-3 font-bold">Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF2] align-top">
                {obligaciones.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#0B1B36]">{o.desde}</td>
                    <th scope="row" className="normal-case text-sm tracking-normal px-4 py-3 font-semibold text-[#0B1B36]">
                      {o.obligacion}
                      {o.nota ? <span className="mt-1 block text-xs font-normal text-[#5A6A80]">{o.nota}</span> : null}
                    </th>
                    <td className="px-4 py-3 text-[#475569]">{o.base}</td>
                    <td className="px-4 py-3 text-[#475569]">{o.falta}</td>
                    <td className="px-4 py-3 text-[#475569]">{o.evidencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/obligaciones" className={cn(pub.linkMore, 'mt-5 text-sm')}>
            Ver todas las obligaciones de tu empresa <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-[#ffffff]" aria-labelledby="que-hacemos">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader id="que-hacemos" kicker="Qué hacemos" titulo="Cómo lo dejamos funcionando" />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {area.queHacemos.map((paso, i) => (
              <li key={paso.titulo} className={cn(pub.card, 'p-6')}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1B36] text-sm font-extrabold text-[#F5B301]">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{paso.titulo}</h3>
                <p className={cn(pub.body, 'mt-2')}>{paso.detalle}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="recibes">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-2')}>
          <div>
            <SectionHeader id="recibes" kicker="Qué recibes" titulo="Entregables" />
            <ul className="mt-6 grid gap-3">
              {area.entregables.map((e) => (
                <li key={e} className="flex items-start gap-2.5 text-[0.95rem] text-[#0B1B36]">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
          {precio ? (
            <div className={cn(pub.card, 'p-6 sm:p-8')}>
              <p className={pub.kicker}>Precio de implementación</p>
              <p className="mt-1 text-sm text-[#475569]">Pago único, más IGV</p>
              <dl className="mt-5 divide-y divide-[#E5EAF2]">
                {precio.precios.map((monto, i) => (
                  <div key={TRAMOS_TAMANO[i]} className="flex items-center justify-between py-3">
                    <dt className="text-sm font-semibold text-[#475569]">{TRAMOS_TAMANO[i]}</dt>
                    <dd className="text-xl font-extrabold tabular-nums text-[#0B1B36]">{soles(monto)}</dd>
                  </div>
                ))}
              </dl>
              <p className={cn(pub.body, 'mt-4')}>
                Para mantenerlo al día, la iguala mensual va desde S/ 390 + IGV.{' '}
                <Link href="/planes" className={pub.link}>
                  Ver planes
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {capacitaciones.length > 0 ? (
        <section className="bg-[#ffffff]" aria-labelledby="capacitaciones">
          <div className={cn(pub.container, pub.section)}>
            <SectionHeader id="capacitaciones" kicker="Capacitaciones relacionadas" titulo="Las capacitaciones que van con este servicio" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {capacitaciones.map((c) => (
                <Link key={c.slug} href={`/capacitaciones/${c.slug}`} className={cn(pub.card, pub.cardHover, 'flex flex-col p-5')}>
                  <GraduationCap aria-hidden className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-3 text-base font-extrabold text-[#0B1B36]">{c.nombre}</h3>
                  <p className={cn(pub.faint, 'mt-2 flex-1')}>{c.frecuencia}</p>
                  <span className={cn(pub.linkMore, 'mt-3 text-sm')}>
                    Ver temario <ArrowRight aria-hidden className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(pub.container, pub.section)}>
        <Faq faqs={area.faqs} />
      </div>

      <CtaBand mensajeWhatsapp={`Hola, quiero información sobre el servicio de ${area.nombreCorto} de Comply360.`} />
    </>
  )
}
