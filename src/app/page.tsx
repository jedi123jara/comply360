'use client'

import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Bell,
  Bot,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  HardHat,
  Menu,
  MessageSquareText,
  PlayCircle,
  Radar,
  Scale,
  ShieldCheck,
  Siren,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  X,
  Zap,
} from 'lucide-react'
import { PLANS } from '@/lib/constants'
import { track } from '@/lib/analytics'

type RoleHome = '/dashboard' | '/mi-portal'
type PlanCard = (typeof PLANS)[keyof typeof PLANS]

const navItems = [
  ['Producto', '#producto'],
  ['Riesgo', '#riesgo'],
  ['Sectores', '#sectores'],
  ['Precios', '#precios'],
  ['FAQ', '#faq'],
] as const

const complianceSignals = [
  'Ley 29783 SST',
  'LPCL',
  'PLAME / T-Registro',
  'Ley 27942',
] as const

const outcomes = [
  {
    value: '14 días',
    label: 'para ordenar el primer tablero',
  },
  {
    value: '28 docs',
    label: 'clave para inspección SUNAFIL',
  },
  {
    value: '1 click',
    label: 'para armar expediente del inspector',
  },
] as const

const painPoints = [
  {
    icon: Siren,
    title: 'El riesgo aparece tarde',
    body: 'SST vencido, contratos incompletos, boletas sin firma y capacitaciones dispersas salen a la luz cuando ya estás contra el reloj.',
  },
  {
    icon: FileText,
    title: 'La evidencia vive en mil lugares',
    body: 'Excel, WhatsApp, PDFs sueltos, carpetas compartidas y correos. El inspector no espera a que tu equipo reconstruya la historia.',
  },
  {
    icon: UsersRound,
    title: 'RRHH termina como mesa de ayuda',
    body: 'Vacaciones, boletas, documentos, firmas y consultas legales consumen horas que deberían ir a gestión y prevención.',
  },
] as const

const modules = [
  {
    icon: ShieldCheck,
    title: 'Score SUNAFIL',
    body: 'Riesgo continuo por sede, área y trabajador, con prioridades claras para bajar exposición.',
    tag: 'Control',
  },
  {
    icon: HardHat,
    title: 'SST operativo',
    body: 'IPERC, comité, capacitaciones, EMO, accidentes, visitas de campo y plan anual en un solo flujo.',
    tag: 'Ley 29783',
  },
  {
    icon: FileCheck2,
    title: 'Legajo digital',
    body: 'Contratos, anexos, politicas, boletas y constancias con trazabilidad y vencimientos.',
    tag: 'Evidencia',
  },
  {
    icon: Bell,
    title: 'Alertas ejecutivas',
    body: 'Un plan de acción por criticidad: qué vence, quién responde y qué documento falta.',
    tag: 'Prevención',
  },
  {
    icon: Bot,
    title: 'Asistente IA laboral',
    body: 'Respuestas y borradores con contexto peruano para contratos, sanciones, SST y fiscalizaciones.',
    tag: 'IA',
  },
  {
    icon: Calculator,
    title: 'Calculadoras laborales',
    body: 'CTS, gratificaciones, liquidaciones, horas extras y multas estimadas con base peruana.',
    tag: 'Planilla',
  },
] as const

const sectors = [
  {
    icon: HardHat,
    title: 'Construcción y campo',
    body: 'Sedes temporales, cuadrillas, contratistas, PETS/PETAR/ATS y visitas SST con evidencia móvil.',
  },
  {
    icon: Store,
    title: 'Retail y restaurantes',
    body: 'Alta rotación, horarios, descansos, boletas, capacitaciones y documentos firmados desde el celular.',
  },
  {
    icon: Truck,
    title: 'Logistica y servicios',
    body: 'Turnos, asistencia, teletrabajo, terceros, EPPS, incidentes y reportes por centro de costo.',
  },
  {
    icon: Building2,
    title: 'Empresas multi-sede',
    body: 'Gerencia ve el mapa completo; cada sede ejecuta su plan sin perder estándar ni trazabilidad.',
  },
] as const

const steps = [
  {
    label: 'Diagnóstico',
    title: 'Mapeamos tu riesgo real',
    body: 'Cargamos tu estructura, trabajadores y documentos críticos para saber dónde estás expuesto.',
  },
  {
    label: 'Implementación',
    title: 'Ordenamos el expediente vivo',
    body: 'Migramos legajos, configuramos roles, flujos, alertas y responsables por modulo.',
  },
  {
    label: 'Operación',
    title: 'Tu equipo trabaja desde un solo lugar',
    body: 'RRHH, SST, legal, jefes de sede y trabajadores firman, revisan y actuan sin perseguirse por chat.',
  },
  {
    label: 'Inspección',
    title: 'Sales con evidencia, no con excusas',
    body: 'Generas el paquete para SUNAFIL con sello de tiempo, responsable y trazabilidad.',
  },
] as const

const faqs = [
  {
    q: '¿Esto reemplaza mi sistema de planilla?',
    a: 'No tiene que reemplazarlo. Comply360 se enfoca en cumplimiento, evidencia, alertas, documentos, SST y portal del trabajador. Puede convivir con tu planilla actual y ayudarte a exportar información clave.',
  },
  {
    q: '¿Sirve si tengo trabajadores fuera de oficina?',
    a: 'Sí. Comply360 está pensado para empresas con obra, campo, tiendas, sedes y turnos. El portal del trabajador funciona como experiencia móvil para firmas, boletas, solicitudes y evidencias.',
  },
  {
    q: '¿Cuanto demora implementarlo?',
    a: 'La primera versión operativa puede estar lista en unas dos semanas si la información base está disponible. Empresas con varias sedes o migraciones históricas pueden requerir un plan por fases.',
  },
  {
    q: '¿Qué pasa cuando SUNAFIL visita mi empresa?',
    a: 'Tienes un modo de inspección para reunir documentos, responsables, vencimientos y evidencias. La promesa no es eliminar todo riesgo, sino llegar con control, trazabilidad y menos improvisación.',
  },
  {
    q: '¿Incluye soporte humano?',
    a: 'Sí. Los planes pagados incluyen soporte humano escalado por plan, además del asistente IA para dudas operativas y legales frecuentes.',
  },
] as const

export default function LandingPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [roleHome, setRoleHome] = useState<RoleHome>('/dashboard')

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false

    fetch('/api/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { role?: string } | null) => {
        if (cancelled || !data) return
        if (data.role === 'WORKER') {
          setRoleHome('/mi-portal')
          router.replace('/mi-portal')
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isSignedIn, router])

  const ctaHref = isSignedIn ? roleHome : '/sign-up'

  const handleCtaClick = useCallback(
    (cta: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      track('landing_cta_clicked', { cta, signed_in: isSignedIn ?? false })
      if (isSignedIn) {
        event.preventDefault()
        router.push(roleHome)
      }
    },
    [isSignedIn, roleHome, router]
  )

  const handlePricingClick = useCallback(
    (plan: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      track('landing_pricing_clicked', { plan, signed_in: isSignedIn ?? false })
      if (isSignedIn) {
        event.preventDefault()
        router.push(roleHome)
      }
    },
    [isSignedIn, roleHome, router]
  )

  return (
    <main className="c360-landing">
      <LandingNav
        isSignedIn={isSignedIn}
        roleHome={roleHome}
        ctaHref={ctaHref}
        onCtaClick={handleCtaClick('nav_demo')}
      />
      <Hero ctaHref={ctaHref} onCtaClick={handleCtaClick('hero_demo')} />
      <ProofRail />
      <ProblemSection />
      <ProductSection ctaHref={ctaHref} onCtaClick={handleCtaClick('product_demo')} />
      <RiskSection ctaHref={ctaHref} onCtaClick={handleCtaClick('risk_diagnostic')} />
      <ModulesSection />
      <SectorSection />
      <OperatingSystemSection />
      <PricingSection
        ctaHref={ctaHref}
        isSignedIn={isSignedIn}
        onPricingClick={handlePricingClick}
      />
      <FaqSection />
      <FinalCta ctaHref={ctaHref} isSignedIn={isSignedIn} onCtaClick={handleCtaClick('final_demo')} />
      <LandingFooter />
      <LandingStyles />
    </main>
  )
}

function LandingNav({
  isSignedIn,
  roleHome,
  ctaHref,
  onCtaClick,
}: {
  isSignedIn: boolean | undefined
  roleHome: RoleHome
  ctaHref: string
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <header className="lp-nav">
      <div className="lp-shell lp-nav-inner">
        <Link href="/" className="lp-brand" aria-label="Comply360">
          <BrandMark />
          <span>
            Comply<span>360</span>
          </span>
        </Link>

        <nav className="lp-nav-links" aria-label="Principal">
          {navItems.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="lp-nav-actions">
          <Link href={isSignedIn ? roleHome : '/sign-in'} className="lp-link-button">
            {isSignedIn ? (roleHome === '/mi-portal' ? 'Mi portal' : 'Mi dashboard') : 'Iniciar sesión'}
          </Link>
          <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary">
            <span>{isSignedIn ? 'Ir al producto' : 'Agendar demo'}</span>
            <ArrowRight aria-hidden size={16} />
          </Link>
        </div>

        <button
          type="button"
          className="lp-menu-button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
        </button>
      </div>

      {open ? (
        <div className="lp-mobile-menu">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link href={isSignedIn ? roleHome : '/sign-in'} onClick={() => setOpen(false)}>
            {isSignedIn ? 'Ir al producto' : 'Iniciar sesión'}
          </Link>
          <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary">
            <span>{isSignedIn ? 'Ir al producto' : 'Agendar demo'}</span>
            <ArrowRight aria-hidden size={16} />
          </Link>
        </div>
      ) : null}
    </header>
  )
}

function Hero({
  ctaHref,
  onCtaClick,
}: {
  ctaHref: string
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <section className="lp-hero">
      <div className="lp-hero-lines" aria-hidden="true" />
      <div className="lp-shell lp-hero-content">
        <div className="lp-hero-copy">
          <div className="lp-eyebrow">
            <Sparkles aria-hidden size={15} />
            Plataforma peruana de compliance laboral
          </div>
          <h1>Convierte el cumplimiento laboral en una ventaja operativa.</h1>
          <p>
            Comply360 une RRHH, SST, legal, jefes de sede y trabajadores en un solo
            command center. Menos persecución por chat. Más evidencia lista para SUNAFIL.
          </p>
          <div className="lp-hero-actions">
            <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary lp-button-large">
              <span>Agendar demo comercial</span>
              <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/diagnostico-gratis" className="lp-button lp-button-ghost lp-button-large">
              <PlayCircle aria-hidden size={18} />
              <span>Diagnóstico gratis</span>
            </Link>
          </div>
          <div className="lp-signal-row" aria-label="Marcos legales cubiertos">
            {complianceSignals.map((signal) => (
              <span key={signal}>
                <Check aria-hidden size={14} />
                {signal}
              </span>
            ))}
          </div>
        </div>

        <CommandCenterVisual />
      </div>
    </section>
  )
}

function CommandCenterVisual() {
  return (
    <div className="lp-command" role="img" aria-label="Vista previa del command center de cumplimiento laboral">
      <div className="lp-command-topbar">
        <div className="lp-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="lp-command-title">Comply360 Command Center</div>
        <div className="lp-live-pill">
          <span />
          Fiscalización preparada
        </div>
      </div>

      <div className="lp-command-grid">
        <div className="lp-command-panel lp-score-panel">
          <div className="lp-panel-label">Score SUNAFIL</div>
          <div className="lp-score-ring">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="49" />
              <circle cx="60" cy="60" r="49" pathLength="100" />
            </svg>
            <div>
              <strong>88</strong>
              <span>/100</span>
            </div>
          </div>
          <p>12 puntos de mejora antes de la siguiente visita.</p>
        </div>

        <div className="lp-command-panel lp-action-panel">
          <div className="lp-panel-header">
            <div>
              <span className="lp-panel-label">Plan de acción</span>
              <h3>Hoy requiere atencion</h3>
            </div>
            <ClipboardCheck aria-hidden size={22} />
          </div>
          <div className="lp-action-list">
            <ActionItem status="critical" title="Capacitación SST vencida" meta="Obra Norte · 17 personas" />
            <ActionItem status="warning" title="Contrato por renovar" meta="Equipo ventas · vence en 6 días" />
            <ActionItem status="ok" title="Boletas firmadas" meta="241/247 completadas" />
          </div>
        </div>

        <div className="lp-command-panel lp-inspection-panel">
          <div className="lp-panel-label">Modo inspección</div>
          <h3>Expediente listo</h3>
          <div className="lp-document-stack">
            <span>IPERC 2026</span>
            <span>Comite SST</span>
            <span>Boletas marzo</span>
            <span>Contratos vigentes</span>
          </div>
        </div>

        <div className="lp-command-panel lp-ai-panel">
          <div className="lp-ai-avatar">
            <Bot aria-hidden size={18} />
          </div>
          <div>
            <span className="lp-panel-label">Copiloto laboral</span>
            <p>Prepara un acta de requerimiento y prioriza los documentos faltantes por multa estimada.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionItem({
  status,
  title,
  meta,
}: {
  status: 'critical' | 'warning' | 'ok'
  title: string
  meta: string
}) {
  return (
    <div className={`lp-action-item lp-action-${status}`}>
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
    </div>
  )
}

function ProofRail() {
  return (
    <section className="lp-proof">
      <div className="lp-shell">
        <div className="lp-proof-grid">
          {outcomes.map((item) => (
            <div key={item.value} className="lp-proof-item">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="lp-section" id="riesgo">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="El problema"
          title="El cumplimiento laboral no falla por falta de esfuerzo. Falla por falta de sistema."
          lead="Tu equipo puede ser excelente y aun así vivir expuesto si la evidencia está rota, los plazos no conversan y cada sede decide con su propio Excel."
        />
        <div className="lp-card-grid lp-card-grid-three">
          {painPoints.map((item) => (
            <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} tone="danger" />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductSection({
  ctaHref,
  onCtaClick,
}: {
  ctaHref: string
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <section className="lp-section lp-product-section" id="producto">
      <div className="lp-shell lp-product-layout">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Producto"
            title="Un sistema operativo para que RRHH, legal y SST trabajen como un solo equipo."
            lead="No es una biblioteca de documentos. Es una capa de control: decide qué hacer, quién responde, qué evidencia falta y cómo se entrega."
          />
          <div className="lp-product-actions">
            <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary">
              <span>Ver demo con mi caso</span>
              <ArrowRight aria-hidden size={16} />
            </Link>
            <Link href="/calculadoras" className="lp-button lp-button-ghost">
              <Calculator aria-hidden size={16} />
              <span>Probar calculadoras</span>
            </Link>
          </div>
        </div>

        <div className="lp-system-map">
          <SystemNode icon={UsersRound} title="Trabajadores" body="Legajos, firmas, portal y solicitudes." />
          <SystemNode icon={HardHat} title="SST" body="Plan anual, comite, IPERC, EMO y visitas." />
          <SystemNode icon={Scale} title="Legal laboral" body="Contratos, denuncias y riesgo normativo." />
          <SystemNode icon={Radar} title="Gerencia" body="Score, alertas, evidencia y reportes." />
        </div>
      </div>
    </section>
  )
}

function RiskSection({
  ctaHref,
  onCtaClick,
}: {
  ctaHref: string
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <section className="lp-section lp-risk-section">
      <div className="lp-shell lp-risk-layout">
        <div className="lp-risk-board">
          <div className="lp-risk-header">
            <span>Simulación de riesgo</span>
            <Siren aria-hidden size={18} />
          </div>
          <div className="lp-risk-amount">
            <span>S/</span>
            <strong>23,400</strong>
          </div>
          <p>Exposición estimada si faltan capacitaciones, evidencia SST y contratos renovados.</p>
          <div className="lp-risk-bars" aria-hidden="true">
            <span style={{ width: '88%' }} />
            <span style={{ width: '64%' }} />
            <span style={{ width: '42%' }} />
          </div>
        </div>

        <div>
          <SectionHeading
            align="left"
            eyebrow="ROI de prevención"
            title="No esperes a que una multa te diga que el sistema estaba roto."
            lead="Comply360 convierte pendientes invisibles en un plan claro: qué falta, cuánto riesgo representa, quién responde y qué evidencia debe quedar lista."
          />
          <div className="lp-risk-actions">
            <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary">
              <span>Agendar evaluación</span>
              <ArrowRight aria-hidden size={16} />
            </Link>
            <Link href="/diagnostico-gratis" className="lp-button lp-button-ghost">
              <Zap aria-hidden size={16} />
              <span>Medir mi riesgo</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function ModulesSection() {
  return (
    <section className="lp-section" id="modulos">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Módulos"
          title="La suite completa para llegar a SUNAFIL con evidencia, orden y criterio."
          lead="Activa los módulos que necesitas hoy y expande cuando tu operación crezca."
        />
        <div className="lp-card-grid lp-card-grid-three">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>
      </div>
    </section>
  )
}

function SectorSection() {
  return (
    <section className="lp-section lp-sector-section" id="sectores">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Especializacion"
          title="Hecho para operaciones peruanas donde el cumplimiento se mueve todos los días."
          lead="Si tu operación tiene sedes, turnos, obra, campo o alta rotación, necesitas control vivo y no solo carpetas bien nombradas."
        />
        <div className="lp-card-grid lp-card-grid-four">
          {sectors.map((sector) => (
            <InfoCard key={sector.title} icon={sector.icon} title={sector.title} body={sector.body} tone="neutral" />
          ))}
        </div>
      </div>
    </section>
  )
}

function OperatingSystemSection() {
  return (
    <section className="lp-section">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Implementación"
          title="De caos documental a expediente vivo, sin detener la operación."
          lead="Un camino simple para empezar rápido, ordenar lo urgente y escalar sin pedirle al equipo que cambie todo de golpe."
        />
        <div className="lp-timeline">
          {steps.map((step, index) => (
            <div key={step.label} className="lp-step">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <small>{step.label}</small>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({
  ctaHref,
  isSignedIn,
  onPricingClick,
}: {
  ctaHref: string
  isSignedIn: boolean | undefined
  onPricingClick: (plan: string) => (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.EMPRESA] as const

  return (
    <section className="lp-section lp-pricing-section" id="precios">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Precios"
          title="Planes claros para pasar de reaccionar a controlar."
          lead="Tres caminos simples: ordenar una PYME, escalar una empresa en crecimiento o gobernar una operación multi-sede."
        />
        <div className="lp-pricing-grid">
          {plans.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              featured={plan.key === 'PRO'}
              ctaHref={ctaHref}
              isSignedIn={isSignedIn}
              onClick={onPricingClick(plan.key)}
            />
          ))}
        </div>
        <p className="lp-pricing-note">
          Enterprise disponible para holdings, empresas 300+ trabajadores e integraciones con sistemas externos.
        </p>
      </div>
    </section>
  )
}

function PricingCard({
  plan,
  featured,
  ctaHref,
  isSignedIn,
  onClick,
}: {
  plan: PlanCard
  featured: boolean
  ctaHref: string
  isSignedIn: boolean | undefined
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <article className={featured ? 'lp-price-card lp-price-card-featured' : 'lp-price-card'}>
      {featured ? <div className="lp-featured-label">Más elegido</div> : null}
      <div className="lp-price-head">
        <span>{plan.name}</span>
        <strong>
          {plan.isCustomQuote ? (
            'A medida'
          ) : (
            <>
              <small>S/</small>
              {plan.price.toLocaleString('es-PE')}
              <em>/mes</em>
            </>
          )}
        </strong>
      </div>
      <p>{getPlanPitch(plan.key)}</p>
      <ul>
        {plan.features.slice(0, 6).map((feature) => (
          <li key={feature}>
            <Check aria-hidden size={15} />
            <span>{feature.replace(/[^\p{L}\p{N}\s/().,+-]/gu, '').trim()}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} onClick={onClick} className={featured ? 'lp-button lp-button-primary' : 'lp-button lp-button-ghost'}>
        <span>{isSignedIn ? 'Ir al producto' : featured ? 'Agendar demo' : 'Empezar'}</span>
        <ArrowRight aria-hidden size={16} />
      </Link>
    </article>
  )
}

function FaqSection() {
  return (
    <section className="lp-section" id="faq">
      <div className="lp-shell lp-faq-shell">
        <SectionHeading
          eyebrow="FAQ"
          title="Lo que tu equipo necesita saber antes de avanzar."
          lead="Respuestas directas para RRHH, legal, SST y gerencia antes de agendar una demo."
        />
        <div className="lp-faq-list">
          {faqs.map((faq, index) => (
            <FaqItem key={faq.q} {...faq} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="lp-faq-item">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{q}</span>
        {open ? <ChevronUp aria-hidden size={19} /> : <ChevronDown aria-hidden size={19} />}
      </button>
      {open ? <p>{a}</p> : null}
    </div>
  )
}

function FinalCta({
  ctaHref,
  isSignedIn,
  onCtaClick,
}: {
  ctaHref: string
  isSignedIn: boolean | undefined
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <section className="lp-final-cta">
      <div className="lp-shell">
        <div className="lp-final-box">
          <div className="lp-eyebrow">
            <MessageSquareText aria-hidden size={15} />
            Demo consultiva
          </div>
          <h2>Trae tu caos documental. Sal con un plan para ordenarlo.</h2>
          <p>
            En 30 minutos revisamos tu operación, tus sedes, tus riesgos y el flujo exacto
            con el que Comply360 podría ayudarte a llegar preparado a una inspección.
          </p>
          <div className="lp-hero-actions">
            <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary lp-button-large">
              <span>{isSignedIn ? 'Ir al producto' : 'Agendar demo gratis'}</span>
              <ArrowRight aria-hidden size={18} />
            </Link>
            <Link href="/diagnostico-gratis" className="lp-button lp-button-ghost lp-button-large">
              <ShieldCheck aria-hidden size={18} />
              <span>Empezar diagnóstico</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-shell lp-footer-grid">
        <div>
          <Link href="/" className="lp-brand">
            <BrandMark />
            <span>
              Comply<span>360</span>
            </span>
          </Link>
          <p>Compliance laboral peruano para equipos que necesitan evidencia, control y velocidad.</p>
        </div>
        <div>
          <strong>Producto</strong>
          <Link href="#producto">Command center</Link>
          <Link href="#modulos">Módulos</Link>
          <Link href="/diagnostico-gratis">Diagnóstico</Link>
        </div>
        <div>
          <strong>Empresa</strong>
          <Link href="#sectores">Sectores</Link>
          <Link href="#precios">Precios</Link>
          <Link href="#faq">FAQ</Link>
        </div>
        <div>
          <strong>Legal</strong>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <span>© 2026 Comply360</span>
        </div>
      </div>
    </footer>
  )
}

function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
}: {
  eyebrow: string
  title: string
  lead?: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={align === 'left' ? 'lp-section-head lp-section-head-left' : 'lp-section-head'}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {lead ? <p>{lead}</p> : null}
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: LucideIcon
  title: string
  body: string
  tone: 'danger' | 'neutral'
}) {
  return (
    <article className={tone === 'danger' ? 'lp-info-card lp-info-card-danger' : 'lp-info-card'}>
      <div className="lp-icon-box">
        <Icon aria-hidden size={22} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function ModuleCard({
  icon: Icon,
  title,
  body,
  tag,
}: {
  icon: LucideIcon
  title: string
  body: string
  tag: string
}) {
  return (
    <article className="lp-module-card">
      <div className="lp-module-top">
        <div className="lp-icon-box">
          <Icon aria-hidden size={22} />
        </div>
        <span>{tag}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function SystemNode({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="lp-system-node">
      <div className="lp-icon-box">
        <Icon aria-hidden size={20} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <span className="lp-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <defs>
          <linearGradient id="lpBrandTile" x1="8" y1="4" x2="56" y2="60">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="42%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="lpBrandShield" x1="18" y1="11" x2="48" y2="54">
            <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.96" />
            <stop offset="45%" stopColor="#a7f3d0" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.82" />
          </linearGradient>
          <clipPath id="lpBrandClip">
            <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" />
          </clipPath>
        </defs>
        <rect x="5" y="5" width="54" height="54" rx="15" fill="url(#lpBrandTile)" />
        <g clipPath="url(#lpBrandClip)">
          <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" fill="url(#lpBrandShield)" />
        </g>
        <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" fill="none" stroke="#ecfeff" strokeOpacity="0.5" strokeWidth="0.9" />
        <path d="M23.5 32.2 29.6 38.1 41.2 25.3" fill="none" stroke="#06111f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function getPlanPitch(planKey: string) {
  if (planKey === 'STARTER') {
    return 'Para PYMEs que quieren pasar de Excel y carpetas sueltas a control real.'
  }
  if (planKey === 'PRO') {
    return 'Para empresas en crecimiento que necesitan IA, simulacro SUNAFIL y SST serio.'
  }
  if (planKey === 'EMPRESA') {
    return 'Para operaciones multi-sede con portal del trabajador, reportes y SLA alto.'
  }
  return 'Para operaciones que necesitan cumplimiento laboral con trazabilidad.'
}

function LandingStyles() {
  return (
    <style jsx global>{`
      .c360-landing {
        min-height: 100vh;
        overflow: hidden;
        background:
          linear-gradient(180deg, #050914 0%, #08101c 42%, #060a12 100%);
        color: #f8fafc;
        font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
      }

      .c360-landing *,
      .c360-landing *::before,
      .c360-landing *::after {
        box-sizing: border-box;
      }

      .lp-shell {
        width: min(1180px, calc(100% - 40px));
        margin: 0 auto;
      }

      .lp-nav {
        position: sticky;
        top: 0;
        z-index: 50;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(5, 9, 20, 0.82);
        backdrop-filter: blur(18px) saturate(1.3);
      }

      .lp-nav-inner {
        display: flex;
        min-height: 74px;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .lp-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: #f8fafc;
        font-size: 1rem;
        font-weight: 750;
        text-decoration: none;
      }

      .lp-brand span span {
        color: #5eead4;
      }

      .lp-brand-mark {
        display: inline-grid;
        width: 30px;
        height: 30px;
        place-items: center;
      }

      .lp-brand-mark svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .lp-nav-links,
      .lp-nav-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lp-nav-links {
        gap: 24px;
      }

      .lp-nav-links a,
      .lp-link-button {
        color: #cbd5e1;
        font-size: 0.9rem;
        font-weight: 620;
        text-decoration: none;
        transition: color 160ms ease;
      }

      .lp-nav-links a:hover,
      .lp-link-button:hover {
        color: #ffffff;
      }

      .lp-button {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 8px;
        padding: 0 16px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        color: #f8fafc;
        font-size: 0.91rem;
        font-weight: 760;
        line-height: 1;
        text-decoration: none;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease,
          box-shadow 160ms ease;
        white-space: nowrap;
      }

      .lp-button:hover {
        transform: translateY(-1px);
      }

      .lp-button-primary {
        border-color: rgba(45, 212, 191, 0.56);
        background: linear-gradient(135deg, #14b8a6 0%, #2563eb 100%);
        box-shadow: 0 18px 46px rgba(20, 184, 166, 0.18);
      }

      .lp-button-primary:hover {
        box-shadow: 0 24px 58px rgba(20, 184, 166, 0.26);
      }

      .lp-button-ghost {
        background: rgba(15, 23, 42, 0.72);
      }

      .lp-button-ghost:hover {
        border-color: rgba(94, 234, 212, 0.48);
        background: rgba(30, 41, 59, 0.9);
      }

      .lp-button-large {
        min-height: 52px;
        padding: 0 20px;
        font-size: 0.96rem;
      }

      .lp-menu-button {
        display: none;
        width: 42px;
        height: 42px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.72);
        color: #f8fafc;
      }

      .lp-mobile-menu {
        display: none;
      }

      .lp-hero {
        position: relative;
        padding: 54px 0 28px;
        background:
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.045) 0, rgba(148, 163, 184, 0.045) 1px, transparent 1px, transparent 72px),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.035) 0, rgba(148, 163, 184, 0.035) 1px, transparent 1px, transparent 72px),
          linear-gradient(180deg, #050914 0%, #07111f 64%, #08101c 100%);
      }

      .lp-hero-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(120deg, transparent 0%, rgba(34, 211, 238, 0.09) 36%, transparent 38%),
          linear-gradient(60deg, transparent 0%, rgba(250, 204, 21, 0.08) 54%, transparent 56%);
      }

      .lp-hero-content {
        position: relative;
      }

      .lp-hero-copy {
        max-width: 930px;
        margin: 0 auto;
        text-align: center;
      }

      .lp-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(94, 234, 212, 0.28);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #99f6e4;
        padding: 8px 12px;
        font-size: 0.78rem;
        font-weight: 780;
      }

      .lp-hero h1 {
        margin: 24px 0 0;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 3.25rem;
        font-weight: 520;
        line-height: 0.98;
        letter-spacing: 0;
      }

      .lp-hero-copy > p {
        max-width: 760px;
        margin: 24px auto 0;
        color: #cbd5e1;
        font-size: 1.08rem;
        line-height: 1.7;
      }

      .lp-hero-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 28px;
      }

      .lp-signal-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 22px;
      }

      .lp-signal-row span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #a8b8cc;
        font-size: 0.84rem;
      }

      .lp-signal-row svg {
        color: #5eead4;
      }

      .lp-command {
        position: relative;
        width: min(980px, 100%);
        margin: 34px auto 0;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        background:
          linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(4, 10, 23, 0.98));
        box-shadow:
          0 30px 100px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
        overflow: hidden;
      }

      .lp-command::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.04) 0, rgba(148, 163, 184, 0.04) 1px, transparent 1px, transparent 46px),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.035) 0, rgba(148, 163, 184, 0.035) 1px, transparent 1px, transparent 46px);
        opacity: 0.5;
        pointer-events: none;
      }

      .lp-command > * {
        position: relative;
      }

      .lp-command-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 52px;
        padding: 0 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      }

      .lp-window-dots {
        display: flex;
        gap: 6px;
      }

      .lp-window-dots span {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #334155;
      }

      .lp-window-dots span:first-child {
        background: #fb7185;
      }

      .lp-window-dots span:nth-child(2) {
        background: #fbbf24;
      }

      .lp-window-dots span:nth-child(3) {
        background: #22c55e;
      }

      .lp-command-title {
        color: #dbe4f0;
        font-size: 0.84rem;
        font-weight: 760;
      }

      .lp-live-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #99f6e4;
        font-size: 0.78rem;
        font-weight: 720;
      }

      .lp-live-pill span {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #14b8a6;
        box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.14);
      }

      .lp-command-grid {
        display: grid;
        grid-template-columns: 0.9fr 1.5fr 1fr;
        gap: 12px;
        padding: 14px;
      }

      .lp-command-panel,
      .lp-info-card,
      .lp-module-card,
      .lp-system-node,
      .lp-price-card,
      .lp-step,
      .lp-risk-board,
      .lp-final-box {
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.78);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .lp-command-panel {
        min-height: 142px;
        padding: 14px;
      }

      .lp-panel-label,
      .lp-risk-header span,
      .lp-section-head > span,
      .lp-price-head > span,
      .lp-step small,
      .lp-module-top span {
        color: #5eead4;
        font-size: 0.74rem;
        font-weight: 820;
        text-transform: uppercase;
      }

      .lp-score-panel {
        display: grid;
        place-items: center;
        text-align: center;
      }

      .lp-score-ring {
        position: relative;
        width: 98px;
        height: 98px;
        margin: 6px auto;
      }

      .lp-score-ring svg {
        width: 98px;
        height: 98px;
        transform: rotate(-90deg);
      }

      .lp-score-ring circle {
        fill: none;
        stroke-width: 10;
        stroke: rgba(148, 163, 184, 0.14);
      }

      .lp-score-ring circle:nth-child(2) {
        stroke: #14b8a6;
        stroke-dasharray: 88 100;
        filter: drop-shadow(0 0 8px rgba(20, 184, 166, 0.5));
      }

      .lp-score-ring div {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: #f8fafc;
      }

      .lp-score-ring strong {
        display: block;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.45rem;
        font-weight: 520;
        line-height: 0.92;
      }

      .lp-score-ring span {
        color: #8b9bb1;
        font-size: 0.8rem;
      }

      .lp-score-panel p,
      .lp-ai-panel p,
      .lp-risk-board p,
      .lp-section-head p,
      .lp-info-card p,
      .lp-module-card p,
      .lp-system-node p,
      .lp-step p,
      .lp-price-card p,
      .lp-faq-item p,
      .lp-final-box p,
      .lp-footer p {
        color: #a8b8cc;
        line-height: 1.65;
      }

      .lp-score-panel p,
      .lp-ai-panel p {
        margin: 0;
        font-size: 0.82rem;
      }

      .lp-panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .lp-panel-header h3,
      .lp-inspection-panel h3,
      .lp-system-node h3,
      .lp-info-card h3,
      .lp-module-card h3,
      .lp-step h3 {
        margin: 0;
        color: #f8fafc;
        font-size: 1rem;
        line-height: 1.25;
      }

      .lp-panel-header svg {
        color: #5eead4;
      }

      .lp-action-list {
        display: grid;
        gap: 9px;
      }

      .lp-action-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.42);
      }

      .lp-action-item > span {
        width: 8px;
        height: 8px;
        margin-top: 5px;
        flex: none;
        border-radius: 999px;
      }

      .lp-action-critical > span {
        background: #fb7185;
      }

      .lp-action-warning > span {
        background: #fbbf24;
      }

      .lp-action-ok > span {
        background: #22c55e;
      }

      .lp-action-item strong,
      .lp-action-item small {
        display: block;
      }

      .lp-action-item strong {
        color: #e5eef9;
        font-size: 0.83rem;
      }

      .lp-action-item small {
        margin-top: 3px;
        color: #8b9bb1;
        font-size: 0.75rem;
      }

      .lp-inspection-panel {
        background:
          linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.78));
      }

      .lp-inspection-panel h3 {
        margin-top: 8px;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 1.5rem;
        font-weight: 520;
      }

      .lp-document-stack {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .lp-document-stack span {
        display: block;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 6px;
        background: rgba(2, 6, 23, 0.36);
        color: #dbe4f0;
        padding: 8px 10px;
        font-size: 0.78rem;
      }

      .lp-ai-panel {
        grid-column: span 3;
        display: flex;
        min-height: auto;
        align-items: center;
        gap: 14px;
        background:
          linear-gradient(90deg, rgba(37, 99, 235, 0.18), rgba(15, 23, 42, 0.78));
      }

      .lp-ai-avatar {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        flex: none;
        border-radius: 8px;
        background: rgba(94, 234, 212, 0.12);
        color: #5eead4;
      }

      .lp-proof {
        border-top: 1px solid rgba(148, 163, 184, 0.12);
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(2, 6, 23, 0.28);
      }

      .lp-proof-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }

      .lp-proof-item {
        min-height: 112px;
        padding: 24px;
        border-right: 1px solid rgba(148, 163, 184, 0.12);
      }

      .lp-proof-item:last-child {
        border-right: none;
      }

      .lp-proof-item strong {
        display: block;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.2rem;
        font-weight: 520;
        line-height: 1;
      }

      .lp-proof-item span {
        display: block;
        margin-top: 8px;
        color: #8b9bb1;
        font-size: 0.88rem;
      }

      .lp-section {
        padding: 104px 0;
      }

      .lp-section-head {
        max-width: 800px;
        margin: 0 auto 42px;
        text-align: center;
      }

      .lp-section-head-left {
        max-width: 620px;
        margin-right: 0;
        margin-left: 0;
        text-align: left;
      }

      .lp-section-head h2,
      .lp-final-box h2 {
        margin: 12px 0 0;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.7rem;
        font-weight: 520;
        line-height: 1.03;
        letter-spacing: 0;
      }

      .lp-section-head p {
        margin: 18px auto 0;
        max-width: 690px;
        font-size: 1.02rem;
      }

      .lp-section-head-left p {
        margin-left: 0;
      }

      .lp-card-grid {
        display: grid;
        gap: 14px;
      }

      .lp-card-grid-three {
        grid-template-columns: repeat(3, 1fr);
      }

      .lp-card-grid-four {
        grid-template-columns: repeat(4, 1fr);
      }

      .lp-info-card,
      .lp-module-card {
        padding: 22px;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease;
      }

      .lp-info-card:hover,
      .lp-module-card:hover,
      .lp-system-node:hover,
      .lp-price-card:hover {
        transform: translateY(-2px);
        border-color: rgba(94, 234, 212, 0.42);
      }

      .lp-info-card-danger {
        background:
          linear-gradient(180deg, rgba(244, 63, 94, 0.08), rgba(15, 23, 42, 0.78));
      }

      .lp-icon-box {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border: 1px solid rgba(94, 234, 212, 0.22);
        border-radius: 8px;
        background: rgba(94, 234, 212, 0.08);
        color: #5eead4;
      }

      .lp-info-card h3,
      .lp-module-card h3 {
        margin-top: 18px;
        font-size: 1.08rem;
      }

      .lp-info-card p,
      .lp-module-card p {
        margin: 10px 0 0;
        font-size: 0.93rem;
      }

      .lp-product-section,
      .lp-pricing-section {
        background:
          linear-gradient(180deg, rgba(8, 16, 28, 0) 0%, rgba(10, 15, 28, 0.72) 100%);
      }

      .lp-product-layout,
      .lp-risk-layout {
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        align-items: center;
        gap: 44px;
      }

      .lp-product-actions,
      .lp-risk-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 28px;
      }

      .lp-system-map {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
        position: relative;
      }

      .lp-system-map::before {
        content: "";
        position: absolute;
        inset: 50% 20px auto;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.5), transparent);
      }

      .lp-system-node {
        display: flex;
        gap: 14px;
        min-height: 146px;
        padding: 18px;
      }

      .lp-system-node p {
        margin: 8px 0 0;
        font-size: 0.9rem;
      }

      .lp-risk-section {
        background:
          linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(8, 16, 28, 0.42) 40%, rgba(245, 158, 11, 0.08));
      }

      .lp-risk-board {
        padding: 28px;
        background:
          linear-gradient(180deg, rgba(87, 24, 39, 0.58), rgba(15, 23, 42, 0.84));
      }

      .lp-risk-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fb7185;
      }

      .lp-risk-amount {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-top: 24px;
        color: #fecdd3;
      }

      .lp-risk-amount span {
        font-size: 1.5rem;
      }

      .lp-risk-amount strong {
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 5rem;
        font-weight: 520;
        line-height: 1;
      }

      .lp-risk-board p {
        max-width: 420px;
        margin: 14px 0 0;
      }

      .lp-risk-bars {
        display: grid;
        gap: 10px;
        margin-top: 28px;
      }

      .lp-risk-bars span {
        display: block;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(90deg, #fb7185, #fbbf24);
      }

      .lp-module-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lp-sector-section {
        background:
          linear-gradient(180deg, rgba(2, 6, 23, 0.22), rgba(8, 16, 28, 0.76));
      }

      .lp-timeline {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
      }

      .lp-step {
        min-height: 260px;
        padding: 22px;
      }

      .lp-step > span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 8px;
        background: rgba(94, 234, 212, 0.1);
        color: #99f6e4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-weight: 800;
      }

      .lp-step small {
        display: block;
        margin-top: 22px;
      }

      .lp-step h3 {
        margin-top: 10px;
      }

      .lp-step p {
        margin: 10px 0 0;
        font-size: 0.92rem;
      }

      .lp-pricing-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        align-items: stretch;
      }

      .lp-price-card {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 610px;
        padding: 26px;
      }

      .lp-price-card-featured {
        border-color: rgba(94, 234, 212, 0.55);
        background:
          linear-gradient(180deg, rgba(20, 184, 166, 0.16), rgba(15, 23, 42, 0.86));
        box-shadow: 0 26px 80px rgba(20, 184, 166, 0.16);
      }

      .lp-featured-label {
        position: absolute;
        top: 14px;
        right: 14px;
        border-radius: 999px;
        background: rgba(250, 204, 21, 0.14);
        color: #fde68a;
        padding: 6px 10px;
        font-size: 0.72rem;
        font-weight: 820;
      }

      .lp-price-head {
        padding-right: 92px;
      }

      .lp-price-head > span {
        display: block;
      }

      .lp-price-head strong {
        display: flex;
        align-items: baseline;
        gap: 4px;
        margin-top: 18px;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 3.65rem;
        font-weight: 520;
        line-height: 1;
      }

      .lp-price-head small,
      .lp-price-head em {
        color: #8b9bb1;
        font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
        font-size: 0.95rem;
        font-style: normal;
      }

      .lp-price-card p {
        margin: 18px 0 0;
        min-height: 76px;
        font-size: 0.93rem;
      }

      .lp-price-card ul {
        display: grid;
        gap: 12px;
        margin: 24px 0;
        padding: 0;
        list-style: none;
        flex: 1;
      }

      .lp-price-card li {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        color: #dbe4f0;
        font-size: 0.88rem;
        line-height: 1.5;
      }

      .lp-price-card li svg {
        flex: none;
        margin-top: 3px;
        color: #5eead4;
      }

      .lp-price-card .lp-button {
        width: 100%;
      }

      .lp-pricing-note {
        margin: 24px 0 0;
        color: #8b9bb1;
        text-align: center;
        font-size: 0.9rem;
      }

      .lp-faq-shell {
        max-width: 900px;
      }

      .lp-faq-list {
        border-top: 1px solid rgba(148, 163, 184, 0.16);
      }

      .lp-faq-item {
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      }

      .lp-faq-item button {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        border: 0;
        background: transparent;
        color: #f8fafc;
        padding: 24px 0;
        text-align: left;
        font-size: 1.08rem;
        font-weight: 760;
      }

      .lp-faq-item button svg {
        flex: none;
        color: #5eead4;
      }

      .lp-faq-item p {
        margin: -8px 0 24px;
        max-width: 720px;
      }

      .lp-final-cta {
        padding: 48px 0 108px;
      }

      .lp-final-box {
        padding: 58px;
        text-align: center;
        background:
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.045) 0, rgba(148, 163, 184, 0.045) 1px, transparent 1px, transparent 56px),
          linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(37, 99, 235, 0.18) 42%, rgba(15, 23, 42, 0.86));
      }

      .lp-final-box h2 {
        max-width: 760px;
        margin-right: auto;
        margin-left: auto;
      }

      .lp-final-box p {
        max-width: 680px;
        margin: 18px auto 0;
        font-size: 1.02rem;
      }

      .lp-footer {
        border-top: 1px solid rgba(148, 163, 184, 0.16);
        padding: 54px 0;
        background: rgba(2, 6, 23, 0.38);
      }

      .lp-footer-grid {
        display: grid;
        grid-template-columns: 1.7fr repeat(3, 1fr);
        gap: 32px;
      }

      .lp-footer p {
        max-width: 360px;
        margin: 16px 0 0;
      }

      .lp-footer strong,
      .lp-footer a,
      .lp-footer span {
        display: block;
      }

      .lp-footer strong {
        margin-bottom: 12px;
        color: #f8fafc;
      }

      .lp-footer a,
      .lp-footer span {
        margin-top: 9px;
        color: #8b9bb1;
        font-size: 0.9rem;
        text-decoration: none;
      }

      .lp-footer a:hover {
        color: #5eead4;
      }

      @media (min-width: 900px) {
        .lp-hero h1 {
          font-size: 5rem;
        }
      }

      @media (min-width: 1160px) {
        .lp-hero h1 {
          font-size: 5.65rem;
        }
      }

      @media (max-width: 1020px) {
        .lp-nav-links,
        .lp-nav-actions {
          display: none;
        }

        .lp-menu-button {
          display: inline-flex;
        }

        .lp-mobile-menu {
          display: grid;
          gap: 4px;
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 12px 0 18px;
        }

        .lp-mobile-menu a {
          border-radius: 8px;
          color: #dbe4f0;
          padding: 12px;
          text-decoration: none;
        }

        .lp-mobile-menu a:hover {
          background: rgba(148, 163, 184, 0.08);
        }

        .lp-command-grid,
        .lp-card-grid-three,
        .lp-card-grid-four,
        .lp-product-layout,
        .lp-risk-layout,
        .lp-timeline,
        .lp-pricing-grid,
        .lp-footer-grid {
          grid-template-columns: 1fr 1fr;
        }

        .lp-ai-panel {
          grid-column: span 2;
        }

        .lp-product-layout,
        .lp-risk-layout {
          gap: 32px;
        }
      }

      @media (max-width: 760px) {
        .lp-shell {
          width: min(100% - 28px, 1180px);
        }

        .lp-nav-inner {
          min-height: 66px;
        }

        .lp-hero {
          padding-top: 48px;
        }

        .lp-hero h1 {
          font-size: 3rem;
        }

        .lp-hero-copy > p {
          font-size: 1rem;
        }

        .lp-hero-actions,
        .lp-product-actions,
        .lp-risk-actions {
          flex-direction: column;
        }

        .lp-button {
          width: 100%;
        }

        .lp-signal-row {
          justify-content: flex-start;
          text-align: left;
        }

        .lp-command {
          margin-top: 34px;
        }

        .lp-command-title {
          display: none;
        }

        .lp-live-pill {
          font-size: 0.72rem;
        }

        .lp-command-grid,
        .lp-proof-grid,
        .lp-card-grid-three,
        .lp-card-grid-four,
        .lp-product-layout,
        .lp-risk-layout,
        .lp-system-map,
        .lp-timeline,
        .lp-pricing-grid,
        .lp-footer-grid {
          grid-template-columns: 1fr;
        }

        .lp-ai-panel {
          grid-column: auto;
        }

        .lp-proof-item {
          border-right: none;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }

        .lp-proof-item:last-child {
          border-bottom: none;
        }

        .lp-section {
          padding: 76px 0;
        }

        .lp-section-head,
        .lp-section-head-left {
          text-align: left;
        }

        .lp-section-head h2,
        .lp-final-box h2 {
          font-size: 2.25rem;
        }

        .lp-risk-amount strong {
          font-size: 4rem;
        }

        .lp-price-card {
          min-height: auto;
        }

        .lp-final-box {
          padding: 30px 18px;
          text-align: left;
        }

        .lp-final-box .lp-hero-actions {
          align-items: stretch;
        }
      }

      @media (max-width: 420px) {
        .lp-hero h1 {
          font-size: 2.55rem;
        }

        .lp-command-topbar {
          padding: 0 10px;
        }

        .lp-command-grid {
          padding: 10px;
        }

        .lp-command-panel,
        .lp-info-card,
        .lp-module-card,
        .lp-price-card,
        .lp-step,
        .lp-risk-board {
          padding: 18px;
        }
      }
    `}</style>
  )
}
