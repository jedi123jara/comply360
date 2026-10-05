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
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { cn } from '@/lib/utils'
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
    <>
      <PublicHero
        wide
        eyebrow={
          <>
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            Precios 2026, soles peruanos, IGV incluido
          </>
        }
        title={
          <>
            Elige el nivel de <span className={pub.highlightOnNavy}>control</span> que necesita tu operación laboral.
          </>
        }
        description={
          <>
            Comply360 te ayuda a pasar de documentos dispersos, WhatsApp y Excel a una
            operación laboral con evidencia, responsables y alertas antes de que el riesgo
            explote.
          </>
        }
      >
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className={pub.btnPrimaryLg}>
            Crear cuenta gratis
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/diagnostico-gratis" className={cn(pub.btnSecondaryOnNavy, 'min-h-[52px] px-6 text-base')}>
            Hacer diagnóstico
            <FileSearch aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </PublicHero>

      <div className={cn(pub.containerWide, 'space-y-20 py-12 sm:py-16')}>
        <section>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={pub.kicker}>Planes</p>
              <h2 className={cn(pub.h2, 'mt-3')}>Una misma escala para todo Comply360.</h2>
              <p className={cn(pub.body, 'mt-4 sm:text-base')}>
                Starter ordena la base, Pro acelera control con IA y SST, Empresa suma operación
                multi-sede y portal trabajador. Enterprise queda para integraciones y gobierno corporativo.
              </p>
            </div>
            <div className={cn(pub.card, 'border-l-4 border-l-[#F5B301] p-4 text-sm text-[#475569] lg:max-w-sm')}>
              <strong className="block text-[#0B1B36]">Recomendación honesta</strong>
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
            <article key={item.plan} className={cn(pub.card, 'p-6')}>
              <div className={cn(pub.iconBox, 'mb-5')}>
                <UsersRound aria-hidden className="h-5 w-5" />
              </div>
              <p className={pub.kicker}>{PLANS[item.plan].name}</p>
              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{item.title}</h3>
              <p className={cn(pub.body, 'mt-3')}>{item.body}</p>
              <p className={cn(pub.pill, 'mt-5')}>{item.signal}</p>
            </article>
          ))}
        </section>

        <section className={cn(pub.card, 'overflow-hidden')}>
          <div className="grid gap-4 border-b border-[#E5EAF2] bg-[#F5F7FB] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className={pub.kicker}>Comparación rápida</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">
                Qué gana tu equipo en cada nivel
              </h2>
            </div>
            <Link href="/diagnostico-gratis" className={pub.btnSecondary}>
              No sé qué plan elegir
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>

          <div className={pub.divide}>
            {comparison.map((row) => (
              <div
                key={row.plan}
                className="grid gap-4 px-5 py-5 text-sm sm:px-6 lg:grid-cols-[180px_220px_1fr_1.2fr] lg:items-center"
              >
                <div>
                  <p className="font-bold text-[#0B1B36]">{PLANS[row.plan].name}</p>
                  <p className="mt-1 text-xs text-[#5A6A80]">
                    {row.plan === 'ENTERPRISE'
                      ? 'Cotización'
                      : PLANS[row.plan].price === 0
                        ? 'Gratis'
                        : `${formatSolesMarketing(PLANS[row.plan].price)}/mes`}
                  </p>
                </div>
                <p className="font-semibold text-[#1D4ED8]">{getMarketingPlanLimit(row.plan)}</p>
                <p className="leading-6 text-[#475569]">{row.ideal}</p>
                <p className="leading-6 text-[#475569]">{row.value}</p>
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
              <article key={item.title} className={cn(pub.card, 'p-5')}>
                <div className={pub.iconBox}>
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
                <h3 className={cn(pub.h3, 'mt-4')}>{item.title}</h3>
                <p className={cn(pub.body, 'mt-2')}>{item.body}</p>
              </article>
            )
          })}
        </section>

        <section className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className={pub.kicker}>FAQ</p>
            <h2 className={cn(pub.h2, 'mt-3')}>Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className={cn(pub.card, 'group p-5 text-[#0B1B36] open:border-[#2563EB]/35')}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="font-bold">{item.q}</span>
                  <span
                    aria-hidden
                    className="text-xl font-bold leading-none text-[#2563EB] transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className={cn(pub.body, 'mt-3')}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={cn(pub.band, 'p-7 text-center sm:p-10')}>
          <div aria-hidden className={pub.heroGrid} />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#F5B301]">Siguiente paso</p>
            <h2 className={cn(pub.h2OnNavy, 'mx-auto mt-3 max-w-2xl sm:text-4xl')}>
              Mira tu riesgo real antes de elegir plan.
            </h2>
            <p className={cn(pub.bodyOnNavy, 'mx-auto mt-4 max-w-2xl sm:text-base')}>
              En dos minutos puedes obtener una lectura inicial de exposición SUNAFIL, documentos
              críticos y módulos que conviene activar primero.
            </p>
            <Link href="/diagnostico-gratis" className={cn(pub.btnPrimaryLg, 'mt-7')}>
              Hacer diagnóstico gratis
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
