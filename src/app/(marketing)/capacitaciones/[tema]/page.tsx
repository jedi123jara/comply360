import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import { CAPACITACIONES, EVIDENCIA_ENTREGADA, capacitacionPorSlug } from '@/lib/sitio/capacitaciones'
import { construirMetadata, cursoLd } from '@/lib/sitio/seo'

// Solo existen los slugs del catálogo: cualquier otro responde 404 real (no soft 404).
export const dynamicParams = false

export function generateStaticParams() {
  return CAPACITACIONES.map((c) => ({ tema: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ tema: string }> }): Promise<Metadata> {
  const { tema } = await params
  const c = capacitacionPorSlug(tema)
  if (!c) return { title: 'Capacitación no encontrada' }
  return construirMetadata({
    titulo: c.metaTitulo,
    descripcion: c.metaDescripcion,
    ruta: `/capacitaciones/${c.slug}`,
    keywords: c.keywords,
  })
}

export default async function CapacitacionPage({ params }: { params: Promise<{ tema: string }> }) {
  const { tema } = await params
  const c = capacitacionPorSlug(tema)
  if (!c) notFound()

  const ruta = `/capacitaciones/${c.slug}`
  const otras = CAPACITACIONES.filter((o) => o.slug !== c.slug).slice(0, 3)
  const ficha = [
    { etiqueta: 'Obligatoria para', valor: c.obligatoriaPara },
    { etiqueta: 'Frecuencia', valor: c.frecuencia },
    { etiqueta: 'Base legal', valor: c.baseLegal },
    { etiqueta: 'La dicta', valor: c.dicta },
    { etiqueta: 'Modalidad', valor: c.modalidad },
    { etiqueta: 'Duración', valor: c.duracion },
  ]

  return (
    <>
      <JsonLd
        data={cursoLd({
          nombre: c.titulo,
          descripcion: c.metaDescripcion,
          ruta,
          modalidad: c.modo,
          precioDesde: c.precioDesde,
        })}
      />
      <PublicHero
        align="left"
        eyebrow="Capacitación"
        title={c.titulo}
        description={c.resumen}
        media={
          <Breadcrumbs
            items={[
              { nombre: 'Capacitaciones', ruta: '/capacitaciones' },
              { nombre: c.nombre, ruta },
            ]}
            className="mb-0"
          />
        }
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/contacto?interes=capacitaciones" className={pub.btnPrimaryLg}>
            Cotiza esta capacitación <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/capacitaciones" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver el Plan Anual
          </Link>
        </div>
      </PublicHero>

      <section className="bg-[#ffffff]" aria-labelledby="ficha">
        <div className={cn(pub.container, pub.section, 'grid gap-8 lg:grid-cols-[1fr_1.1fr]')}>
          <div>
            <SectionHeader id="ficha" kicker="Ficha" titulo="Lo esencial" />
            <dl className={cn(pub.card, pub.divide, 'mt-6')}>
              {ficha.map((f) => (
                <div key={f.etiqueta} className="grid gap-1 px-5 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                  <dt className="text-sm font-bold text-[#0B1B36]">{f.etiqueta}</dt>
                  <dd className="text-sm text-[#475569]">{f.valor}</dd>
                </div>
              ))}
              <div className="grid gap-1 bg-[#FFF8E6] px-5 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-sm font-bold text-[#0B1B36]">Precio</dt>
                <dd className="text-sm font-semibold text-[#0B1B36]">{c.precio}</dd>
              </div>
            </dl>
          </div>
          <div>
            <SectionHeader kicker="Temario" titulo="Qué se ve en la sesión" />
            <ol className="mt-6 grid gap-3">
              {c.temario.map((t, i) => (
                <li key={t} className={cn(pub.inset, 'flex items-start gap-3 p-4')}>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B1B36] text-xs font-extrabold text-[#F5B301]">
                    {i + 1}
                  </span>
                  <span className="text-[0.95rem] leading-6 text-[#0B1B36]">{t}</span>
                </li>
              ))}
            </ol>
            {c.nota ? (
              <p className={cn(pub.note, 'mt-4 flex items-start gap-2')}>
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                {c.nota}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="evidencia">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="evidencia"
            kicker="La evidencia"
            titulo="Lo que te entregamos"
            bajada="En una inspección, el inspector no pregunta si capacitaste: pide la prueba. Te dejamos el archivo completo."
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {EVIDENCIA_ENTREGADA.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[0.95rem] text-[#0B1B36]">
                <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className={cn(pub.container, 'pb-4')}>
        <Faq faqs={c.faqs} />
      </div>

      <section className="bg-[#ffffff]" aria-labelledby="otras">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader id="otras" kicker="También te puede servir" titulo="Otras capacitaciones" />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {otras.map((o) => (
              <Link key={o.slug} href={`/capacitaciones/${o.slug}`} className={cn(pub.card, pub.cardHover, 'flex flex-col p-5')}>
                <h3 className="text-base font-extrabold text-[#0B1B36]">{o.nombre}</h3>
                <p className={cn(pub.faint, 'mt-2 flex-1')}>{o.frecuencia}</p>
                <span className={cn(pub.linkMore, 'mt-3 text-sm')}>
                  Ver ficha <ArrowRight aria-hidden className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        titulo="¿La programamos en tu empresa?"
        texto="Dinos cuántas personas participan y en qué sede, y te enviamos fecha y precio."
        mensajeWhatsapp={`Hola, quiero cotizar la capacitación "${c.nombre}" de Comply360.`}
      />
    </>
  )
}
