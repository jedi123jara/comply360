import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
import {
  PLAN_RRHH,
  PLANES_IGUALA,
  PRECIOS_CAPACITACION,
  PRECIOS_DEFENSA,
  PRECIOS_RRHH_PUNTUALES,
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

const celdaCabecera = 'py-4 pr-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]'

function FilasPrecio({ filas }: { filas: ReadonlyArray<{ concepto: string; detalle?: string; precio: string }> }) {
  return (
    <dl className="border-t border-[#0B1B36]">
      {filas.map((f) => (
        <div key={f.concepto} className="grid gap-1 border-b border-[#D9E0EA] py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
          <dt>
            <span className="block text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{f.concepto}</span>
            {f.detalle ? <span className="mt-1 block text-sm text-[#5A6A80]">{f.detalle}</span> : null}
          </dt>
          <dd className="text-lg font-extrabold tracking-[-0.02em] text-[#0B1B36] sm:text-right">{f.precio}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function PlanesPage() {
  const igualaDesde = Math.min(...PLANES_IGUALA.map((p) => p.precioMensual))
  const sstDesde = SERVICIOS_PRECIO_FIJO.find((s) => s.servicio === 'Implementación de SST')?.precios[0] ?? 1500

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

      <HeroPagina
        migas={[{ nombre: 'Planes', ruta: '/planes' }]}
        etiqueta="Planes y precios"
        titulo={
          <>
            Sabes cuánto pagas <span className="text-[#F5B301]">antes de empezar</span>
          </>
        }
        bajada="Iguala mensual para mantenerte en regla, precios fijos para ponerte al día y capacitaciones con evidencia. Todo más IGV."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Iguala', valor: `Desde ${soles(igualaDesde)} al mes` },
              { etiqueta: 'Implementación', valor: `SST desde ${soles(sstDesde)}, pago único` },
              { etiqueta: 'Capacitaciones', valor: 'Plan Anual S/ 3,300 al año' },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </HeroPagina>

      {/* 01 — Iguala mensual */}
      <Seccion
        id="iguala"
        numero="01"
        etiqueta="Iguala mensual"
        titulo="Planes para mantenerte en regla"
        bajada="Contrato anual con pago mensual. Elige según el número de trabajadores de tu empresa."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {PLANES_IGUALA.map((plan) => {
            const oscuro = Boolean(plan.destacado)
            return (
              <article
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-2xl p-7',
                  oscuro ? 'bg-[#0B1B36] text-[#ffffff]' : 'border border-[#E1E7F0] bg-[#ffffff]',
                )}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={cn('text-xl font-extrabold tracking-[-0.02em]', oscuro ? 'text-[#ffffff]' : 'text-[#0B1B36]')}>
                    {plan.nombre}
                  </h3>
                  {oscuro ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B301]">Recomendado</span>
                  ) : null}
                </div>
                <p className={cn('mt-1 text-sm', oscuro ? 'text-[#94A3B8]' : 'text-[#5A6A80]')}>{plan.para}</p>
                <p className="mt-6 text-[2.75rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
                  {soles(plan.precioMensual)}
                </p>
                <p className={cn('mt-2 text-sm', oscuro ? 'text-[#94A3B8]' : 'text-[#5A6A80]')}>al mes + IGV</p>
                <ul className={cn('mt-6 grid flex-1 gap-2.5 border-t pt-6', oscuro ? 'border-[#ffffff]/10' : 'border-[#E1E7F0]')}>
                  {plan.incluye.map((item) => (
                    <li key={item} className={cn('flex items-start gap-2.5 text-sm leading-6', oscuro ? 'text-[#CBD5E1]' : 'text-[#334155]')}>
                      <Check aria-hidden className={cn('mt-1 h-3.5 w-3.5 shrink-0', oscuro ? 'text-[#F5B301]' : 'text-[#B45309]')} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/contacto?interes=iguala" className={cn(oscuro ? pub.btnPrimary : pub.btnSecondary, 'mt-7 w-full')}>
                  Quiero este plan
                </Link>
              </article>
            )
          })}
        </div>
      </Seccion>

      {/* 02 — Precio fijo */}
      <Seccion
        id="fijos"
        numero="02"
        etiqueta="Precio fijo"
        tono="claro"
        titulo="Para ponerte al día"
        bajada="Pago único. Los tres módulos de implementación juntos tienen 15% de descuento, y el diagnóstico completo se descuenta si contratas la implementación dentro de 30 días."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-t border-[#0B1B36] text-left">
            <caption className="sr-only">Servicios de precio fijo por tamaño de empresa</caption>
            <thead>
              <tr className="border-b border-[#D9E0EA]">
                <th scope="col" className={celdaCabecera}>Servicio</th>
                {TRAMOS_TAMANO.map((t) => (
                  <th key={t} scope="col" className={cn(celdaCabecera, 'text-right last:pr-0')}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E0EA]">
              {SERVICIOS_PRECIO_FIJO.map((s) => (
                <tr key={s.servicio}>
                  <th scope="row" className="normal-case py-5 pr-6 text-[0.98rem] font-semibold tracking-normal text-[#0B1B36]">
                    {s.servicio}
                  </th>
                  {s.precios.map((p, i) => (
                    <td key={TRAMOS_TAMANO[i]} className="py-5 pr-6 text-right text-[1.02rem] font-extrabold tabular-nums text-[#0B1B36] last:pr-0">
                      {soles(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-[#5A6A80]">El diagnóstico express es gratis.</p>
      </Seccion>

      {/* 03 — Soporte legal a RRHH */}
      <Seccion
        id="rrhh"
        numero="03"
        etiqueta="Soporte legal a RRHH"
        titulo="Respaldo para el día a día de tu equipo"
        bajada="Contratos, disciplina, desvinculaciones y consultas. Con plan mensual o por caso."
      >
        <div className="grid gap-12 xl:grid-cols-[1fr_1fr] xl:items-start">
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-t border-[#0B1B36] text-left">
                <caption className="sr-only">{PLAN_RRHH.nombre}</caption>
                <tbody className="divide-y divide-[#E1E7F0]">
                  {PLAN_RRHH.precios.map((monto, i) => (
                    <tr key={TRAMOS_TAMANO[i]}>
                      <th scope="row" className="normal-case py-5 pr-6 text-sm font-semibold tracking-normal text-[#475569]">
                        {TRAMOS_TAMANO[i]}
                      </th>
                      <td className="py-5 text-right text-xl font-extrabold tracking-[-0.02em] tabular-nums text-[#0B1B36]">
                        {soles(monto)} <span className="text-sm font-semibold text-[#5A6A80]">/mes</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8">
              <FilasPrecio filas={PRECIOS_RRHH_PUNTUALES.map((p) => ({ concepto: p.servicio, precio: p.precio }))} />
            </div>
          </div>
          <aside className="rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">{PLAN_RRHH.nombre}</p>
            <ul className="mt-6 grid gap-3">
              {PLAN_RRHH.incluye.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.98rem] leading-7 text-[#CBD5E1]">
                  <Check aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[#F5B301]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/servicios/rrhh" className={cn(pub.btnPrimary, 'mt-8 w-full')}>
              Ver el servicio <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </Seccion>

      {/* 04 — Capacitaciones */}
      <Seccion id="capacitaciones" numero="04" etiqueta="Capacitaciones" tono="claro" titulo="Con la evidencia incluida">
        <FilasPrecio filas={PRECIOS_CAPACITACION.map((p) => ({ concepto: p.producto, detalle: p.detalle, precio: p.precio }))} />
        <Link href="/capacitaciones" className={cn(pub.linkMore, 'mt-8 text-sm')}>
          Ver el catálogo de capacitaciones <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </Seccion>

      {/* 05 — Defensa */}
      <Seccion
        id="defensa"
        numero="05"
        etiqueta="Defensa ante SUNAFIL"
        titulo="Si llega el inspector"
        bajada="Con iguala Integral o Corporativo, la defensa cuesta entre 20% y 30% menos."
      >
        <FilasPrecio filas={PRECIOS_DEFENSA.map((p) => ({ concepto: p.servicio, precio: p.precio }))} />
      </Seccion>

      {/* 06 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="06" etiqueta="Preguntas frecuentes" tono="claro" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand titulo="¿No sabes qué plan te toca?" texto="Haz el diagnóstico gratis y te recomendamos el plan según tu tamaño y lo que te falta." />
    </>
  )
}
