'use client'

import { useState, useMemo } from 'react'
import {
  HelpCircle, Search, BookOpen, Play, Users, FileText, Calculator,
  Shield, Settings, Mail, MessageCircle, ChevronRight, Clock, Video,
  Rocket, ChevronDown, AlertCircle, CheckCircle2, Phone,
  Briefcase, Gavel,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Article {
  title: string
  tag: string
  category: string
}

interface Category {
  id: string
  name: string
  emoji: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  articles: string[]
}

interface FaqItem {
  q: string
  a: string
}

interface FeaturedSection {
  title: string
  subtitle: string
  content: { label: string; body: string }[]
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CATEGORIES: Category[] = [
  {
    id: 'trabajadores',
    name: 'Gestión de Trabajadores',
    emoji: '📋',
    count: 8,
    icon: Users,
    color: 'text-blue-600 text-blue-400',
    bg: 'bg-blue-50 bg-blue-900/30',
    articles: [
      'Cómo registrar un trabajador',
      'Importar trabajadores desde Excel',
      'Regímenes laborales en Perú',
      'Legajo digital: documentos requeridos',
      'Cómo registrar vacaciones',
      'Control de asistencia',
      'Trabajadores extranjeros',
      'Baja y liquidación de trabajador',
    ],
  },
  {
    id: 'contratos',
    name: 'Contratos',
    emoji: '📄',
    count: 5,
    icon: FileText,
    color: 'text-purple-600 text-purple-400',
    bg: 'bg-purple-50 bg-purple-900/30',
    articles: [
      'Tipos de contratos laborales',
      'Cómo crear un contrato desde plantilla',
      'Renovación automática de contratos',
      'Firma electrónica de contratos',
      'Contratos de teletrabajo',
    ],
  },
  {
    id: 'calculadoras',
    name: 'Calculadoras',
    emoji: '🧮',
    count: 6,
    icon: Calculator,
    color: 'text-emerald-600 text-emerald-400',
    bg: 'bg-emerald-50 bg-emerald-900/30',
    articles: [
      'Cómo calcular la CTS',
      'Cálculo de gratificaciones',
      'Liquidación de beneficios',
      'Multas SUNAFIL: cómo evitarlas',
      'Cálculo de horas extras',
      'Aportes AFP vs ONP',
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance',
    emoji: '✅',
    count: 4,
    icon: Shield,
    color: 'text-amber-600 text-amber-400',
    bg: 'bg-amber-50 bg-amber-900/30',
    articles: [
      'Qué es el diagnóstico de compliance',
      'Cómo prepararse para SUNAFIL',
      'Ley 30709: igualdad salarial',
      'Plan de acción de mejora',
    ],
  },
  {
    id: 'configuracion',
    name: 'Configuración',
    emoji: '⚙️',
    count: 3,
    icon: Settings,
    color: 'text-gray-400',
    bg: 'bg-white/[0.04] bg-gray-700',
    articles: [
      'Configurar tu empresa',
      'Gestión de usuarios y roles',
      'Integraciones SUNAT/PLAME',
    ],
  },
]

const ALL_ARTICLES: Article[] = CATEGORIES.flatMap(cat =>
  cat.articles.map(title => ({ title, tag: cat.name, category: cat.id })),
)

const TAG_COLORS: Record<string, string> = {
  'Gestión de Trabajadores': 'bg-blue-100 text-blue-700 bg-blue-900/40 text-blue-300',
  Contratos:                 'bg-purple-100 text-purple-700 bg-purple-900/40 text-purple-300',
  Calculadoras:              'bg-emerald-100 text-emerald-700 bg-emerald-900/40 text-emerald-300',
  Compliance:                'bg-amber-100 text-amber-700 bg-amber-900/40 text-amber-300',
  Configuración:             'bg-white/[0.04] text-gray-300 bg-gray-700 text-gray-300',
}

const VIDEOS = [
  { title: 'Tour del Dashboard',       duration: '3:45', tag: 'Inicio' },
  { title: 'Registrar Trabajadores',   duration: '4:20', tag: 'Trabajadores' },
  { title: 'Ejecutar Diagnóstico',     duration: '5:10', tag: 'Compliance' },
  { title: 'Calculadoras Laborales',   duration: '6:30', tag: 'Calculadoras' },
]

const FEATURED_ARTICLE: FeaturedSection = {
  title: 'Regímenes laborales en Perú',
  subtitle: 'Guía completa sobre los principales regímenes laborales vigentes y sus beneficios',
  content: [
    {
      label: 'Régimen General — D. Leg. 728',
      body: 'Aplica a trabajadores de empresas privadas en general. Otorga: CTS (1 sueldo/año), gratificaciones (2 sueldos/año: julio y diciembre), vacaciones (30 días/año), asignación familiar (S/ 113), ESSALUD (9 % empleador) y acceso a AFP u ONP.',
    },
    {
      label: 'MYPE — Microempresa',
      body: 'Empresas con hasta 10 trabajadores y ventas anuales ≤ 150 UIT. Beneficios reducidos: vacaciones 15 días/año, sin CTS, sin gratificaciones, ESSALUD 9 % (o SIS). Inscripción en REMYPE obligatoria.',
    },
    {
      label: 'MYPE — Pequeña empresa',
      body: 'Empresas con hasta 100 trabajadores y ventas ≤ 1 700 UIT. Vacaciones 15 días/año, CTS al 50 %, gratificaciones al 50 %, ESSALUD 9 %. Acceso a CTS semestral proporcional.',
    },
    {
      label: 'Régimen Agrario — Ley 31110',
      body: 'Desde enero 2021 la remuneración diaria agraria (RDA) incluye CTS y gratificaciones. Aportes ESSALUD: 4 % empleador (mínimo). Se aplica a actividades agrícolas, acuícolas y agroindustriales.',
    },
    {
      label: 'Construcción Civil',
      body: 'Régimen especial regulado por el MTPE. Incluye bonificaciones unilaterales, escolaridad, movilidad y alimentación. Las obras > 50 UIT deben registrarse en el Libro de Planillas de Construcción.',
    },
    {
      label: 'Teletrabajo — Ley 31572',
      body: 'Vigente desde 2022. El empleador debe compensar los gastos de energía e internet. El teletrabajador tiene los mismos derechos que el presencial. Requiere adendum al contrato y registro en T-REGISTRO.',
    },
  ],
}

const FAQS: FaqItem[] = [
  {
    q: '¿Cuándo debo depositar la CTS?',
    a: 'La CTS se deposita dos veces al año: el 15 de mayo (por el período noviembre–abril) y el 15 de noviembre (por el período mayo–octubre). El depósito tardío genera intereses legales y puede derivar en multa SUNAFIL.',
  },
  {
    q: '¿Cuál es la Remuneración Mínima Vital (RMV) vigente?',
    a: 'Desde enero de 2026 la RMV es S/ 1,130 mensuales, según D.S. 005-2025-TR. Ningún trabajador bajo el régimen general puede percibir menos de este monto.',
  },
  {
    q: '¿Qué pasa si no pago la CTS a tiempo?',
    a: 'El trabajador tiene derecho a cobrar intereses legales sobre el monto no depositado. Además, SUNAFIL puede imponer una multa de hasta 100 UIT por infracción grave, dependiendo del número de trabajadores afectados.',
  },
  {
    q: '¿Cuántos días de vacaciones corresponden por ley?',
    a: 'En el régimen general: 30 días calendario por año de servicios. En el régimen MYPE (micro y pequeña empresa): 15 días calendario. El trabajador adquiere derecho a vacaciones tras completar un año de trabajo y cumplir el récord vacacional.',
  },
  {
    q: '¿Qué es el fuero sindical?',
    a: 'Es la protección especial que tienen los dirigentes sindicales frente al despido. Impide que el empleador los despida o traslade sin causa justificada durante el ejercicio de su cargo y hasta 90 días después de concluido. Está regulado por el D.S. 010-2003-TR.',
  },
  {
    q: '¿Cómo se calculan las gratificaciones?',
    a: 'Las gratificaciones equivalen a una remuneración mensual íntegra (sueldo bruto + asignación familiar). Se pagan en julio (fiestas patrias) y diciembre (navidad). El empleador también debe abonar el 9 % de ESSALUD sobre el monto de la gratificación.',
  },
  {
    q: '¿Qué documentos debe tener un legajo digital?',
    a: 'El legajo digital debe contener: DNI o CE, contrato de trabajo, boletas de pago, constancias de entrega de EPP y reglamento interno, declaraciones juradas de asignación familiar y AFP/ONP, y cualquier adendum o renovación contractual.',
  },
  {
    q: '¿Cuál es la diferencia entre AFP y ONP?',
    a: 'La AFP (Sistema Privado) descuenta aprox. 12.52 % del sueldo bruto: 10 % al fondo individual + comisión + seguro. La ONP (Sistema Público) descuenta 13 % al fondo estatal. La jubilación AFP depende del fondo acumulado; la ONP requiere mínimo 20 años de aportación.',
  },
  {
    q: '¿Qué es la Ley 30709 de igualdad salarial?',
    a: 'Prohíbe la discriminación remunerativa entre hombres y mujeres. Obliga a las empresas a elaborar un cuadro de categorías y funciones con sus respectivas remuneraciones, y a registrarlo ante el MTPE. El incumplimiento es infracción grave.',
  },
  {
    q: '¿Qué infracciones verifica SUNAFIL en una inspección?',
    a: 'Las más frecuentes son: falta de registro en T-REGISTRO, planilla incompleta, no pago de beneficios sociales (CTS, gratificaciones, vacaciones), incumplimiento de normas de SST, ausencia de reglamento interno y deficiencias en el legajo de trabajadores.',
  },
]

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function QuickLinkCard({
  emoji,
  title,
  description,
  onClick,
}: {
  emoji: string
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-xl border border-white/[0.08] bg-[#141824] p-5 text-left transition hover:border-indigo-300 hover:shadow-md border-gray-700 bg-gray-800 hover:border-indigo-600"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="text-xs leading-relaxed text-gray-500 text-gray-400">{description}</span>
      <ChevronRight className="mt-auto h-4 w-4 text-indigo-400 opacity-0 transition group-hover:opacity-100 text-indigo-300" />
    </button>
  )
}

function AccordionItem({
  title,
  children,
  open,
  onToggle,
}: {
  title: string
  children: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-white/[0.06] last:border-0 border-gray-700">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-white transition hover:text-indigo-600 text-white hover:text-indigo-400"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform text-gray-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm leading-relaxed text-gray-400">
          {children}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AyudaPage() {
  const [search, setSearch] = useState('')
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set())
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [openFeatured, setOpenFeatured] = useState(false)

  const q = search.toLowerCase().trim()

  /* Search filtering */
  const filteredArticles = useMemo(
    () =>
      q
        ? ALL_ARTICLES.filter(
            a =>
              a.title.toLowerCase().includes(q) ||
              a.tag.toLowerCase().includes(q),
          )
        : [],
    [q],
  )

  const filteredFaqs = useMemo(
    () =>
      q
        ? FAQS.filter(
            f =>
              f.q.toLowerCase().includes(q) ||
              f.a.toLowerCase().includes(q),
          )
        : FAQS,
    [q],
  )

  const filteredCategories = useMemo(
    () =>
      q
        ? CATEGORIES.filter(
            c =>
              c.name.toLowerCase().includes(q) ||
              c.articles.some(a => a.toLowerCase().includes(q)),
          )
        : CATEGORIES,
    [q],
  )

  const hasResults =
    filteredArticles.length > 0 ||
    filteredFaqs.length > 0 ||
    filteredCategories.length > 0

  const toggleFaq = (i: number) =>
    setOpenFaqs(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const toggleCategory = (id: string) =>
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-10 pb-16">

      {/* ── Hero Search ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-10 text-center border-indigo-800 from-indigo-900 to-indigo-950">
        <div className="mb-2 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#141824]/20">
            <HelpCircle className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
          Centro de Ayuda
        </h1>
        <p className="mb-6 text-sm text-indigo-200">
          Guías, tutoriales y respuestas para tu equipo — COMPLY 360
        </p>

        {/* Search bar */}
        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="¿En qué podemos ayudarte?"
            className="w-full rounded-xl border-0 bg-[#141824] py-3.5 pl-12 pr-5 text-sm text-white shadow-lg placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-indigo-300 bg-gray-800 text-white placeholder-gray-500 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:text-gray-300"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* ── Search Results ───────────────────────────────────────── */}
      {q && (
        <section>
          {hasResults ? (
            <>
              <p className="mb-3 text-sm text-gray-500 text-gray-400">
                Resultados para <strong className="text-white">"{search}"</strong>
              </p>
              {filteredArticles.length > 0 && (
                <div className="divide-y divide-gray-100 rounded-xl border border-white/[0.08] bg-[#141824] divide-gray-700 border-gray-700 bg-gray-800">
                  {filteredArticles.map((art, i) => (
                    <button
                      key={i}
                      className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.02] hover:bg-gray-700/50"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-gray-400 text-gray-500" />
                      <span className="flex-1 text-sm text-gray-200">{art.title}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[art.tag] ?? 'bg-white/[0.04] text-gray-600 bg-gray-700 text-gray-300'}`}>
                        {art.tag}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#141824] py-14 border-gray-700 bg-gray-800">
              <Search className="mb-3 h-10 w-10 text-gray-300 text-gray-600" />
              <p className="text-sm font-medium text-gray-600 text-gray-300">
                No se encontraron resultados para &quot;{search}&quot;
              </p>
              <p className="mt-1 text-xs text-gray-400 text-gray-500">
                Intenta con otras palabras o contacta a soporte
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Quick Links ──────────────────────────────────────────── */}
      {!q && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-white">
            Accesos Rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickLinkCard
              emoji="🚀"
              title="Guía de Inicio Rápido"
              description="Configura tu empresa, agrega trabajadores y ejecuta tu primer diagnóstico en minutos."
              onClick={() => scrollTo('categories')}
            />
            <QuickLinkCard
              emoji="📹"
              title="Video Tutoriales"
              description="Aprende visualmente con nuestros videotutoriales paso a paso para cada módulo."
              onClick={() => scrollTo('videos')}
            />
            <QuickLinkCard
              emoji="💬"
              title="Contactar Soporte"
              description="¿Tienes dudas? Nuestro equipo responde por WhatsApp y email en horario hábil."
              onClick={() => scrollTo('contacto')}
            />
          </div>
        </section>
      )}

      {/* ── Categories ───────────────────────────────────────────── */}
      <section id="categories">
        <h2 className="mb-4 text-base font-semibold text-white">
          Categorías de Ayuda
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map(cat => {
            const Icon = cat.icon
            const isOpen = openCategories.has(cat.id)
            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#141824] border-gray-700 bg-gray-800"
              >
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.02] hover:bg-gray-700/40"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cat.bg}`}>
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {cat.emoji} {cat.name}
                    </p>
                    <p className="text-xs text-gray-500 text-gray-400">
                      {cat.count} artículos
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Article list */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] border-gray-700">
                    {cat.articles.map((article, i) => (
                      <button
                        key={i}
                        className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-white/[0.02] hover:bg-gray-700/50"
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400 text-gray-500" />
                        <span className="flex-1 text-xs text-gray-300">
                          {article}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-indigo-500 text-gray-600 group-hover:text-indigo-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Featured Article ─────────────────────────────────────── */}
      {!q && (
        <section id="featured">
          <div className="mb-4 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-indigo-600 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Artículo Destacado
            </h2>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-[#141824] border-indigo-800 bg-gray-800">
            {/* Header */}
            <button
              onClick={() => setOpenFeatured(prev => !prev)}
              className="flex w-full items-start gap-4 p-6 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 bg-indigo-900/40">
                <Briefcase className="h-5 w-5 text-indigo-600 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {FEATURED_ARTICLE.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500 text-gray-400">
                  {FEATURED_ARTICLE.subtitle}
                </p>
              </div>
              <ChevronDown
                className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform text-gray-500 ${openFeatured ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Full content */}
            {openFeatured && (
              <div className="border-t border-indigo-100 px-6 pb-6 pt-4 border-indigo-800">
                <div className="grid gap-4 sm:grid-cols-2">
                  {FEATURED_ARTICLE.content.map((section, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 border-gray-700 bg-gray-700/40"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500 text-indigo-400" />
                        <span className="text-sm font-semibold text-white">
                          {section.label}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-400">
                        {section.body}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-400 text-gray-500">
                  Fuente: Ministerio de Trabajo y Promoción del Empleo (MTPE) — Actualizado 2026
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Video Tutorials ──────────────────────────────────────── */}
      {!q && (
        <section id="videos">
          <div className="mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-indigo-600 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Video Tutoriales
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VIDEOS.map((vid, i) => (
              <button
                key={i}
                className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#141824] text-left transition hover:border-white/10 hover:shadow-md border-gray-700 bg-gray-800 hover:border-gray-600"
              >
                <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 from-indigo-950/40 to-gray-800">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600/90 shadow-lg transition group-hover:scale-110 bg-indigo-500/90">
                    <Play className="h-5 w-5 text-white" fill="white" />
                  </div>
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    <Clock className="h-3 w-3" />
                    {vid.duration}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-white">{vid.title}</p>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TAG_COLORS[vid.tag] ?? 'bg-white/[0.04] text-gray-600 bg-gray-700 text-gray-300'}`}>
                    {vid.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ Section ──────────────────────────────────────────── */}
      <section id="faq">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-indigo-600 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">
            Preguntas Frecuentes
          </h2>
          {q && filteredFaqs.length > 0 && (
            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-900/40 text-indigo-300">
              {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#141824] px-5 border-gray-700 bg-gray-800">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, i) => (
              <AccordionItem
                key={i}
                title={faq.q}
                open={openFaqs.has(i)}
                onToggle={() => toggleFaq(i)}
              >
                {faq.a}
              </AccordionItem>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-gray-400 text-gray-500">
              No hay preguntas que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </section>

      {/* ── Contact Support ──────────────────────────────────────── */}
      <section id="contacto">
        <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-6 border-gray-700 bg-gray-800">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 bg-indigo-900/40">
              <MessageCircle className="h-6 w-6 text-indigo-600 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              ¿No encontraste lo que buscas?
            </h2>
            <p className="mt-1 text-sm text-gray-500 text-gray-400">
              Nuestro equipo de soporte especializado en derecho laboral está listo para ayudarte
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/51999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 bg-green-700 hover:bg-green-600"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href="mailto:soporte@comply360.pe"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#141824] px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.02] border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                <Mail className="h-4 w-4" />
                soporte@comply360.pe
              </a>
              <button
                onClick={() => {
                  const subject = encodeURIComponent('Consulta Centro de Ayuda — COMPLY 360')
                  window.location.href = `mailto:soporte@comply360.pe?subject=${subject}`
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 border-indigo-800 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50"
              >
                <Rocket className="h-4 w-4" />
                Solicitar demo
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/[0.02] px-4 py-2.5 bg-gray-700/50">
                <Clock className="h-4 w-4 text-gray-400 text-gray-500" />
                <span className="text-xs text-gray-400">Lun – Vie, 9:00 – 18:00</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/[0.02] px-4 py-2.5 bg-gray-700/50">
                <MessageCircle className="h-4 w-4 text-gray-400 text-gray-500" />
                <span className="text-xs text-gray-400">Respuesta en &lt; 2 horas</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/[0.02] px-4 py-2.5 bg-gray-700/50">
                <Shield className="h-4 w-4 text-gray-400 text-gray-500" />
                <span className="text-xs text-gray-400">Especialistas laborales</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
