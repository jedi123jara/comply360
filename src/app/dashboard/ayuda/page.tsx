'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BookText,
  Briefcase,
  Calculator,
  ChevronDown,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/brand'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import {
  GLOSSARY,
  GLOSSARY_ANCHOR_PREFIX,
  GLOSSARY_CATEGORIES,
  getTerm,
  glossaryAnchor,
  normalizeText,
  searchGlossary,
  solesCortos,
  type GlossaryCategory,
  type GlossaryEntry,
} from '@/lib/glossary'
import { TermDetails } from '@/components/ui/term'

/* ------------------------------------------------------------------ */
/*  Valores vigentes (siempre desde PERU_LABOR, nunca a mano)          */
/* ------------------------------------------------------------------ */

const RMV = PERU_LABOR.RMV
const UIT = PERU_LABOR.UIT
const ASIG_FAM = RMV * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE
const MICRO = PERU_LABOR.MYPE.MICRO
const PEQUENA = PERU_LABOR.MYPE.PEQUENA
const BETA = RMV * PERU_LABOR.AGRARIO.BETA_PORCENTAJE
const pct = (tasa: number) => `${Math.round(tasa * 10000) / 100} %`

/* ------------------------------------------------------------------ */
/*  Tipos y datos                                                      */
/* ------------------------------------------------------------------ */

interface GuideLink {
  title: string
  description: string
  href: string
}

interface GuideCategory {
  id: string
  name: string
  icon: LucideIcon
  links: GuideLink[]
}

/** Guías por tema: cada enlace lleva a la pantalla donde se hace la tarea. */
const GUIDES: GuideCategory[] = [
  {
    id: 'trabajadores',
    name: 'Trabajadores',
    icon: Users,
    links: [
      {
        title: 'Registrar un trabajador',
        description: 'Sus datos personales, laborales y de seguros. Te avisamos si algo no cumple la ley.',
        href: '/dashboard/trabajadores/nuevo',
      },
      {
        title: 'Importar trabajadores desde Excel',
        description: 'En la lista de trabajadores, usa el botón "Importar / Exportar".',
        href: '/dashboard/trabajadores',
      },
      {
        title: 'Trabajadores extranjeros',
        description: 'Revisa la situación de tu personal extranjero.',
        href: '/dashboard/trabajadores/extranjeros',
      },
      {
        title: 'Vacaciones',
        description: 'Controla los días ganados y gozados para evitar pagos dobles.',
        href: '/dashboard/vacaciones',
      },
      {
        title: 'Control de asistencia',
        description: 'Entradas, salidas y tardanzas de tu equipo.',
        href: '/dashboard/asistencia',
      },
    ],
  },
  {
    id: 'contratos',
    name: 'Contratos',
    icon: FileText,
    links: [
      {
        title: 'Ver y crear contratos',
        description: 'Todos los contratos de tu empresa en un solo lugar.',
        href: '/dashboard/contratos',
      },
      {
        title: 'Plantillas de tu empresa',
        description: 'Sube los contratos que revisó tu abogado y complétalos con los datos de cada trabajador.',
        href: '/dashboard/configuracion/empresa/plantillas',
      },
      {
        title: 'Revisar un contrato',
        description: 'Encuentra cláusulas con riesgo antes de firmar.',
        href: '/dashboard/analizar-contrato',
      },
    ],
  },
  {
    id: 'calculadoras',
    name: 'Calculadoras',
    icon: Calculator,
    links: [
      { title: 'CTS', description: 'Cuánto depositar en mayo y noviembre.', href: '/dashboard/calculadoras/cts' },
      {
        title: 'Gratificación',
        description: 'El pago de julio y diciembre, con su bonificación.',
        href: '/dashboard/calculadoras/gratificacion',
      },
      {
        title: 'Liquidación',
        description: 'Lo que debes pagar cuando alguien deja la empresa.',
        href: '/dashboard/calculadoras/liquidacion',
      },
      {
        title: 'Vacaciones',
        description: 'Vacaciones ganadas, truncas o vencidas.',
        href: '/dashboard/calculadoras/vacaciones',
      },
      {
        title: 'Aportes AFP u ONP',
        description: 'Cuánto se descuenta del sueldo para la pensión.',
        href: '/dashboard/calculadoras/aportes',
      },
      {
        title: 'Multa SUNAFIL',
        description: 'Cuánto podría costar una infracción.',
        href: '/dashboard/calculadoras/multa-sunafil',
      },
    ],
  },
  {
    id: 'cumplimiento',
    name: 'Cumplimiento',
    icon: Shield,
    links: [
      {
        title: 'Diagnóstico de cumplimiento',
        description: 'Responde preguntas y descubre tus puntos débiles ante SUNAFIL.',
        href: '/dashboard/diagnostico',
      },
      {
        title: 'Simulacro de inspección',
        description: 'Practica una inspección de SUNAFIL sin riesgo.',
        href: '/dashboard/simulacro',
      },
      {
        title: 'Plan de acción',
        description: 'Tus tareas pendientes, ordenadas por urgencia.',
        href: '/dashboard/plan-accion',
      },
      {
        title: 'Seguridad y salud en el trabajo',
        description: 'Comité, IPERC, exámenes médicos, EPP y más.',
        href: '/dashboard/sst',
      },
      {
        title: 'Igualdad salarial (Ley 30709)',
        description: 'Revisa tu cuadro de categorías y las brechas de sueldo.',
        href: '/dashboard/igualdad-salarial',
      },
    ],
  },
  {
    id: 'configuracion',
    name: 'Configuración',
    icon: Settings,
    links: [
      {
        title: 'Datos de tu empresa',
        description: 'RUC, razón social y logo.',
        href: '/dashboard/configuracion/empresa',
      },
      {
        title: 'Usuarios y equipo',
        description: 'Invita a tu equipo y define qué puede ver o hacer cada uno.',
        href: '/dashboard/configuracion/equipo',
      },
      {
        title: 'Archivos para T-Registro y PLAME',
        description: 'Prepara la información para la planilla electrónica de SUNAT.',
        href: '/dashboard/integraciones',
      },
    ],
  },
]

interface FeaturedItem {
  label: string
  body: string
  termId?: string
}

const FEATURED: { title: string; subtitle: string; items: FeaturedItem[] } = {
  title: 'Regímenes laborales en el Perú',
  subtitle: 'Qué beneficios corresponden en cada uno, en simple.',
  items: [
    {
      label: 'Régimen general (D.Leg. 728)',
      body: `El régimen común de la actividad privada. Da CTS (cerca de un sueldo al año, en dos depósitos), dos gratificaciones con su bonificación del ${pct(PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA)}, ${PERU_LABOR.VACACIONES.DIAS_POR_ANO} días de vacaciones, asignación familiar de ${solesCortos(ASIG_FAM)} si corresponde, EsSalud (${pct(PERU_LABOR.APORTES.ESSALUD_TASA)} a cargo de la empresa) y pensión en AFP u ONP.`,
      termId: 'regimen-general',
    },
    {
      label: 'Microempresa (Ley 32353)',
      body: `Ventas de hasta ${MICRO.VENTAS_MAX_UIT_ANUALES} UIT al año (${solesCortos(MICRO.VENTAS_MAX_UIT_ANUALES * UIT)}) e inscripción vigente en el REMYPE. ${MICRO.VACACIONES_DIAS} días de vacaciones; no corresponden CTS ni gratificaciones. Indemnización por despido: ${MICRO.INDEMNIZACION_FACTOR_DIARIO} remuneraciones diarias por año, con un máximo de ${MICRO.INDEMNIZACION_TOPE_DIARIO}.`,
      termId: 'regimen-mype',
    },
    {
      label: 'Pequeña empresa (Ley 32353)',
      body: `Ventas de hasta ${PEQUENA.VENTAS_MAX_UIT_ANUALES.toLocaleString('en-US')} UIT al año e inscripción vigente en el REMYPE. ${PEQUENA.VACACIONES_DIAS} días de vacaciones, CTS y gratificaciones a la mitad del régimen general, EsSalud y Seguro Vida Ley. Indemnización por despido: ${PEQUENA.INDEMNIZACION_FACTOR_DIARIO} remuneraciones diarias por año, con un máximo de ${PEQUENA.INDEMNIZACION_TOPE_DIARIO}.`,
      termId: 'remype',
    },
    {
      label: 'Régimen agrario (Ley 31110)',
      body: `Para actividades agrarias, agroexportadoras y agroindustriales. La CTS y las gratificaciones pueden pagarse dentro de la remuneración diaria. Incluye la bonificación BETA (${pct(PERU_LABOR.AGRARIO.BETA_PORCENTAJE)} de la RMV: hoy ${solesCortos(BETA)} al mes). El aporte a EsSalud tiene una tasa especial.`,
      termId: 'regimen-agrario',
    },
    {
      label: 'Construcción civil',
      body: 'Para obreros de obras de construcción. Los jornales y bonificaciones (como la BUC, la movilidad y la bonificación por escolaridad) se fijan en el convenio colectivo del sector, que suele renovarse cada año.',
      termId: 'construccion-civil',
    },
    {
      label: 'Teletrabajo (Ley 31572)',
      body: 'El teletrabajador tiene los mismos derechos que quien trabaja de forma presencial. Se acuerda por escrito, en el contrato o en una adenda. Si usa sus propios equipos o internet, la empresa debe compensar esos gastos.',
    },
  ],
}

interface FaqItem {
  q: string
  a: string
  /** Términos del glosario para profundizar. */
  terms?: string[]
}

const FAQS: FaqItem[] = [
  {
    q: '¿Qué significan las palabras subrayadas con puntos?',
    a: 'Son términos del glosario. Pasa el mouse, tócalas o enfócalas con el teclado para ver qué significan, por qué importan, un ejemplo y la norma que las regula. Todas están reunidas en el glosario de esta página.',
  },
  {
    q: '¿Cuándo debo depositar la CTS?',
    a: `Dos veces al año: hasta el ${PERU_LABOR.CTS.DEPOSITO_MAYO.dia} de mayo (por noviembre a abril) y hasta el ${PERU_LABOR.CTS.DEPOSITO_NOVIEMBRE.dia} de noviembre (por mayo a octubre). Si depositas tarde, debes intereses y te expones a una multa de SUNAFIL.`,
    terms: ['cts'],
  },
  {
    q: '¿Cuál es la Remuneración Mínima Vital (RMV) vigente?',
    a: `Hoy la RMV es ${solesCortos(RMV)} al mes. Nadie que trabaje a jornada completa puede ganar menos. La asignación familiar equivale al ${pct(PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)} de la RMV: ${solesCortos(ASIG_FAM)}.`,
    terms: ['rmv', 'asignacion-familiar'],
  },
  {
    q: '¿Qué pasa si no pago la CTS a tiempo?',
    a: 'El trabajador puede cobrar el monto con intereses. Además, SUNAFIL puede multarte. La multa depende del tamaño de tu empresa y de cuántos trabajadores están afectados, y se calcula en UIT.',
    terms: ['cts', 'multa-sunafil'],
  },
  {
    q: '¿Cuántos días de vacaciones corresponden por ley?',
    a: `En el régimen general, ${PERU_LABOR.VACACIONES.DIAS_POR_ANO} días calendario por cada año completo de trabajo. En la micro y pequeña empresa, ${MICRO.VACACIONES_DIAS} días. Para ganarlas, el trabajador debe cumplir un año de servicio y los días de trabajo exigidos (récord vacacional).`,
    terms: ['vacaciones', 'indemnizacion-vacacional'],
  },
  {
    q: '¿Cómo se calculan las gratificaciones?',
    a: `Cada gratificación equivale a un sueldo completo (incluida la asignación familiar) si el trabajador laboró todo el semestre: enero a junio para la de julio, y julio a diciembre para la de diciembre. Si trabajó menos, se paga en proporción a los meses completos. Además, la empresa le paga una bonificación extraordinaria del ${pct(PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA)}.`,
    terms: ['gratificacion', 'bonificacion-extraordinaria'],
  },
  {
    q: '¿Cuál es la diferencia entre AFP y ONP?',
    a: `En la ONP se descuenta el ${pct(PERU_LABOR.APORTES.ONP_TASA)} del sueldo y va a un fondo común del Estado. En la AFP se descuenta el ${pct(PERU_LABOR.APORTES.AFP_APORTE_OBLIGATORIO)} para la cuenta individual del trabajador, más la prima del seguro y la comisión de cada AFP. La empresa retiene esos montos y los paga a tiempo.`,
    terms: ['afp', 'onp', 'cuspp'],
  },
  {
    q: '¿Qué documentos debe tener el legajo de un trabajador?',
    a: 'No hay una lista única en la ley. Lo recomendable es guardar: copia del DNI o carné de extranjería, contrato y adendas, boletas de pago con su constancia de entrega, constancias de entrega del EPP y del reglamento interno, resultados de aptitud de los exámenes médicos, capacitaciones y la elección de AFP u ONP.',
    terms: ['legajo', 'boleta-de-pago', 'epp'],
  },
  {
    q: '¿Qué es el fuero sindical?',
    a: 'Es la protección que tienen los dirigentes sindicales y otros trabajadores, como los candidatos en elecciones sindicales: no pueden ser despedidos ni trasladados sin causa justa. Lo regula el TUO de la Ley de Relaciones Colectivas de Trabajo (D.S. 010-2003-TR).',
  },
  {
    q: '¿Qué pide la Ley 30709 de igualdad salarial?',
    a: 'Prohíbe pagar distinto a hombres y mujeres por un trabajo de igual valor. Te pide tener un cuadro de categorías y funciones y una política salarial, e informarlos a tus trabajadores. No cumplirla puede generar multas de SUNAFIL.',
    terms: ['multa-sunafil'],
  },
  {
    q: '¿Qué suele revisar SUNAFIL en una inspección?',
    a: 'Entre lo más común: trabajadores sin registrar en planilla (T-Registro), pagos incompletos de CTS, gratificaciones o vacaciones, boletas sin entregar y documentos de seguridad y salud en el trabajo (IPERC, capacitaciones, exámenes médicos).',
    terms: ['inspeccion', 't-registro', 'sst'],
  },
]

const CATEGORY_KEYS = Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]
const CATEGORY_COUNTS = GLOSSARY.reduce(
  (acc, e) => ({ ...acc, [e.categoria]: (acc[e.categoria] ?? 0) + 1 }),
  {} as Partial<Record<GlossaryCategory, number>>,
)

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Todas las palabras de la búsqueda aparecen en el texto (sin tildes ni mayúsculas). */
function matches(text: string, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true
  const hay = normalizeText(text)
  return q.split(' ').every((t) => hay.includes(t))
}

/** "CTS (Compensación por Tiempo de Servicios)" → "CTS". */
function shortTerm(entry: GlossaryEntry): string {
  return entry.term.split(' (')[0]
}

const CARD = 'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]'
const SECTION_TITLE = 'flex items-center gap-2 text-base font-semibold text-[color:var(--text-primary)]'
const CHIP =
  'inline-flex items-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

/* ------------------------------------------------------------------ */
/*  Sub-componentes                                                    */
/* ------------------------------------------------------------------ */

function QuickLinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className={cn(
        CARD,
        'group flex flex-col items-start gap-2 p-5 text-left transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</span>
      <span className="text-xs leading-relaxed text-[color:var(--text-tertiary)]">{description}</span>
    </a>
  )
}

function TermChips({ ids, onGoTo }: { ids: readonly string[]; onGoTo: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const entry = getTerm(id)
        if (!entry) return null
        return (
          <a
            key={id}
            href={`#${glossaryAnchor(entry.id)}`}
            onClick={(e) => {
              e.preventDefault()
              onGoTo(entry.id)
            }}
            className={CHIP}
          >
            {shortTerm(entry)}
          </a>
        )
      })}
    </div>
  )
}

function GlossaryCard({
  entry,
  open,
  highlighted,
  onToggle,
  onGoTo,
}: {
  entry: GlossaryEntry
  open: boolean
  highlighted: boolean
  onToggle: () => void
  onGoTo: (id: string) => void
}) {
  const anchor = glossaryAnchor(entry.id)
  const detailId = `${anchor}-detalle`
  return (
    <article
      id={anchor}
      tabIndex={-1}
      aria-labelledby={`${anchor}-titulo`}
      className={cn(
        CARD,
        'h-full scroll-mt-24 p-4 transition-shadow focus:outline-none',
        highlighted && 'border-primary ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={`${anchor}-titulo`} className="text-sm font-semibold leading-snug text-[color:var(--text-primary)]">
          {entry.term}
        </h3>
        <span className="shrink-0 rounded-full bg-[color:var(--bg-inset)] px-2 py-0.5 text-[10.5px] font-medium text-[color:var(--text-tertiary)]">
          {GLOSSARY_CATEGORIES[entry.categoria].label}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">{entry.queEs}</p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {open ? 'Ocultar detalle' : 'Por qué importa, ejemplo y base legal'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div id={detailId} hidden={!open} className="mt-3 border-t border-[color:var(--border-subtle)] pt-3">
        <TermDetails entry={entry} omit={['queEs']} />
        {entry.relacionados?.length ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Términos relacionados
            </p>
            <TermChips ids={entry.relacionados} onGoTo={onGoTo} />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function AccordionItem({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const panelId = `${id}-respuesta`
  return (
    <div className="border-b border-[color:var(--border-subtle)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-[color:var(--text-primary)] transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div id={panelId} hidden={!open} className="space-y-3 pb-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

type CategoryFilter = GlossaryCategory | 'todas'

export default function AyudaPage() {
  const [search, setSearch] = useState('')
  const [openFaqs, setOpenFaqs] = useState<Set<string>>(new Set())
  const [openFeatured, setOpenFeatured] = useState(false)

  // Glosario
  const [glossaryQuery, setGlossaryQuery] = useState('')
  const [glossaryCat, setGlossaryCat] = useState<CategoryFilter>('todas')
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [scrollNonce, setScrollNonce] = useState(0)
  const pendingScroll = useRef<string | null>(null)
  const highlightTimer = useRef<number | undefined>(undefined)

  const q = normalizeText(search)

  /* Búsqueda general (sin tildes ni mayúsculas) */
  const filteredGuides = useMemo(
    () =>
      GUIDES.map((cat) => ({
        ...cat,
        links: q ? cat.links.filter((l) => matches(`${cat.name} ${l.title} ${l.description}`, q)) : cat.links,
      })).filter((cat) => cat.links.length > 0),
    [q],
  )
  const guideHits = useMemo(
    () => (q ? filteredGuides.flatMap((cat) => cat.links.map((l) => ({ ...l, category: cat.name }))) : []),
    [q, filteredGuides],
  )
  const termHits = useMemo(() => (q ? searchGlossary(q).slice(0, 6) : []), [q])
  const filteredFaqs = useMemo(() => (q ? FAQS.filter((f) => matches(`${f.q} ${f.a}`, q)) : FAQS), [q])
  const hasResults = guideHits.length > 0 || termHits.length > 0 || filteredFaqs.length > 0

  const glossaryResults = useMemo(
    () => searchGlossary(glossaryQuery).filter((e) => glossaryCat === 'todas' || e.categoria === glossaryCat),
    [glossaryQuery, glossaryCat],
  )

  /** Lleva a un término del glosario: limpia filtros, lo abre, lo resalta y hace scroll. */
  const goToTerm = useCallback((idOrAlias: string) => {
    const entry = getTerm(idOrAlias)
    if (!entry) return
    setGlossaryQuery('')
    setGlossaryCat('todas')
    setOpenTerms((prev) => new Set(prev).add(entry.id))
    setHighlightId(entry.id)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2500)
    const hash = `#${glossaryAnchor(entry.id)}`
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash)
    pendingScroll.current = entry.id
    setScrollNonce((n) => n + 1)
  }, [])

  // Scroll después de que el término quedó visible y abierto.
  useEffect(() => {
    const id = pendingScroll.current
    if (!id) return
    pendingScroll.current = null
    const el = document.getElementById(glossaryAnchor(id))
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }, [scrollNonce])

  // Entradas desde otras pantallas: /dashboard/ayuda#glosario-cts
  useEffect(() => {
    const fromHash = () => {
      let hash = ''
      try {
        hash = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        return
      }
      if (hash.startsWith(GLOSSARY_ANCHOR_PREFIX)) goToTerm(hash.slice(GLOSSARY_ANCHOR_PREFIX.length))
    }
    const t = window.setTimeout(fromHash, 0)
    window.addEventListener('hashchange', fromHash)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('hashchange', fromHash)
    }
  }, [goToTerm])

  useEffect(() => () => window.clearTimeout(highlightTimer.current), [])

  const toggleFaq = (key: string) =>
    setOpenFaqs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleTerm = (id: string) =>
    setOpenTerms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-10 pb-16">
      {/* ── Cabecera con buscador ─────────────────────────────────── */}
      <section className={cn(CARD, 'relative overflow-hidden px-6 py-8 text-center sm:py-10')}>
        <div className="mb-3 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HelpCircle className="h-7 w-7" aria-hidden />
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--text-primary)] sm:text-3xl">Centro de ayuda</h1>
        <p className="mb-6 text-sm text-[color:var(--text-secondary)]">
          Guías, glosario y respuestas en lenguaje simple para tu equipo.
        </p>

        <div className="relative mx-auto max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar en el centro de ayuda"
            placeholder="¿Qué necesitas? Por ejemplo: CTS, vacaciones, multa"
            className="w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] py-3.5 pl-12 pr-11 text-sm text-[color:var(--text-primary)] shadow-sm outline-none transition placeholder:text-[color:var(--text-tertiary)] focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-inset)] hover:text-[color:var(--text-secondary)]"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </section>

      {/* ── Resultados de la búsqueda general ─────────────────────── */}
      {q ? (
        <section aria-labelledby="resultados-titulo">
          <h2 id="resultados-titulo" className="sr-only">
            Resultados de la búsqueda
          </h2>
          {hasResults ? (
            <div className="space-y-5">
              <p className="text-sm text-[color:var(--text-secondary)]" aria-live="polite">
                Resultados para <strong className="text-[color:var(--text-primary)]">&ldquo;{search.trim()}&rdquo;</strong>
              </p>

              {termHits.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                    En el glosario
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {termHits.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => goToTerm(entry.id)}
                          className={cn(
                            CARD,
                            'flex h-full w-full items-start gap-3 px-4 py-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          )}
                        >
                          <BookText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                              {entry.term}
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-[color:var(--text-tertiary)]">
                              {entry.queEs}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {guideHits.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                    Guías
                  </h3>
                  <ul className={cn(CARD, 'divide-y divide-[color:var(--border-subtle)]')}>
                    {guideHits.map((link) => (
                      <li key={`${link.category}-${link.href}-${link.title}`}>
                        <Link
                          href={link.href}
                          className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[color:var(--text-primary)]">{link.title}</span>
                            <span className="block text-xs text-[color:var(--text-tertiary)]">{link.description}</span>
                          </span>
                          <span className="hidden rounded-full bg-[color:var(--bg-inset)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--text-secondary)] sm:inline">
                            {link.category}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {filteredFaqs.length > 0 ? (
                <p className="text-sm text-[color:var(--text-secondary)]">
                  También hay {filteredFaqs.length}{' '}
                  {filteredFaqs.length === 1 ? 'pregunta frecuente relacionada' : 'preguntas frecuentes relacionadas'}{' '}
                  <a href="#faq" className="font-semibold text-primary hover:underline">
                    más abajo
                  </a>
                  .
                </p>
              ) : null}
            </div>
          ) : (
            <div className={cn(CARD, 'flex flex-col items-center justify-center px-6 py-12 text-center')}>
              <Search className="mb-3 h-10 w-10 text-[color:var(--text-tertiary)]" aria-hidden />
              <p className="text-sm font-medium text-[color:var(--text-primary)]" aria-live="polite">
                No encontramos resultados para &ldquo;{search.trim()}&rdquo;
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                Prueba con otra palabra o una sigla, o{' '}
                <a href="#contacto" className="font-semibold text-primary hover:underline">
                  escríbenos
                </a>
                .
              </p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── Accesos rápidos ───────────────────────────────────────── */}
      {!q ? (
        <section aria-labelledby="accesos-titulo">
          <h2 id="accesos-titulo" className={cn(SECTION_TITLE, 'mb-4')}>
            Accesos rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLinkCard
              icon={BookOpen}
              title="Guías por tema"
              description="Te llevamos directo a la pantalla donde se hace cada tarea."
              href="#guias"
            />
            <QuickLinkCard
              icon={BookText}
              title="Glosario laboral"
              description="CTS, SCTR, UIT, REMYPE… explicados en simple y con ejemplos."
              href="#glosario"
            />
            <QuickLinkCard
              icon={AlertCircle}
              title="Preguntas frecuentes"
              description="Respuestas cortas a las dudas más comunes."
              href="#faq"
            />
            <QuickLinkCard
              icon={LifeBuoy}
              title="Contactar soporte"
              description="Crea un ticket o escríbenos por correo."
              href="#contacto"
            />
          </div>
        </section>
      ) : null}

      {/* ── Guías por tema ────────────────────────────────────────── */}
      {!q ? (
        <section id="guias" aria-labelledby="guias-titulo" className="scroll-mt-24">
          <h2 id="guias-titulo" className={cn(SECTION_TITLE, 'mb-4')}>
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            Guías por tema
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGuides.map((cat) => {
              const Icon = cat.icon
              return (
                <div key={cat.id} className={cn(CARD, 'overflow-hidden')}>
                  <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{cat.name}</h3>
                  </div>
                  <ul>
                    {cat.links.map((link) => (
                      <li key={link.title}>
                        <Link
                          href={link.href}
                          className="group flex items-start gap-3 px-5 py-2.5 transition hover:bg-[color:var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-[color:var(--text-primary)]">
                              {link.title}
                            </span>
                            <span className="block text-xs leading-snug text-[color:var(--text-tertiary)]">
                              {link.description}
                            </span>
                          </span>
                          <ArrowRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* ── Glosario ──────────────────────────────────────────────── */}
      <section id="glosario" aria-labelledby="glosario-titulo" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h2 id="glosario-titulo" className={SECTION_TITLE}>
              <BookText className="h-5 w-5 text-primary" aria-hidden />
              Glosario laboral
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Las palabras que verás en la plataforma, explicadas en simple. En otras pantallas, las palabras con{' '}
              <span className="underline decoration-dotted decoration-[1.5px] underline-offset-[3px]">subrayado de puntos</span>{' '}
              abren esta misma explicación.
            </p>
          </div>
          <span className="text-xs text-[color:var(--text-tertiary)]">{GLOSSARY.length} términos</span>
        </div>

        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            aria-hidden
          />
          <input
            type="search"
            value={glossaryQuery}
            onChange={(e) => setGlossaryQuery(e.target.value)}
            aria-label="Buscar en el glosario"
            placeholder="Busca una palabra o sigla: CTS, gratificacion, SCTR…"
            className="w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] py-2.5 pl-10 pr-4 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-tertiary)] focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div role="group" aria-label="Filtrar el glosario por tema" className="mb-4 flex flex-wrap gap-2">
          {(['todas', ...CATEGORY_KEYS] as CategoryFilter[]).map((key) => {
            const active = glossaryCat === key
            const label = key === 'todas' ? 'Todos' : GLOSSARY_CATEGORIES[key].label
            const count = key === 'todas' ? GLOSSARY.length : (CATEGORY_COUNTS[key] ?? 0)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setGlossaryCat(key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] hover:border-primary hover:text-primary',
                )}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          {glossaryResults.length === 1 ? '1 término encontrado' : `${glossaryResults.length} términos encontrados`}
        </p>

        {glossaryResults.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {glossaryResults.map((entry) => (
              <li key={entry.id}>
                <GlossaryCard
                  entry={entry}
                  open={openTerms.has(entry.id)}
                  highlighted={highlightId === entry.id}
                  onToggle={() => toggleTerm(entry.id)}
                  onGoTo={goToTerm}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn(CARD, 'px-6 py-10 text-center')}>
            <p className="text-sm font-medium text-[color:var(--text-primary)]">
              No encontramos &ldquo;{glossaryQuery.trim()}&rdquo; en el glosario.
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
              Prueba con otra palabra o una sigla, por ejemplo: CTS, UIT o SCTR.
            </p>
            <button
              type="button"
              onClick={() => {
                setGlossaryQuery('')
                setGlossaryCat('todas')
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Ver todos los términos
            </button>
          </div>
        )}
      </section>

      {/* ── Artículo destacado: regímenes ─────────────────────────── */}
      {!q ? (
        <section aria-labelledby="destacado-titulo">
          <h2 id="destacado-titulo" className={cn(SECTION_TITLE, 'mb-4')}>
            <Briefcase className="h-5 w-5 text-primary" aria-hidden />
            Artículo destacado
          </h2>

          <div className={CARD}>
            <button
              type="button"
              onClick={() => setOpenFeatured((prev) => !prev)}
              aria-expanded={openFeatured}
              aria-controls="destacado-contenido"
              className="flex w-full items-start gap-4 p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
            >
              <div className="flex-1">
                <p className="font-semibold text-[color:var(--text-primary)]">{FEATURED.title}</p>
                <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">{FEATURED.subtitle}</p>
              </div>
              <ChevronDown
                className={cn(
                  'mt-1 h-5 w-5 shrink-0 text-[color:var(--text-tertiary)] transition-transform',
                  openFeatured && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            <div
              id="destacado-contenido"
              hidden={!openFeatured}
              className="border-t border-[color:var(--border-subtle)] px-6 pb-6 pt-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {FEATURED.items.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] p-4"
                  >
                    <p className="mb-1.5 text-sm font-semibold text-[color:var(--text-primary)]">{item.label}</p>
                    <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">{item.body}</p>
                    {item.termId ? (
                      <button
                        type="button"
                        onClick={() => goToTerm(item.termId as string)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Ver en el glosario
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[color:var(--text-tertiary)]">
                Resumen informativo con los valores vigentes en la plataforma (RMV {solesCortos(RMV)}, UIT{' '}
                {solesCortos(UIT)}). Para un caso concreto, consulta con tu asesor laboral.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Preguntas frecuentes ──────────────────────────────────── */}
      <section id="faq" aria-labelledby="faq-titulo" className="scroll-mt-24">
        <div className="mb-4 flex items-center gap-2">
          <h2 id="faq-titulo" className={SECTION_TITLE}>
            <AlertCircle className="h-5 w-5 text-primary" aria-hidden />
            Preguntas frecuentes
          </h2>
          {q && filteredFaqs.length > 0 ? (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className={cn(CARD, 'px-5')}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <AccordionItem
                key={faq.q}
                id={`faq-${FAQS.indexOf(faq)}`}
                title={faq.q}
                open={openFaqs.has(faq.q)}
                onToggle={() => toggleFaq(faq.q)}
              >
                <p>{faq.a}</p>
                {faq.terms?.length ? (
                  <div className="space-y-1.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                      Para entender más
                    </p>
                    <TermChips ids={faq.terms} onGoTo={goToTerm} />
                  </div>
                ) : null}
              </AccordionItem>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-[color:var(--text-tertiary)]">
              No hay preguntas que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </section>

      {/* ── Contacto ──────────────────────────────────────────────── */}
      <section id="contacto" aria-labelledby="contacto-titulo" className="scroll-mt-24">
        <div className={cn(CARD, 'p-6')}>
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LifeBuoy className="h-6 w-6" aria-hidden />
            </span>
            <h2 id="contacto-titulo" className="text-lg font-semibold text-[color:var(--text-primary)]">
              ¿No encontraste lo que buscas?
            </h2>
            <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
              Escríbenos y te ayudamos. Cuéntanos qué querías hacer y en qué pantalla estabas.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/configuracion/soporte"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <LifeBuoy className="h-4 w-4" aria-hidden />
                Crear un ticket de soporte
              </Link>
              <a
                href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent('Consulta desde el Centro de ayuda')}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-5 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Mail className="h-4 w-4" aria-hidden />
                {BRAND.supportEmail}
              </a>
            </div>

            <p className="mt-5 max-w-lg text-xs text-[color:var(--text-tertiary)]">
              La información de esta página es general y no reemplaza la asesoría de un abogado para tu caso concreto.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
