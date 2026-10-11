import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { PublicShell } from '@/components/marketing/public-shell'
import { PUBLIC_HERO_BACKGROUND, pub } from '@/components/marketing/public-theme'
import { CtaBand } from '@/components/sitio/cta-band'
import { EtiquetaSeccion, Seccion } from '@/components/sitio/editorial'
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

const CIFRAS = [
  { cifra: '4', texto: 'capacitaciones de SST al año, como mínimo, para todo el personal.', base: 'Ley 29783, art. 35 b' },
  { cifra: '20', texto: 'trabajadores: desde ahí corresponden comité de SST, reglamento interno de SST y comité de hostigamiento.', base: 'Ley 29783 · D.S. 014-2019-MIMP' },
  { cifra: '1', texto: 'trabajador basta para exigir cuadro de categorías y funciones y política salarial.', base: 'Ley 30709 · D.S. 002-2018-TR' },
  { cifra: '74%', texto: 'de las inspecciones de SUNAFIL se origina en una denuncia.', base: 'Boletines de inspección MTPE y SUNAFIL' },
] as const

const PASOS = [
  { titulo: 'Diagnóstico', texto: 'Revisamos tu empresa y te decimos qué falta y cuánto arriesgas. La versión express es gratis.' },
  { titulo: 'Implementación', texto: 'Hacemos los documentos, comités y registros que faltan. Tú revisas y firmas.' },
  { titulo: 'Iguala mensual', texto: 'Te avisamos cada vencimiento, respondemos tus consultas y actualizamos todo cada año.' },
  { titulo: 'Capacitación y defensa', texto: 'Dictamos lo obligatorio con especialistas y te acompañamos si llega SUNAFIL.' },
] as const

const EVIDENCIAS = [
  { titulo: 'Actas', texto: 'Del comité de SST, del comité de hostigamiento y de cada elección.' },
  { titulo: 'Registros', texto: 'Los ocho registros de SST, la asistencia y las capacitaciones del año.' },
  { titulo: 'Constancias', texto: 'Firmadas por el instructor, con el temario y la evaluación de cada sesión.' },
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
      'Un estudio tradicional suele actuar cuando el problema ya llegó. Nosotros trabajamos todo el año para prevenirlo, cubrimos varias materias con una red de especialistas y entregamos la evidencia que pide el inspector.',
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
      'Nadie puede garantizarlo con honestidad. Lo que sí aseguramos es que tengas tus obligaciones al día y la evidencia ordenada para demostrarlo, que es lo que más pesa en una inspección.',
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

/** Sello de evidencia: el distintivo de la marca (un sello, no un adorno). */
function Sello({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <defs>
        <path id="sello-circulo" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="#0B1B36" stroke="#F5B301" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="#F5B301" strokeWidth="1" />
      <text fill="#F5B301" fontSize="9" fontWeight="700" letterSpacing="2">
        <textPath href="#sello-circulo" textLength="276" lengthAdjust="spacing">
          EVIDENCIA AL DÍA · COMPLY360 ·
        </textPath>
      </text>
      <path d="M47 61 l9 9 l17 -19" fill="none" stroke="#F5B301" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
    <figure className="relative mx-auto w-full max-w-[500px] lg:mr-0">
      <div className="relative">
        {/* Hojas del expediente detrás del reporte. */}
        <div aria-hidden className="absolute inset-0 translate-x-6 translate-y-6 rotate-[3deg] rounded-2xl border border-[#ffffff]/10 bg-[#ffffff]/[0.04]" />
        <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rotate-[1.5deg] rounded-2xl border border-[#ffffff]/10 bg-[#ffffff]/[0.07]" />
        <div className="relative rounded-2xl bg-[#ffffff] p-6 text-[#0B1B36] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.7)] sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-[#E1E7F0] pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5A6A80]">Archivo de cumplimiento</p>
              <p className="mt-1.5 text-lg font-extrabold tracking-[-0.02em]">Empresa de ejemplo</p>
              <p className="text-xs text-[#5A6A80]">48 trabajadores · Reporte mensual</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-[#5A6A80]">OCT 2026</span>
          </div>
          <ul className="divide-y divide-[#EEF2F7]">
            {filas.map((f) => (
              <li key={f.doc} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{f.doc}</p>
                  <p className="text-xs text-[#5A6A80]">{f.detalle}</p>
                </div>
                <span className={cn('shrink-0 rounded-md px-2 py-1 text-[11px] font-bold', ESTADO_ESTILO[f.estado])}>{f.etiqueta}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-[#0B1B36] px-5 py-4 text-[#ffffff]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B301]">Si la inspección llegara hoy</p>
            <p className="mt-1 text-sm text-[#CBD5E1]">
              <span className="font-semibold text-[#ffffff]">1 falta muy grave</span> pendiente · multa desde{' '}
              <span className="whitespace-nowrap font-extrabold tabular-nums text-[#ffffff]">{soles(multaDesde)}</span>
            </p>
          </div>
        </div>
        <Sello className="absolute -right-5 -top-12 hidden h-28 w-28 rotate-[-12deg] drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)] sm:block" />
      </div>
      <figcaption className="mt-9 text-xs leading-5 text-[#7C8BA3]">
        Ejemplo ilustrativo del reporte de la iguala. Multa mínima por infracción muy grave en empresa no MYPE (D.S.
        019-2006-TR, UIT 2026).
      </figcaption>
    </figure>
  )
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
        <div className={cn(pub.container, 'grid gap-16 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:grid-cols-12 lg:items-center lg:gap-x-10')}>
          <div className="lg:col-span-7">
            <EtiquetaSeccion oscuro className="mb-8">
              Estudio de cumplimiento normativo
            </EtiquetaSeccion>
            <h1 className="max-w-[16ch] text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#ffffff] sm:text-[3.75rem] xl:text-[4.25rem]">
              Tu área de cumplimiento laboral y SST, <span className="text-[#F5B301]">sin tenerla en planilla</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#CBD5E1]">
              Te ponemos en regla y te mantenemos así todo el año, con la evidencia lista para el día en que llegue
              SUNAFIL.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={CTA.diagnostico.href} className={pub.btnPrimaryLg}>
                {CTA.diagnostico.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="/obligaciones" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6')}>
                ¿Qué debe cumplir mi empresa?
              </Link>
            </div>
            <dl className="mt-14 grid max-w-xl grid-cols-2 gap-6 border-t border-[#ffffff]/10 pt-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[#7C8BA3]">Materias</dt>
                <dd className="mt-1 font-semibold text-[#ffffff]">Laboral, SST y hostigamiento</dd>
              </div>
              <div>
                <dt className="text-[#7C8BA3]">Capacitaciones</dt>
                <dd className="mt-1 font-semibold text-[#ffffff]">Con especialistas</dd>
              </div>
              <div>
                <dt className="text-[#7C8BA3]">Atención</dt>
                <dd className="mt-1 font-semibold text-[#ffffff]">{SITIO.ciudad} y todo el Perú</dd>
              </div>
            </dl>
          </div>
          <div className="lg:col-span-5">
            <ArchivoMuestra multaDesde={multa.multaEstimada} />
          </div>
        </div>
      </section>

      {/* 01 — Lo que exige la ley */}
      <Seccion
        id="ley"
        numero="01"
        etiqueta="Lo que exige la ley"
        titulo="Algunas obligaciones empiezan con el primer trabajador"
        bajada="Otras cambian al llegar a 20, a más de 50 o a más de 100 trabajadores."
      >
        <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {CIFRAS.map((c) => (
            <div key={c.texto} className="border-t border-[#0B1B36] pt-6">
              <dt className="text-6xl font-extrabold tracking-[-0.045em] text-[#0B1B36] tabular-nums">{c.cifra}</dt>
              <dd className="mt-4 max-w-sm text-[1.02rem] leading-7 text-[#334155]">{c.texto}</dd>
              <dd className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">{c.base}</dd>
            </div>
          ))}
        </dl>
        <Link href="/obligaciones" className={cn(pub.linkMore, 'mt-12 text-sm')}>
          Ver todas las obligaciones según tu tamaño <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </Seccion>

      {/* 02 — Qué hacemos */}
      <Seccion
        id="que-hacemos"
        numero="02"
        etiqueta="Qué hacemos"
        tono="claro"
        titulo="Todo lo que tu empresa debe cumplir, en un solo estudio"
        bajada="El diagnóstico abre la puerta, la implementación ordena y la iguala te mantiene en regla. Las capacitaciones y la defensa completan el ciclo."
      >
        <ol className="border-t border-[#0B1B36]">
          {LINEAS_SERVICIO.map((linea, i) => (
            <li key={linea.id} className="border-b border-[#D9E0EA]">
              <Link href={`/servicios#${linea.id}`} className="group grid grid-cols-[3rem_1fr_auto] gap-x-4 py-8">
                <span className="pt-1.5 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block text-[1.4rem] font-extrabold tracking-[-0.02em] text-[#0B1B36]">{linea.nombre}</span>
                  <span className="mt-2 block max-w-2xl text-[1.02rem] leading-7 text-[#475569]">{linea.descripcion}</span>
                  <span className="mt-3 block text-xs font-semibold text-[#7C8BA3]">Recibes: {linea.entregable}</span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="mt-2 h-5 w-5 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </Link>
            </li>
          ))}
        </ol>
        <Link href="/servicios" className={cn(pub.btnSecondary, 'mt-10')}>
          Ver los servicios en detalle
        </Link>
      </Seccion>

      {/* 03 — Por dónde empezamos */}
      <Seccion
        id="areas"
        numero="03"
        etiqueta="Por dónde empezamos"
        titulo="Cuatro áreas, empezando por lo que más se fiscaliza"
      >
        <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2">
          {AREAS_SERVICIO.map((area) => (
            <Link key={area.slug} href={`/servicios/${area.slug}`} className="group flex flex-col border-t-2 border-[#0B1B36] pt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">{area.baseLegal}</p>
              <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36]">{area.titulo}</h3>
              <p className="mt-3 flex-1 text-[0.98rem] leading-7 text-[#475569]">{area.resumen}</p>
              <span className={cn(pub.linkMore, 'mt-6 text-sm')}>
                {area.enlace} <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-14 max-w-3xl border-t border-[#E1E7F0] pt-6 text-sm leading-6 text-[#5A6A80]">
          Después sumamos protección de datos personales, libro de reclamaciones y prevención de delitos. Lo ambiental,
          municipal y tributario lo vemos con aliados.
        </p>
      </Seccion>

      {/* Criterio */}
      <Seccion
        id="criterio"
        etiqueta="Nuestro criterio"
        tono="oscuro"
        titulo={
          <>
            En una inspección, cuenta lo que puedes <span className="text-[#F5B301]">demostrar</span>.
          </>
        }
        bajada="Por eso cada servicio termina en evidencia, ordenada tal como la revisa el inspector."
      >
        <dl className="grid gap-10 border-t border-[#ffffff]/15 pt-10 sm:grid-cols-3 sm:gap-8">
          {EVIDENCIAS.map((e) => (
            <div key={e.titulo}>
              <dt className="text-2xl font-extrabold tracking-[-0.02em] text-[#ffffff]">{e.titulo}</dt>
              <dd className="mt-3 text-[0.98rem] leading-7 text-[#CBD5E1]">{e.texto}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      {/* 04 — Cómo trabajamos */}
      <Seccion id="como" numero="04" etiqueta="Cómo trabajamos" titulo="Cuatro pasos, siempre en el mismo orden">
        <ol className="relative grid gap-10 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
          <span aria-hidden className="absolute left-0 right-0 top-4 hidden h-px bg-[#D9E0EA] xl:block" />
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="relative">
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1B36] text-xs font-bold text-[#F5B301] ring-8 ring-[#ffffff]">
                {i + 1}
              </span>
              <h3 className="mt-6 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{paso.titulo}</h3>
              <p className="mt-2 text-[0.98rem] leading-7 text-[#475569]">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* 05 — Capacitaciones */}
      <Seccion
        id="capacitaciones"
        numero="05"
        etiqueta="Capacitaciones"
        tono="claro"
        titulo="Las capacitaciones que exige la ley, dictadas por especialistas"
        bajada="Comply360 organiza y responde por la calidad. Cada tema lo dicta el profesional que corresponde."
      >
        <div className="grid gap-10 xl:grid-cols-[1.35fr_1fr] xl:items-start">
          <ul className="border-t border-[#0B1B36]">
            {capacitaciones.map((c) => (
              <li key={c.slug} className="border-b border-[#D9E0EA]">
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
          <aside className="rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">Plan Anual de Capacitaciones</p>
            <p className="mt-5 text-5xl font-extrabold tracking-[-0.04em] tabular-nums">S/ 3,300</p>
            <p className="mt-2 text-sm text-[#94A3B8]">al año + IGV, o S/ 275 al mes</p>
            <p className="mt-6 border-t border-[#ffffff]/10 pt-6 text-[0.98rem] leading-7 text-[#CBD5E1]">
              Incluye las cuatro capacitaciones de SST del año, la especializada en hostigamiento sexual y la de brigadas.
              Cada sesión queda documentada para el inspector.
            </p>
            <Link href="/capacitaciones" className={cn(pub.btnPrimary, 'mt-8 w-full')}>
              Ver el catálogo <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </Seccion>

      {/* 06 — La diferencia */}
      <Seccion id="diferencia" numero="06" etiqueta="La diferencia" titulo="Qué nos distingue de un estudio tradicional">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-t border-[#0B1B36] text-left">
            <caption className="sr-only">Comparación entre un estudio tradicional y Comply360</caption>
            <thead>
              <tr className="border-b border-[#E1E7F0]">
                <th scope="col" className="w-[22%] py-4 pr-6"></th>
                <th scope="col" className="py-4 pr-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A97AB]">
                  Estudio tradicional
                </th>
                <th scope="col" className="py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B1B36]">
                  Comply360
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E7F0]">
              {COMPARACION.map(([fila, tradicional, comply]) => (
                <tr key={fila}>
                  <th scope="row" className="normal-case py-6 pr-6 align-top text-sm font-bold tracking-normal text-[#0B1B36]">
                    {fila}
                  </th>
                  <td className="py-6 pr-6 align-top text-[0.98rem] leading-7 text-[#64748B]">{tradicional}</td>
                  <td className="py-6 align-top text-[0.98rem] font-semibold leading-7 text-[#0B1B36]">{comply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* 07 — Para quién */}
      <Seccion id="para-quien" numero="07" etiqueta="Para quién" tono="claro" titulo="Empresas sin área legal propia">
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {SEGMENTOS.map((s) => (
            <li key={s.titulo} className="border-t border-[#0B1B36] pt-5">
              <p className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{s.titulo}</p>
              <p className="mt-2 text-[0.98rem] leading-7 text-[#475569]">{s.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-sm text-[#475569]">
          ¿Eres contador?{' '}
          <Link href="/contadores" className={pub.link}>
            Conoce el programa para contadores
          </Link>
          .
        </p>
      </Seccion>

      {/* 08 — Precios */}
      <Seccion
        id="precios"
        numero="08"
        etiqueta="Precios"
        titulo="Sabes cuánto pagas antes de empezar"
        bajada="Todos los precios son más IGV. El diagnóstico express es gratis."
      >
        <dl className="border-t border-[#0B1B36]">
          {[
            { etiqueta: 'Iguala mensual', valor: `Desde ${soles(igualaDesde)}`, detalle: 'Al mes, según el tamaño de tu empresa.' },
            { etiqueta: 'Implementación de SST', valor: `Desde ${soles(sstDesde)}`, detalle: 'Pago único, para empresas de 20 a 50 trabajadores.' },
            { etiqueta: 'Plan Anual de Capacitaciones', valor: 'S/ 3,300', detalle: 'Al año, o S/ 275 al mes.' },
          ].map((p) => (
            <div key={p.etiqueta} className="grid gap-2 border-b border-[#E1E7F0] py-7 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
              <dt>
                <span className="block text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">{p.etiqueta}</span>
                <span className="mt-1 block text-sm text-[#5A6A80]">{p.detalle}</span>
              </dt>
              <dd className="text-3xl font-extrabold tracking-[-0.03em] text-[#0B1B36] tabular-nums">{p.valor}</dd>
            </div>
          ))}
        </dl>
        <Link href="/planes" className={cn(pub.btnSecondary, 'mt-10')}>
          Ver planes y precios
        </Link>
      </Seccion>

      {/* 09 — Herramientas gratis */}
      <Seccion id="herramientas" numero="09" etiqueta="Gratis" tono="claro" titulo="Tres herramientas para empezar">
        <div className="grid border-t border-[#0B1B36] sm:grid-cols-3">
          {[
            { href: '/diagnostico-gratis', titulo: 'Diagnóstico gratis', texto: 'Un cuestionario corto para ver tus brechas y tu nivel de riesgo.' },
            { href: '/obligaciones', titulo: '¿Qué debe cumplir mi empresa?', texto: 'Indica cuántos trabajadores tienes y mira lo que te aplica.' },
            { href: '/calculadoras', titulo: 'Calculadoras laborales', texto: 'CTS, gratificación, multas SUNAFIL e IPERC, sin registrarte.' },
          ].map((h) => (
            <Link
              key={h.href}
              href={h.href}
              className="group border-b border-[#D9E0EA] py-7 sm:border-b-0 sm:border-r sm:px-7 sm:first:pl-0 sm:last:border-r-0"
            >
              <span className="flex items-start justify-between gap-3 text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">
                {h.titulo}
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 h-5 w-5 shrink-0 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </span>
              <span className="mt-2 block text-[0.95rem] leading-7 text-[#475569]">{h.texto}</span>
            </Link>
          ))}
        </div>
      </Seccion>

      {/* 10 — Preguntas frecuentes */}
      <Seccion id="preguntas" numero="10" etiqueta="Preguntas frecuentes" titulo="Lo que suelen preguntarnos">
        <Faq faqs={FAQS} titulo={null} />
      </Seccion>

      <CtaBand />
    </PublicShell>
  )
}
