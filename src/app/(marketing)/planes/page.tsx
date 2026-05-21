import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { MarketingPricingGrid } from '@/components/marketing/pricing-grid'
import { PLANS } from '@/lib/constants'
import { getMarketingPlanLimit, type MarketingPlanKey } from '@/lib/marketing-pricing'
import { formatSolesMarketing } from '@/lib/format/peruvian'

export const metadata = {
  title: 'Planes y precios',
  description:
    'Planes Comply360 para compliance laboral peruano. Desde 249 nuevos soles/mes, con Pro como plan recomendado para empresas en crecimiento.',
}

const fitCards: Array<{
  plan: MarketingPlanKey
  title: string
  body: string
  signal: string
}> = [
  {
    plan: 'STARTER',
    title: 'Ordenar lo básico',
    body: 'Para dejar atrás Excel, carpetas sueltas y alertas manuales en una MYPE.',
    signal: 'Hasta 20 trabajadores',
  },
  {
    plan: 'PRO',
    title: 'Crecer con control',
    body: 'Para sumar IA, SST, simulacro SUNAFIL, denuncias y trazabilidad diaria.',
    signal: 'Hasta 75 trabajadores',
  },
  {
    plan: 'EMPRESA',
    title: 'Operar multi-sede',
    body: 'Para sumar portal trabajador, e-learning, reportes ejecutivos y SLA alto.',
    signal: 'Hasta 250 trabajadores',
  },
]

const comparison: Array<{
  plan: MarketingPlanKey
  ideal: string
  value: string
}> = [
  {
    plan: 'FREE',
    ideal: 'Validar calculadoras y diagnóstico inicial.',
    value: 'Primer mapa de riesgo sin tarjeta.',
  },
  {
    plan: 'STARTER',
    ideal: 'MYPE con documentación dispersa.',
    value: 'Legajo, contratos, PLAME/T-Registro y alertas diarias.',
  },
  {
    plan: 'PRO',
    ideal: 'Empresas que ya sienten riesgo operativo.',
    value: 'IA, SST, simulacro SUNAFIL, canal de denuncias y notificaciones.',
  },
  {
    plan: 'EMPRESA',
    ideal: 'Operaciones con sedes, jefaturas y trabajadores móviles.',
    value: 'Portal trabajador, e-learning, multi-empresa y reportes ejecutivos.',
  },
  {
    plan: 'ENTERPRISE',
    ideal: 'Holdings, corporativos y 300+ trabajadores.',
    value: 'API, integraciones, SLA dedicado y gobierno multi-empresa.',
  },
]

const faqs = [
  {
    q: '¿Cuál es el plan más recomendado?',
    a: 'Para la mayoría de empresas en crecimiento recomendamos Pro: combina IA, SST, simulacro SUNAFIL, canal de denuncias y alertas accionables sin llegar todavía a una implementación corporativa.',
  },
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí. Puedes subir o bajar de plan desde tu dashboard. Si tu operación crece, pasas de Starter a Pro o Empresa sin rehacer tu información.',
  },
  {
    q: '¿Incluye IGV?',
    a: 'Sí. Los precios mostrados están en soles peruanos e incluyen IGV. Recibes comprobante electrónico formal.',
  },
  {
    q: '¿Esto reemplaza mi planilla?',
    a: 'No necesariamente. Comply360 se enfoca en cumplimiento, evidencia, SST, documentos, alertas y portal trabajador. Puede convivir con tu sistema de planilla actual.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Puedes exportar tu información en cualquier momento. Si cancelas, retenemos tus datos por un periodo razonable para que puedas volver o solicitar eliminación según la política vigente.',
  },
]

export default function PlanesPage() {
  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white px-5 py-12 shadow-[0_32px_100px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-teal-200/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-52 w-52 rounded-full bg-blue-200/50 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            <Sparkles className="h-3.5 w-3.5" />
            Precios 2026, soles peruanos, IGV incluido
          </div>
          <h1 className="mt-6 font-serif text-4xl font-medium leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
            Elige el nivel de control que necesita tu operación laboral.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Comply360 te ayuda a pasar de documentos dispersos, WhatsApp y Excel a una
            operación laboral con evidencia, responsables y alertas antes de que el riesgo
            explote.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 px-5 text-sm font-bold text-white shadow-[0_20px_56px_rgba(20,184,166,0.22)] transition hover:-translate-y-0.5"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/diagnostico-gratis"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50"
            >
              Hacer diagnóstico
              <FileSearch className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Planes
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-5xl">
              Una misma escala para todo Comply360.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Starter ordena la base, Pro acelera control con IA y SST, Empresa suma operación
              multi-sede y portal trabajador. Enterprise queda para integraciones y gobierno corporativo.
            </p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <strong className="block text-slate-950">Recomendación honesta</strong>
            Pro es el sweet spot para la mayoría de empresas de 30 a 75 trabajadores.
          </div>
        </div>

        <MarketingPricingGrid
          variant="plans"
          includeFree
          includeEnterprise
          featuredPlan="PRO"
          ctaHref="/sign-up"
          featureLimit={7}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {fitCards.map((item) => (
          <article
            key={item.plan}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              <UsersRound className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              {PLANS[item.plan].name}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            <p className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {item.signal}
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Comparación rápida
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Qué gana tu equipo en cada nivel
            </h2>
          </div>
          <Link
            href="/diagnostico-gratis"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-800 transition hover:bg-teal-100"
          >
            No sé qué plan elegir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-200">
          {comparison.map((row) => (
            <div
              key={row.plan}
              className="grid gap-4 px-5 py-5 text-sm sm:px-6 lg:grid-cols-[180px_220px_1fr_1.2fr] lg:items-center"
            >
              <div>
                <p className="font-semibold text-slate-950">{PLANS[row.plan].name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.plan === 'ENTERPRISE'
                    ? 'Cotización'
                    : PLANS[row.plan].price === 0
                      ? 'Gratis'
                      : `${formatSolesMarketing(PLANS[row.plan].price)}/mes`}
                </p>
              </div>
              <p className="font-medium text-teal-800">{getMarketingPlanLimit(row.plan)}</p>
              <p className="leading-6 text-slate-600">{row.ideal}</p>
              <p className="leading-6 text-slate-600">{row.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            title: 'Sin tarjeta para empezar',
            body: 'Crea cuenta, revisa la plataforma y corre el diagnóstico inicial antes de hablar de pago.',
          },
          {
            icon: ShieldCheck,
            title: 'Migración acompañada',
            body: 'Te ayudamos a ordenar trabajadores, legajos y documentos críticos para que el valor aparezca rápido.',
          },
          {
            icon: Layers3,
            title: 'Diseñado para Perú',
            body: 'SST, SUNAFIL, boletas, contratos, denuncias y portal trabajador con lenguaje laboral peruano.',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-teal-700" />
              <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          )
        })}
      </section>

      <section className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">FAQ</p>
          <h2 className="mt-3 font-serif text-3xl font-medium text-slate-950 sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm open:border-teal-200 open:bg-teal-50/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-semibold">{item.q}</span>
                <span className="text-xl leading-none text-teal-700 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-blue-50 p-7 text-center shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
          Siguiente paso
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-medium text-slate-950 sm:text-4xl">
          Mira tu riesgo real antes de elegir plan.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          En dos minutos puedes obtener una lectura inicial de exposición SUNAFIL, documentos
          críticos y módulos que conviene activar primero.
        </p>
        <Link
          href="/diagnostico-gratis"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 px-5 text-sm font-bold text-white shadow-[0_18px_48px_rgba(20,184,166,0.22)] transition hover:-translate-y-0.5"
        >
          Hacer diagnóstico gratis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  )
}
