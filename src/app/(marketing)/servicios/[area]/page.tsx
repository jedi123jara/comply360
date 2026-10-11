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
import { capacitacionPorSlug } from '@/lib/sitio/capacitaciones'
import { obligacionesDeArea } from '@/lib/sitio/obligaciones'
import { PRECIOS_RRHH_PUNTUALES, SERVICIOS_PRECIO_FIJO, TRAMOS_TAMANO, soles } from '@/lib/sitio/planes'
import { construirMetadata, servicioLd } from '@/lib/sitio/seo'
import { AREAS_SERVICIO, areaPorSlug, type SlugArea } from '@/lib/sitio/servicios'
import { CTA, SITIO } from '@/lib/sitio/site'

const TITULO_LEY: Record<SlugArea, string> = {
  sst: 'Obligaciones de SST según el tamaño de tu empresa',
  hostigamiento: 'Obligaciones frente al hostigamiento sexual',
  laboral: 'Obligaciones laborales según el tamaño de tu empresa',
  rrhh: 'Las reglas que más se incumplen en RRHH',
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

const celdaCabecera = 'py-4 pr-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]'

export default async function AreaServicioPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: slug } = await params
  const area = areaPorSlug(slug)
  if (!area) notFound()

  const ruta = `/servicios/${area.slug}`
  const obligaciones = obligacionesDeArea(...area.areasObligacion)
  const pagoUnico = area.servicioPrecio ? SERVICIOS_PRECIO_FIJO.find((s) => s.servicio === area.servicioPrecio) : undefined
  const plan = area.planMensual
  const precios = plan?.precios ?? pagoUnico?.precios
  const capacitaciones = area.capacitaciones
    .map((s) => capacitacionPorSlug(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <>
      <JsonLd
        data={servicioLd({
          nombre: area.titulo,
          descripcion: area.metaDescripcion,
          ruta,
          tipo: area.metaTitulo,
          precioDesde: precios?.[0],
        })}
      />

      <HeroPagina
        migas={[
          { nombre: 'Servicios', ruta: '/servicios' },
          { nombre: area.nombreCorto, ruta },
        ]}
        etiqueta={`Servicios · ${area.nombreCorto}`}
        titulo={area.titulo}
        bajada={area.resumen}
        aside={
          <FichaHero
            filas={[
              {
                etiqueta: plan ? 'Plan mensual' : 'Implementación',
                valor: precios ? `Desde ${soles(precios[0])} + IGV${plan ? ' al mes' : ''}` : 'A cotizar',
              },
              { etiqueta: 'Base legal', valor: area.baseLegal },
              { etiqueta: 'Atención', valor: SITIO.cobertura },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href={`/contacto?interes=${plan ? 'iguala' : 'implementacion'}`} className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Pide una cotización
          </Link>
        </div>
      </HeroPagina>

      {/* 01 — Por qué importa */}
      <Seccion id="por-que" numero="01" etiqueta="Por qué importa" titulo="Lo que está en juego">
        <ol className="border-t border-[#0B1B36]">
          {area.porQueImporta.map((texto, i) => (
            <li key={texto} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#E1E7F0] py-7">
              <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <p className="max-w-3xl text-[1.1rem] leading-8 text-[#0B1B36]">{texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 02 — Qué exige la ley */}
      <Seccion
        id="ley"
        numero="02"
        etiqueta="Qué exige la ley"
        tono="claro"
        titulo={TITULO_LEY[area.slug]}
        bajada={
          area.reglas
            ? 'Lo que conviene tener presente en cada contrato, sanción o cese.'
            : 'Verificado con el texto vigente. La falta es la del reglamento de inspección (D.S. 019-2006-TR).'
        }
      >
        <div className="overflow-x-auto">
          {area.reglas ? (
            <table className="w-full min-w-[640px] border-t border-[#0B1B36] text-left">
              <caption className="sr-only">Reglas y base legal</caption>
              <thead>
                <tr className="border-b border-[#D9E0EA]">
                  <th scope="col" className={cn(celdaCabecera, 'w-[22%]')}>Tema</th>
                  <th scope="col" className={celdaCabecera}>Regla</th>
                  <th scope="col" className={cn(celdaCabecera, 'w-[24%] pr-0')}>Base legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA] align-top">
                {area.reglas.map((r) => (
                  <tr key={r.tema + r.regla}>
                    <th scope="row" className="normal-case py-5 pr-6 text-sm font-bold tracking-normal text-[#0B1B36]">
                      {r.tema}
                    </th>
                    <td className="py-5 pr-6 text-[0.98rem] leading-7 text-[#334155]">{r.regla}</td>
                    <td className="py-5 text-sm text-[#5A6A80]">{r.base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[760px] border-t border-[#0B1B36] text-left">
              <caption className="sr-only">Obligaciones y base legal</caption>
              <thead>
                <tr className="border-b border-[#D9E0EA]">
                  <th scope="col" className={cn(celdaCabecera, 'w-[16%]')}>Desde</th>
                  <th scope="col" className={celdaCabecera}>Obligación</th>
                  <th scope="col" className={cn(celdaCabecera, 'w-[22%]')}>Base legal</th>
                  <th scope="col" className={cn(celdaCabecera, 'w-[16%] pr-0')}>Falta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA] align-top">
                {obligaciones.map((o) => (
                  <tr key={o.id}>
                    <td className="py-5 pr-6 text-sm font-semibold text-[#0B1B36]">{o.desde}</td>
                    <th scope="row" className="normal-case py-5 pr-6 text-[0.98rem] font-semibold leading-7 tracking-normal text-[#0B1B36]">
                      {o.obligacion}
                      {o.nota ? <span className="mt-1 block text-sm font-normal leading-6 text-[#5A6A80]">{o.nota}</span> : null}
                    </th>
                    <td className="py-5 pr-6 text-sm text-[#5A6A80]">{o.base}</td>
                    <td className="py-5 text-sm font-semibold text-[#0B1B36]">{o.falta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {area.reglas ? null : (
          <Link href="/obligaciones" className={cn(pub.linkMore, 'mt-8 text-sm')}>
            Ver todas las obligaciones de tu empresa <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </Seccion>

      {/* 03 — Qué hacemos */}
      <Seccion id="que-hacemos" numero="03" etiqueta="Qué hacemos" titulo="Cómo lo dejamos funcionando">
        <ol className="border-t border-[#0B1B36]">
          {area.queHacemos.map((paso, i) => (
            <li key={paso.titulo} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#E1E7F0] py-7">
              <span className="pt-1.5 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-[1.3rem] font-extrabold tracking-[-0.02em] text-[#0B1B36]">{paso.titulo}</h3>
                <p className="mt-2 max-w-2xl text-[1.02rem] leading-7 text-[#475569]">{paso.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 04 — Qué recibes y cuánto cuesta */}
      <Seccion id="precio" numero="04" etiqueta="Qué recibes" tono="claro" titulo="Entregables y precio">
        <div className="grid gap-12 xl:grid-cols-[1.1fr_1fr] xl:items-start">
          <ul className="border-t border-[#0B1B36]">
            {area.entregables.map((e) => (
              <li key={e} className="flex items-start gap-3 border-b border-[#D9E0EA] py-4 text-[1.02rem] text-[#0B1B36]">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#B45309]" />
                {e}
              </li>
            ))}
          </ul>
          {precios ? (
            <aside className="rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">
                {plan ? plan.nombre : 'Implementación, pago único'}
              </p>
              <dl className="mt-6 divide-y divide-[#ffffff]/10 border-y border-[#ffffff]/10">
                {precios.map((monto, i) => (
                  <div key={TRAMOS_TAMANO[i]} className="flex items-baseline justify-between gap-4 py-4">
                    <dt className="text-sm text-[#CBD5E1]">{TRAMOS_TAMANO[i]}</dt>
                    <dd className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">
                      {soles(monto)}
                      {plan ? <span className="ml-1 text-sm font-semibold text-[#94A3B8]">/mes</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              {plan ? (
                <ul className="mt-6 grid gap-2.5">
                  {plan.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#CBD5E1]">
                      <Check aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 text-[#F5B301]" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              {area.slug === 'rrhh' ? (
                <div className="mt-6 border-t border-[#ffffff]/10 pt-5 text-sm text-[#CBD5E1]">
                  <p className="font-semibold text-[#ffffff]">También por caso</p>
                  {PRECIOS_RRHH_PUNTUALES.map((p) => (
                    <p key={p.servicio} className="mt-1.5 flex justify-between gap-4">
                      <span>{p.servicio}</span>
                      <span className="shrink-0 font-semibold text-[#ffffff]">{p.precio}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm leading-6 text-[#CBD5E1]">
                  Para mantenerlo al día, la iguala mensual va desde S/ 390 + IGV.
                </p>
              )}
              <p className="mt-6 text-xs text-[#7C8BA3]">Precios más IGV.</p>
              <Link href="/planes" className={cn(pub.btnPrimary, 'mt-6 w-full')}>
                Ver todos los planes <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </aside>
          ) : null}
        </div>
      </Seccion>

      {/* 05 — Capacitaciones relacionadas */}
      {capacitaciones.length > 0 ? (
        <Seccion id="capacitaciones" numero="05" etiqueta="Capacitaciones" titulo="Las capacitaciones que van con este servicio">
          <ul className="border-t border-[#0B1B36]">
            {capacitaciones.map((c) => (
              <li key={c.slug} className="border-b border-[#E1E7F0]">
                <Link href={`/capacitaciones/${c.slug}`} className="group flex items-center justify-between gap-6 py-5">
                  <span>
                    <span className="block text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{c.nombre}</span>
                    <span className="mt-1 block text-sm text-[#5A6A80]">{c.frecuencia}</span>
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
      ) : null}

      {/* 06 — Preguntas frecuentes */}
      <Seccion
        id="preguntas"
        numero={capacitaciones.length > 0 ? '06' : '05'}
        etiqueta="Preguntas frecuentes"
        tono="claro"
        titulo="Lo que suelen preguntarnos"
      >
        <Faq faqs={area.faqs} titulo={null} />
      </Seccion>

      <CtaBand mensajeWhatsapp={`Hola, quiero información sobre el servicio de ${area.nombreCorto} de Comply360.`} />
    </>
  )
}
