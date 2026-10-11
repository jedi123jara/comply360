import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CalendarCheck, ClipboardCheck, FileCheck2, GraduationCap, Scale, Wrench } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { SectionHeader } from '@/components/sitio/section-header'
import { cn } from '@/lib/utils'
import { construirMetadata, servicioLd } from '@/lib/sitio/seo'
import { AREAS_SERVICIO, LINEAS_SERVICIO, type LineaServicio } from '@/lib/sitio/servicios'
import { CTA } from '@/lib/sitio/site'

const DESCRIPCION =
  'Diagnóstico, implementación, iguala mensual, capacitaciones obligatorias y defensa ante SUNAFIL para empresas. Laboral, SST y hostigamiento sexual en un solo lugar.'

export const metadata: Metadata = construirMetadata({
  titulo: 'Servicios de cumplimiento normativo para empresas',
  descripcion: DESCRIPCION,
  ruta: '/servicios',
  keywords: ['servicios de cumplimiento normativo', 'iguala laboral empresas', 'consultoría SST', 'defensa SUNAFIL', 'compliance laboral'],
})

const ICONOS: Record<LineaServicio['id'], LucideIcon> = {
  diagnostico: ClipboardCheck,
  implementacion: FileCheck2,
  iguala: CalendarCheck,
  capacitaciones: GraduationCap,
  defensa: Scale,
  puntuales: Wrench,
}

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
  return (
    <>
      <JsonLd
        data={servicioLd({
          nombre: 'Servicios de cumplimiento normativo para empresas',
          descripcion: DESCRIPCION,
          ruta: '/servicios',
          tipo: 'Cumplimiento normativo laboral y de SST',
          precioDesde: 390,
        })}
      />
      <PublicHero
        align="left"
        eyebrow="Servicios"
        title={
          <>
            Seis servicios para que tu empresa <span className={pub.highlightOnNavy}>esté en regla todo el año</span>
          </>
        }
        description="El diagnóstico abre la puerta, la implementación ordena, la iguala te mantiene al día, y las capacitaciones y la defensa completan el círculo."
        media={<Breadcrumbs items={[{ nombre: 'Servicios', ruta: '/servicios' }]} className="mb-0" />}
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
            {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/planes" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
            Ver precios
          </Link>
        </div>
      </PublicHero>

      <section className="bg-[#ffffff]" aria-label="Líneas de servicio">
        <div className={cn(pub.container, pub.section, 'grid gap-6')}>
          {LINEAS_SERVICIO.map((linea) => {
            const Icono = ICONOS[linea.id]
            return (
              <article key={linea.id} id={linea.id} className={cn(pub.card, 'scroll-mt-28 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr]')}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={pub.iconBox}>
                      <Icono aria-hidden className="h-5 w-5" />
                    </span>
                    <p className={pub.kicker}>{linea.verbo}</p>
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{linea.nombre}</h2>
                  <p className={cn(pub.lead, 'mt-2 text-base')}>{linea.descripcion}</p>
                </div>
                <dl className={cn(pub.inset, 'grid gap-4 p-5 text-sm')}>
                  <div>
                    <dt className="font-bold text-[#0B1B36]">Qué recibes</dt>
                    <dd className="mt-1 text-[#475569]">{linea.entregable}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#0B1B36]">Plazo</dt>
                    <dd className="mt-1 text-[#475569]">{linea.plazo}</dd>
                  </div>
                  {linea.id === 'capacitaciones' ? (
                    <Link href="/capacitaciones" className={cn(pub.linkMore, 'text-sm')}>
                      Ver el catálogo de capacitaciones <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {linea.id === 'diagnostico' ? (
                    <Link href="/diagnostico-gratis" className={cn(pub.linkMore, 'text-sm')}>
                      Hacer el diagnóstico gratis <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : null}
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="por-area">
        <div className={cn(pub.container, pub.section)}>
          <SectionHeader
            id="por-area"
            kicker="Por área"
            titulo="Lo que hacemos en cada materia"
            bajada="Empezamos por lo que más fiscaliza SUNAFIL. Protección de datos personales, libro de reclamaciones y prevención de delitos se suman a pedido."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {AREAS_SERVICIO.map((area) => (
              <Link key={area.slug} href={`/servicios/${area.slug}`} className={cn(pub.card, pub.cardHover, 'flex flex-col p-6')}>
                <h3 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{area.titulo}</h3>
                <p className={cn(pub.body, 'mt-2 flex-1')}>{area.resumen}</p>
                <span className={cn(pub.linkMore, 'mt-4 text-sm')}>
                  {area.enlace} <ArrowRight aria-hidden className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={cn(pub.container, 'pb-4')}>
        <Faq faqs={FAQS} />
      </div>

      <CtaBand />
    </>
  )
}
