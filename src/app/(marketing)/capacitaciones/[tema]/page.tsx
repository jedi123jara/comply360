import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
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
  const otras = CAPACITACIONES.filter((o) => o.slug !== c.slug).slice(0, 4)
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

      <HeroPagina
        migas={[
          { nombre: 'Capacitaciones', ruta: '/capacitaciones' },
          { nombre: c.nombre, ruta },
        ]}
        etiqueta="Capacitación"
        titulo={c.titulo}
        bajada={c.resumen}
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Precio', valor: c.precio },
              { etiqueta: 'Duración', valor: c.duracion },
              { etiqueta: 'Modalidad', valor: c.modalidad },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/contacto?interes=capacitaciones" className={pub.btnPrimaryLg}>
            Cotiza esta capacitación <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/capacitaciones#plan-anual" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver el Plan Anual
          </Link>
        </div>
      </HeroPagina>

      {/* 01 — La ficha */}
      <Seccion id="ficha" numero="01" etiqueta="La ficha" titulo="Lo esencial">
        <dl className="border-t border-[#0B1B36]">
          {ficha.map((f) => (
            <div key={f.etiqueta} className="grid gap-1 border-b border-[#E1E7F0] py-5 sm:grid-cols-[12rem_1fr] sm:gap-8">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB] sm:pt-1">{f.etiqueta}</dt>
              <dd className="text-[1.02rem] leading-7 text-[#0B1B36]">{f.valor}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      {/* 02 — Temario */}
      <Seccion id="temario" numero="02" etiqueta="Temario" tono="claro" titulo="Qué se ve en la sesión">
        <ol className="border-t border-[#0B1B36]">
          {c.temario.map((t, i) => (
            <li key={t} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#D9E0EA] py-5">
              <span className="pt-0.5 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[1.05rem] leading-7 text-[#0B1B36]">{t}</span>
            </li>
          ))}
        </ol>
        {c.nota ? <p className="mt-6 max-w-2xl text-sm leading-6 text-[#5A6A80]">{c.nota}</p> : null}
      </Seccion>

      {/* 03 — La evidencia */}
      <Seccion
        id="evidencia"
        numero="03"
        etiqueta="La evidencia"
        titulo="Lo que te entregamos"
        bajada="Es lo que revisa el inspector cuando pide demostrar que capacitaste."
      >
        <ul className="grid border-t border-[#0B1B36] sm:grid-cols-2 sm:gap-x-10">
          {EVIDENCIA_ENTREGADA.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-[#E1E7F0] py-4 text-[1.02rem] text-[#0B1B36]">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#B45309]" />
              {item}
            </li>
          ))}
        </ul>
      </Seccion>

      {/* 04 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="04" etiqueta="Preguntas frecuentes" tono="claro" titulo="Lo que suelen preguntarnos">
        <Faq faqs={c.faqs} titulo={null} />
      </Seccion>

      {/* 05 — Otras capacitaciones */}
      <Seccion id="otras" numero="05" etiqueta="También te puede servir" titulo="Otras capacitaciones">
        <ul className="border-t border-[#0B1B36]">
          {otras.map((o) => (
            <li key={o.slug} className="border-b border-[#E1E7F0]">
              <Link href={`/capacitaciones/${o.slug}`} className="group flex items-center justify-between gap-6 py-5">
                <span>
                  <span className="block text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{o.nombre}</span>
                  <span className="mt-1 block text-sm text-[#5A6A80]">{o.frecuencia}</span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <CtaBand
        titulo="¿La programamos en tu empresa?"
        texto="Dinos cuántas personas participan y en qué sede, y te enviamos fecha y precio."
        mensajeWhatsapp={`Hola, quiero cotizar la capacitación "${c.nombre}" de Comply360.`}
      />
    </>
  )
}
