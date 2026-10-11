import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
import { PLANES_IGUALA, SERVICIOS_PRECIO_FIJO, soles } from '@/lib/sitio/planes'
import { construirMetadata, servicioLd } from '@/lib/sitio/seo'
import { AREAS_SERVICIO, LINEAS_SERVICIO } from '@/lib/sitio/servicios'
import { CTA, SITIO } from '@/lib/sitio/site'

const DESCRIPCION =
  'Diagnóstico, implementación, iguala mensual, capacitaciones obligatorias y defensa ante SUNAFIL para empresas: laboral, SST, hostigamiento y RRHH en un solo lugar.'

export const metadata: Metadata = construirMetadata({
  titulo: 'Servicios de cumplimiento normativo para empresas',
  descripcion: DESCRIPCION,
  ruta: '/servicios',
  keywords: ['servicios de cumplimiento normativo', 'iguala laboral empresas', 'consultoría SST', 'defensa SUNAFIL', 'compliance laboral'],
})

const FAQS = [
  {
    pregunta: '¿Por dónde empiezo?',
    respuesta:
      'Por el diagnóstico. La versión express es gratis y te dice qué falta. El completo cuesta desde S/ 600 + IGV y se descuenta si contratas la implementación dentro de 30 días.',
  },
  {
    pregunta: '¿Puedo contratar solo las capacitaciones?',
    respuesta: 'Sí. Las capacitaciones y el Plan Anual se contratan solos o junto con la iguala, con 15% de descuento.',
  },
  {
    pregunta: '¿Qué incluye la iguala mensual?',
    respuesta:
      'Calendario de obligaciones con alertas, boletín normativo, consultas, revisión de documentos y actualización anual. Los planes van de S/ 390 a S/ 1,790 + IGV al mes según el tamaño de tu empresa.',
  },
  {
    pregunta: '¿Llevan juicios laborales?',
    respuesta:
      'No litigamos. Si tu empresa necesita defensa judicial, te derivamos a un estudio aliado. Ante SUNAFIL sí te acompañamos: inspección, descargos, apelación y recurso de revisión.',
  },
]

export default function ServiciosPage() {
  const igualaDesde = Math.min(...PLANES_IGUALA.map((p) => p.precioMensual))
  const diagnosticoDesde = SERVICIOS_PRECIO_FIJO.find((s) => s.servicio === 'Diagnóstico completo')?.precios[0] ?? 600

  return (
    <>
      <JsonLd
        data={servicioLd({
          nombre: 'Servicios de cumplimiento normativo para empresas',
          descripcion: DESCRIPCION,
          ruta: '/servicios',
          tipo: 'Cumplimiento normativo laboral y de SST',
          precioDesde: igualaDesde,
        })}
      />

      <HeroPagina
        migas={[{ nombre: 'Servicios', ruta: '/servicios' }]}
        etiqueta="Servicios"
        titulo={
          <>
            Seis servicios para que tu empresa <span className="text-[#F5B301]">esté en regla todo el año</span>
          </>
        }
        bajada="El diagnóstico abre la puerta, la implementación ordena, la iguala te mantiene al día, y las capacitaciones y la defensa completan el ciclo."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Diagnóstico', valor: `Express gratis · completo desde ${soles(diagnosticoDesde)}` },
              { etiqueta: 'Iguala', valor: `Desde ${soles(igualaDesde)} + IGV al mes` },
              { etiqueta: 'Atención', valor: SITIO.cobertura },
            ]}
          />
        }
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/planes" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver precios
          </Link>
        </div>
      </HeroPagina>

      {/* 01 — Los servicios */}
      <Seccion
        id="lineas"
        numero="01"
        etiqueta="Los servicios"
        titulo="Del diagnóstico a la defensa, con un mismo equipo"
        bajada="Puedes contratarlos por separado, pero funcionan mejor encadenados."
      >
        <ol className="border-t border-[#0B1B36]">
          {LINEAS_SERVICIO.map((linea, i) => (
            <li key={linea.id} id={linea.id} className="scroll-mt-28 border-b border-[#E1E7F0] py-9">
              <div className="grid grid-cols-[3rem_1fr] gap-x-4">
                <span className="pt-1.5 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A97AB]">{linea.verbo}</p>
                  <h3 className="mt-1.5 text-[1.5rem] font-extrabold tracking-[-0.02em] text-[#0B1B36]">{linea.nombre}</h3>
                  <p className="mt-3 max-w-2xl text-[1.02rem] leading-7 text-[#475569]">{linea.descripcion}</p>
                  <dl className="mt-6 grid gap-5 border-t border-[#EEF2F7] pt-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">Qué recibes</dt>
                      <dd className="mt-1.5 leading-6 text-[#0B1B36]">{linea.entregable}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">Plazo</dt>
                      <dd className="mt-1.5 leading-6 text-[#0B1B36]">{linea.plazo}</dd>
                    </div>
                  </dl>
                  {linea.id === 'diagnostico' ? (
                    <Link href="/diagnostico-gratis" className={cn(pub.linkMore, 'mt-5 text-sm')}>
                      Hacer el diagnóstico gratis <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {linea.id === 'capacitaciones' ? (
                    <Link href="/capacitaciones" className={cn(pub.linkMore, 'mt-5 text-sm')}>
                      Ver el catálogo de capacitaciones <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 02 — Por área */}
      <Seccion
        id="por-area"
        numero="02"
        etiqueta="Por área"
        tono="claro"
        titulo="Lo que hacemos en cada materia"
        bajada="Protección de datos personales, libro de reclamaciones y prevención de delitos se suman a pedido."
      >
        <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2">
          {AREAS_SERVICIO.map((area) => (
            <Link key={area.slug} href={`/servicios/${area.slug}`} className="group flex flex-col border-t-2 border-[#0B1B36] pt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">{area.baseLegal}</p>
              <h3 className="mt-3 flex items-start justify-between gap-4 text-xl font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36]">
                {area.titulo}
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 h-5 w-5 shrink-0 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </h3>
              <p className="mt-3 flex-1 text-[0.98rem] leading-7 text-[#475569]">{area.resumen}</p>
              <span className={cn(pub.linkMore, 'mt-6 text-sm')}>
                {area.enlace} <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </Seccion>

      {/* 03 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="03" etiqueta="Preguntas frecuentes" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand />
    </>
  )
}
