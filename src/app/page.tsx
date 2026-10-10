import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { PublicShell } from '@/components/marketing/public-shell'
import { PUBLIC_HERO_BACKGROUND, pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { Faq } from '@/components/sitio/faq'
import { JsonLd } from '@/components/sitio/json-ld'
import { calcularMultaSunafil } from '@/lib/legal-engine/calculators/multa-sunafil'
import { cn } from '@/lib/utils'
import { CAPACITACIONES } from '@/lib/sitio/capacitaciones'
import { PLANES_IGUALA, SERVICIOS_PRECIO_FIJO, soles } from '@/lib/sitio/planes'
import { construirMetadata, organizacionLd, sitioWebLd } from '@/lib/sitio/seo'
import { AREAS_SERVICIO, LINEAS_SERVICIO } from '@/lib/sitio/servicios'
import { CTA, SITIO } from '@/lib/sitio/site'

const DESCRIPCION =
  'Ponemos a tu empresa en regla y la mantenemos así: laboral, SST, hostigamiento sexual y capacitaciones obligatorias, con evidencia para SUNAFIL. Trujillo y todo el Perú.'

export const metadata: Metadata = {
  ...construirMetadata({
    titulo: 'Cumplimiento laboral y SST para empresas en Perú',
    descripcion: DESCRIPCION,
    ruta: '/',
    keywords: [
      'cumplimiento laboral empresas',
      'consultoría SST Trujillo',
      'capacitaciones obligatorias SST',
      'hostigamiento sexual empresas',
      'asesoría laboral para empresas',
      'inspección SUNAFIL',
      'compliance laboral Perú',
    ],
  }),
  title: { absolute: 'Comply360 | Cumplimiento laboral y SST para empresas en Perú' },
}

const EXIGENCIAS = [
  { cifra: '4', texto: 'capacitaciones de SST al año, como mínimo, en toda empresa con trabajadores', base: 'Ley 29783, art. 35 b' },
  { cifra: '20', texto: 'trabajadores y ya necesitas comité de SST, reglamento interno de SST y comité de hostigamiento', base: 'Ley 29783 · D.S. 014-2019-MIMP' },
  { cifra: '1', texto: 'trabajador basta para exigir cuadro de categorías y funciones y política salarial', base: 'Ley 30709 · D.S. 002-2018-TR' },
  { cifra: '74%', texto: 'de las inspecciones de SUNAFIL nace de una denuncia, no de un sorteo', base: 'Boletines MTPE y SUNAFIL' },
] as const

const PASOS = [
  { titulo: 'Diagnóstico', texto: 'Revisamos tu empresa y te decimos qué falta y cuánto arriesgas. La versión express es gratis.' },
  { titulo: 'Implementación', texto: 'Hacemos los documentos, comités y registros que faltan. Tú revisas y firmas.' },
  { titulo: 'Iguala mensual', texto: 'Te avisamos cada vencimiento, respondemos tus consultas y actualizamos todo cada año.' },
  { titulo: 'Capacitación y defensa', texto: 'Dictamos lo obligatorio con especialistas y te acompañamos si llega SUNAFIL.' },
] as const

const COMPARACION = [
  ['Cuándo actúa', 'Cuando llega la inspección o la demanda', 'Todo el año, antes del problema'],
  ['Cómo cobra', 'Por caso o por hora', 'Iguala mensual y plan anual de capacitaciones'],
  ['Alcance', 'Una materia', 'Todo lo que tu empresa debe cumplir, con una red de especialistas'],
  ['Qué entrega', 'Escritos y opiniones legales', 'Evidencia lista para el inspector: documentos, registros y constancias'],
  ['Clientes', 'Personas y empresas', 'Solo empresas'],
] as const

const SEGMENTOS = [
  { titulo: 'Empresas de 20 a 250 trabajadores', texto: 'Muchas obligaciones y nadie dedicado a verlas.' },
  { titulo: 'Empresas con una inspección en curso', texto: 'Un requerimiento o un acta con plazo encima.' },
  { titulo: 'Contratistas de minería, agroindustria e industria', texto: 'El cliente grande les exige SST para homologarlos.' },
  { titulo: 'Colegios, clínicas, hoteles y restaurantes', texto: 'Hostigamiento, SST y capacitaciones en sectores con mucho personal.' },
] as const

const FAQS = [
  {
    pregunta: '¿Qué es Comply360?',
    respuesta:
      'Un estudio de cumplimiento normativo que trabaja solo para empresas. Diagnosticamos, implementamos lo que falta, te mantenemos en regla con una iguala mensual, dictamos las capacitaciones obligatorias y te defendemos ante SUNAFIL.',
  },
  {
    pregunta: '¿En qué se diferencia de un estudio de abogados tradicional?',
    respuesta:
      'Un estudio tradicional actúa cuando ya llegó el problema. Nosotros trabajamos todo el año para que no llegue, cubrimos varias materias con una red de especialistas y entregamos la evidencia que pide el inspector.',
  },
  {
    pregunta: '¿Dónde atienden?',
    respuesta: `Estamos en ${SITIO.ciudad}. Atendemos presencialmente en La Libertad y de forma virtual en todo el Perú.`,
  },
  {
    pregunta: '¿Quién dicta las capacitaciones?',
    respuesta:
      'Especialistas competentes y con experiencia en cada tema, como exige el reglamento de SST: ingenieros de seguridad colegiados, instructores de brigadas, psicólogos y abogados.',
  },
  {
    pregunta: '¿Garantizan que no me van a multar?',
    respuesta:
      'No, y desconfía de quien lo prometa. Lo que garantizamos es que tengas tus obligaciones al día y la evidencia ordenada para demostrarlo, que es lo que más pesa en una inspección.',
  },
  {
    pregunta: '¿Cuánto cuesta?',
    respuesta:
      'La iguala empieza en S/ 390 + IGV al mes para empresas de 11 a 19 trabajadores, la implementación de SST desde S/ 1,500 + IGV y el Plan Anual de Capacitaciones cuesta S/ 3,300 + IGV. El diagnóstico express es gratis.',
  },
  {
    pregunta: '¿Hacen planillas o contabilidad?',
    respuesta:
      'No. Eso lo ve tu contador. Nosotros nos encargamos de que lo laboral, la SST y el resto de obligaciones cumplan la ley. Si eres contador, mira nuestro programa de aliados.',
  },
]

type EstadoDoc = 'ok' | 'pronto' | 'falta'

const ESTADO_ESTILO: Record<EstadoDoc, string> = {
  ok: 'bg-[#ECFDF3] text-[#166534]',
  pronto: 'bg-[#FFF7E6] text-[#92400E]',
  falta: 'bg-[#FEF2F2] text-[#991B1B]',
}

/** Vista de ejemplo del archivo de cumplimiento que se entrega con la iguala. */
function ArchivoMuestra({ multaDesde }: { multaDesde: number }) {
  const filas: Array<{ doc: string; detalle: string; estado: EstadoDoc; etiqueta: string }> = [
    { doc: 'Registro de capacitaciones de SST', detalle: '3 de 4 del año', estado: 'ok', etiqueta: 'Al día' },
    { doc: 'Comité de SST', detalle: 'Actas de reunión mensual', estado: 'ok', etiqueta: 'Al día' },
    { doc: 'IPERC por puesto', detalle: 'Actualización anual', estado: 'pronto', etiqueta: 'Vence en 12 días' },
    { doc: 'Evaluación de hostigamiento sexual', detalle: 'Evaluación anual', estado: 'ok', etiqueta: 'Al día' },
    { doc: 'Cuadro de categorías y funciones', detalle: 'Ley 30709', estado: 'falta', etiqueta: 'Falta' },
  ]
  return (
    <figure className="relative">
      <div className="rounded-2xl bg-[#ffffff] p-6 text-[#0B1B36] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#E1E7F0] pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5A6A80]">Archivo de cumplimiento</p>
            <p className="mt-1 text-base font-extrabold tracking-[-0.01em]">Empresa de ejemplo · 48 trabajadores</p>
          </div>
          <span className="shrink-0 rounded-md border border-[#0B1B36]/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
            Reporte mensual
          </span>
        </div>
        <ul className="divide-y divide-[#EEF2F7]">
          {filas.map((f) => (
            <li key={f.doc} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{f.doc}</p>
                <p className="text-xs text-[#5A6A80]">{f.detalle}</p>
              </div>
              <span className={cn('shrink-0 rounded-md px-2 py-1 text-[11px] font-bold', ESTADO_ESTILO[f.estado])}>{f.etiqueta}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-[#F5F7FB] px-4 py-3">
          <p className="text-xs font-semibold text-[#5A6A80]">Si la inspección llegara hoy</p>
          <p className="text-sm">
            <span className="font-semibold">1 falta muy grave</span> · multa desde{' '}
            <span className="whitespace-nowrap font-extrabold tabular-nums">{soles(multaDesde)}</span>
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-[#94A3B8]">
        Ejemplo ilustrativo del reporte de la iguala. Multa mínima por infracción muy grave en empresa no MYPE (D.S.
        019-2006-TR, UIT 2026).
      </figcaption>
    </figure>
  )
}

function Etiqueta({ children, oscuro = false }: { children: React.ReactNode; oscuro?: boolean }) {
  return <p className={cn(oscuro ? pub.eyebrowOnNavy : pub.eyebrow, 'mb-5')}>{children}</p>
}

export default function HomePage() {
  const multa = calcularMultaSunafil({
    tipoInfraccion: 'MUY_GRAVE',
    numeroTrabajadores: 1,
    reincidente: false,
    subsanacionVoluntaria: false,
  })
  const capacitaciones = CAPACITACIONES.filter((c) =>
    ['capacitaciones-sst', 'induccion-sst', 'comite-sst', 'hostigamiento-sexual', 'brigadas-emergencia'].includes(c.slug),
  )
  const igualaDesde = Math.min(...PLANES_IGUALA.map((p) => p.precioMensual))
  const sstDesde = SERVICIOS_PRECIO_FIJO.find((s) => s.servicio === 'Implementación de SST')?.precios[0] ?? 1500

  return (
    <PublicShell>
      <JsonLd data={[organizacionLd(), sitioWebLd()]} />

      {/* Hero */}
      <section className="relative overflow-hidden text-[#ffffff]" style={{ background: PUBLIC_HERO_BACKGROUND }}>
        <div className={cn(pub.container, 'grid gap-14 py-16 sm:py-24 lg:grid-cols-[1.12fr_1fr] lg:items-center')}>
          <div>
            <Etiqueta oscuro>Estudio de cumplimiento normativo</Etiqueta>
            <h1 className="max-w-2xl text-balance text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#ffffff] sm:text-[3.6rem]">
              Tu área de cumplimiento laboral y SST, <span className="text-[#F5B301]">sin tenerla en planilla</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#CBD5E1]">
              Te ponemos en regla y te mantenemos así todo el año, con la evidencia lista para el día en que llegue
              SUNAFIL.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
                {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="/obligaciones" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
                ¿Qué debe cumplir mi empresa?
              </Link>
            </div>
            <p className="mt-10 border-t border-[#ffffff]/10 pt-5 text-sm text-[#94A3B8]">
              Laboral <span className="mx-2 text-[#ffffff]/25">/</span> SST <span className="mx-2 text-[#ffffff]/25">/</span>{' '}
              Hostigamiento sexual <span className="mx-2 text-[#ffffff]/25">/</span> Capacitaciones obligatorias
              <span className="mt-1 block text-[#7C8BA3]">{SITIO.ciudad}, La Libertad · Atención virtual en todo el Perú</span>
            </p>
          </div>
          <ArchivoMuestra multaDesde={multa.multaEstimada} />
        </div>
      </section>

      {/* Lo que exige la ley */}
      <section className="border-b border-[#E1E7F0] bg-[#ffffff]" aria-labelledby="ley">
        <div className={cn(pub.container, 'py-14 sm:py-16')}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 id="ley" className="max-w-xl text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36] sm:text-3xl">
              Las obligaciones no esperan a que tu empresa crezca
            </h2>
            <Link href="/obligaciones" className={cn(pub.linkMore, 'text-sm')}>
              Ver todas según tu tamaño <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[#E1E7F0]">
            {EXIGENCIAS.map((e) => (
              <div key={e.texto} className="lg:px-7 lg:first:pl-0 lg:last:pr-0">
                <dt className="text-5xl font-extrabold tracking-[-0.04em] text-[#0B1B36] tabular-nums">{e.cifra}</dt>
                <dd className="mt-3 text-[0.95rem] leading-6 text-[#334155]">{e.texto}</dd>
                <dd className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A97AB]">{e.base}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Qué hacemos */}
      <section className="bg-[#ffffff]" aria-labelledby="que-hacemos">
        <div className={cn(pub.container, 'grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]')}>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Etiqueta>Qué hacemos</Etiqueta>
            <h2 id="que-hacemos" className={pub.h2}>
              Todo lo que tu empresa debe cumplir, de punta a punta
            </h2>
            <p className={cn(pub.lead, 'mt-4')}>
              El diagnóstico abre la puerta, la implementación ordena y la iguala te mantiene en regla. Las capacitaciones
              y la defensa completan el círculo.
            </p>
            <Link href="/servicios" className={cn(pub.btnSecondary, 'mt-8')}>
              Ver los servicios en detalle
            </Link>
          </div>
          <ol className="border-t border-[#0B1B36]">
            {LINEAS_SERVICIO.map((linea, i) => (
              <li key={linea.id} className="border-b border-[#E1E7F0]">
                <Link href={`/servicios#${linea.id}`} className="group grid grid-cols-[3rem_1fr_auto] gap-4 py-7">
                  <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{linea.nombre}</span>
                    <span className="mt-2 block text-[0.95rem] leading-7 text-[#475569]">{linea.descripcion}</span>
                    <span className="mt-3 block text-xs font-semibold text-[#8A97AB]">Recibes: {linea.entregable}</span>
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-1 h-5 w-5 text-[#8A97AB] transition-colors group-hover:text-[#0B1B36]"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Áreas */}
      <section aria-labelledby="areas">
        <div className={cn(pub.container, 'py-16 sm:py-24')}>
          <Etiqueta>Por dónde empezamos</Etiqueta>
          <h2 id="areas" className={cn(pub.h2, 'max-w-2xl')}>
            Las tres materias que más pesan en una inspección
          </h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            {AREAS_SERVICIO.map((area) => (
              <Link key={area.slug} href={`/servicios/${area.slug}`} className="group border-t-2 border-[#0B1B36] pt-6">
                <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{area.titulo}</h3>
                <p className="mt-3 text-[0.95rem] leading-7 text-[#475569]">{area.resumen}</p>
                <span className={cn(pub.linkMore, 'mt-5 text-sm')}>
                  {area.enlace} <ArrowRight aria-hidden className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-12 max-w-3xl text-sm leading-6 text-[#5A6A80]">
            Después sumamos protección de datos personales, libro de reclamaciones y prevención de delitos. Lo ambiental,
            municipal y tributario lo vemos con aliados.
          </p>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className="bg-[#ffffff]" aria-labelledby="como">
        <div className={cn(pub.container, 'py-16 sm:py-24')}>
          <Etiqueta>Cómo trabajamos</Etiqueta>
          <h2 id="como" className={cn(pub.h2, 'max-w-2xl')}>
            Cuatro pasos, siempre los mismos
          </h2>
          <ol className="relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-8">
            <span aria-hidden className="absolute left-0 right-0 top-[15px] hidden h-px bg-[#E1E7F0] lg:block" />
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="relative">
                <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1B36] text-xs font-bold text-[#F5B301] ring-8 ring-[#ffffff]">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{paso.titulo}</h3>
                <p className="mt-2 text-[0.95rem] leading-7 text-[#475569]">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capacitaciones */}
      <section aria-labelledby="capacitaciones">
        <div className={cn(pub.container, 'grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.25fr_0.75fr]')}>
          <div>
            <Etiqueta>Capacitaciones obligatorias</Etiqueta>
            <h2 id="capacitaciones" className={pub.h2}>
              Las que exige la ley, con la evidencia que pide el inspector
            </h2>
            <ul className="mt-10 border-t border-[#0B1B36]">
              {capacitaciones.map((c) => (
                <li key={c.slug} className="border-b border-[#E1E7F0]">
                  <Link
                    href={`/capacitaciones/${c.slug}`}
                    className="group grid gap-1 py-5 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:gap-6"
                  >
                    <span className="text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{c.nombre}</span>
                    <span className="text-sm text-[#5A6A80]">{c.frecuencia}</span>
                    <ArrowUpRight
                      aria-hidden
                      className="hidden h-5 w-5 text-[#8A97AB] transition-colors group-hover:text-[#0B1B36] sm:block"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <aside className="self-start rounded-2xl bg-[#0B1B36] p-7 text-[#ffffff] lg:mt-24">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5B301]">Plan Anual de Capacitaciones</p>
            <p className="mt-4 text-4xl font-extrabold tracking-[-0.03em]">S/ 3,300</p>
            <p className="mt-1 text-sm text-[#CBD5E1]">al año + IGV, o S/ 275 al mes</p>
            <p className="mt-5 text-sm leading-6 text-[#CBD5E1]">
              Las 4 de SST, la de hostigamiento y la de brigadas, con cronograma, registro, asistencia, evaluación y
              constancias.
            </p>
            <Link href="/capacitaciones" className={cn(pub.btnPrimary, 'mt-6 w-full')}>
              Ver el catálogo <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>

      {/* Comparación */}
      <section className="bg-[#ffffff]" aria-labelledby="diferencia">
        <div className={cn(pub.container, 'py-16 sm:py-24')}>
          <Etiqueta>La diferencia</Etiqueta>
          <h2 id="diferencia" className={cn(pub.h2, 'max-w-2xl')}>
            No esperamos a que llegue el inspector
          </h2>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-t border-[#0B1B36] text-left">
              <caption className="sr-only">Comparación entre un estudio tradicional y Comply360</caption>
              <thead>
                <tr className="border-b border-[#E1E7F0]">
                  <th scope="col" className="w-1/5 py-4 pr-6"></th>
                  <th scope="col" className="py-4 pr-6 text-xs font-bold uppercase tracking-[0.14em] text-[#8A97AB]">
                    Estudio tradicional
                  </th>
                  <th scope="col" className="py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#0B1B36]">
                    Comply360
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7F0]">
                {COMPARACION.map(([fila, tradicional, comply]) => (
                  <tr key={fila}>
                    <th scope="row" className="normal-case py-5 pr-6 align-top text-sm font-bold tracking-normal text-[#0B1B36]">
                      {fila}
                    </th>
                    <td className="py-5 pr-6 align-top text-[0.95rem] text-[#64748B]">{tradicional}</td>
                    <td className="py-5 align-top text-[0.95rem] font-semibold text-[#0B1B36]">{comply}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Para quién + precios */}
      <section aria-labelledby="para-quien">
        <div className={cn(pub.container, 'grid gap-16 py-16 sm:py-24 lg:grid-cols-2')}>
          <div>
            <Etiqueta>Para quién</Etiqueta>
            <h2 id="para-quien" className={pub.h2}>
              Empresas sin área legal propia
            </h2>
            <ul className="mt-10 grid gap-8 sm:grid-cols-2">
              {SEGMENTOS.map((s) => (
                <li key={s.titulo} className="border-t border-[#0B1B36] pt-4">
                  <p className="font-extrabold tracking-[-0.01em] text-[#0B1B36]">{s.titulo}</p>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">{s.texto}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-[#475569]">
              ¿Eres contador?{' '}
              <Link href="/contadores" className={pub.link}>
                Conoce el programa para contadores
              </Link>
              .
            </p>
          </div>
          <div>
            <Etiqueta>Precios claros</Etiqueta>
            <h2 className={pub.h2}>Sabes cuánto pagas antes de empezar</h2>
            <dl className="mt-10 border-t border-[#0B1B36]">
              {[
                { etiqueta: 'Iguala mensual', valor: `Desde ${soles(igualaDesde)}`, detalle: 'al mes, según el tamaño de tu empresa' },
                { etiqueta: 'Implementación de SST', valor: `Desde ${soles(sstDesde)}`, detalle: 'pago único, de 20 a 50 trabajadores' },
                { etiqueta: 'Plan Anual de Capacitaciones', valor: 'S/ 3,300', detalle: 'al año, o S/ 275 al mes' },
              ].map((p) => (
                <div key={p.etiqueta} className="flex items-baseline justify-between gap-6 border-b border-[#E1E7F0] py-5">
                  <dt>
                    <span className="block font-extrabold text-[#0B1B36]">{p.etiqueta}</span>
                    <span className="block text-sm text-[#5A6A80]">{p.detalle}</span>
                  </dt>
                  <dd className="shrink-0 text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36] tabular-nums">{p.valor}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-[#8A97AB]">Todos los precios son más IGV. El diagnóstico express es gratis.</p>
            <Link href="/planes" className={cn(pub.linkMore, 'mt-6 text-sm')}>
              Ver planes y precios <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Herramientas gratis */}
      <section className="bg-[#ffffff]" aria-labelledby="herramientas">
        <div className={cn(pub.container, 'py-16 sm:py-20')}>
          <h2 id="herramientas" className="text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36] sm:text-3xl">
            Empieza por saber dónde estás. Es gratis.
          </h2>
          <div className="mt-10 grid border-t border-[#0B1B36] sm:grid-cols-3 sm:divide-x sm:divide-[#E1E7F0]">
            {[
              { href: '/diagnostico-gratis', titulo: 'Diagnóstico gratis', texto: 'Un cuestionario corto para ver tus brechas y tu nivel de riesgo.' },
              { href: '/obligaciones', titulo: '¿Qué debe cumplir mi empresa?', texto: 'Indica cuántos trabajadores tienes y mira lo que te aplica.' },
              { href: '/calculadoras', titulo: 'Calculadoras laborales', texto: 'CTS, gratificación, multas SUNAFIL e IPERC, sin registrarte.' },
            ].map((h) => (
              <Link key={h.href} href={h.href} className="group border-b border-[#E1E7F0] py-6 sm:border-b-0 sm:px-6 sm:first:pl-0">
                <span className="flex items-center justify-between gap-3 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">
                  {h.titulo}
                  <ArrowUpRight aria-hidden className="h-5 w-5 shrink-0 text-[#8A97AB] transition-colors group-hover:text-[#0B1B36]" />
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#475569]">{h.texto}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={cn(pub.container, 'py-16 sm:py-20')}>
        <Faq faqs={FAQS} />
      </div>

      <CtaBand />
    </PublicShell>
  )
}
