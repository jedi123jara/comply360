'use client'

import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { MarketingPricingGrid } from '@/components/marketing/pricing-grid'
import { track } from '@/lib/analytics'

type RoleHome = '/dashboard' | '/mi-portal'

const navItems = [
  ['Demo', '#demo'],
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
  {
    value: '4 equipos',
    label: 'RRHH, SST, legal y jefes alineados',
  },
] as const

const heroMetrics = [
  {
    value: '88/100',
    label: 'score SUNAFIL demo',
  },
  {
    value: '17',
    label: 'acciones críticas priorizadas',
  },
  {
    value: '241',
    label: 'boletas firmadas esta semana',
  },
] as const

const commandSites = [
  { name: 'Sede Lima Norte', status: 'En control', width: '82%' },
  { name: 'Obra Villa', status: 'Atención SST', width: '58%' },
  { name: 'Tienda Sur', status: 'Documentos listos', width: '91%' },
] as const

const riskBreakdown = [
  { label: 'Capacitaciones SST', value: 'Crítico', width: '88%' },
  { label: 'Contratos por vencer', value: 'Medio', width: '64%' },
  { label: 'Boletas sin cargo', value: 'Bajo', width: '42%' },
] as const

const controlPillars = [
  {
    icon: Radar,
    metric: 'Riesgo vivo',
    title: 'Prioriza antes de que SUNAFIL priorice por ti',
    body: 'Alertas por sede, área y responsable para saber qué atender hoy y qué puede esperar.',
  },
  {
    icon: FileCheck2,
    metric: 'Evidencia trazable',
    title: 'Cada documento con dueño, fecha y contexto',
    body: 'Contratos, boletas, SST y firmas quedan ordenados para responder sin reconstruir historias.',
  },
  {
    icon: UsersRound,
    metric: 'Portal trabajador',
    title: 'Menos persecución por chat y correo',
    body: 'El trabajador firma, revisa, solicita y recibe avisos desde una experiencia móvil clara.',
  },
] as const

const platformTourScenes = [
  {
    time: '00:03',
    label: 'Tablero ejecutivo',
    title: 'El empleador ve el riesgo real del día',
    body: 'Score, sedes y responsables aparecen juntos para decidir qué corregir primero.',
    voice: 'La gerencia no espera otro Excel: entra y ve exposición, avance y prioridades en una sola pantalla.',
    result: 'Prioridad de la semana definida',
    click: 'Clic en score SUNAFIL',
    route: 'app.comply360.pe/dashboard',
    src: '/landing/platform-dashboard.png',
    alt: 'Tour guiado del dashboard de Comply360 con score de cumplimiento',
    origin: '32% 42%',
    hotspot: { left: '20%', top: '18%', width: '26%', height: '38%' },
    callout: { left: '47%', top: '18%' },
  },
  {
    time: '00:08',
    label: 'Alertas críticas',
    title: 'Las multas probables suben al frente',
    body: 'Vencimientos, legajos incompletos y acciones críticas quedan ordenadas por impacto.',
    voice: 'El equipo deja de perseguir pendientes sueltos y trabaja por criticidad, dueño y fecha límite.',
    result: 'Acciones asignadas por impacto',
    click: 'Clic en alertas críticas',
    route: 'app.comply360.pe/riesgos',
    src: '/landing/platform-dashboard.png',
    alt: 'Tour guiado de alertas críticas y plan de acción en Comply360',
    origin: '72% 30%',
    hotspot: { left: '78%', top: '20%', width: '18%', height: '17%' },
    callout: { left: '54%', top: '53%' },
  },
  {
    time: '00:13',
    label: 'Modo inspección',
    title: 'SUNAFIL llega y el expediente ya existe',
    body: 'La pantalla guía al equipo para registrar datos, abrir evidencia y responder sin improvisar.',
    voice: 'Cuando hay visita, Comply360 cambia de tablero a sala de control: cada documento y paso queda trazado.',
    result: 'Expediente vivo listo para mostrar',
    click: 'Clic en iniciar inspección',
    route: 'app.comply360.pe/inspeccion-en-vivo',
    src: '/landing/platform-inspection.png',
    alt: 'Tour guiado del modo inspección en vivo de Comply360',
    origin: '62% 58%',
    hotspot: { left: '22%', top: '45%', width: '74%', height: '26%' },
    callout: { left: '20%', top: '18%' },
  },
  {
    time: '00:18',
    label: 'Portal trabajador',
    title: 'El trabajador cierra el circuito desde el celular',
    body: 'Boletas, pagos y constancias viven en el portal con recepción auditable.',
    voice: 'RRHH gana horas porque el trabajador firma, revisa y consulta desde una experiencia simple y móvil.',
    result: 'Evidencia firmada sin persecución',
    click: 'Clic en firmar pendiente',
    route: 'app.comply360.pe/mi-portal',
    src: '/landing/platform-worker.png',
    alt: 'Tour guiado del portal trabajador de Comply360',
    origin: '74% 34%',
    hotspot: { left: '73%', top: '16%', width: '22%', height: '48%' },
    callout: { left: '21%', top: '62%' },
  },
] as const

const riskNarratives = [
  {
    title: 'El riesgo aparece tarde',
    body: 'SST vencido, contratos incompletos, boletas sin firma y capacitaciones dispersas salen a la luz cuando ya estás contra el reloj.',
  },
  {
    title: 'La evidencia vive en mil lugares',
    body: 'Excel, WhatsApp, PDFs sueltos, carpetas compartidas y correos. El inspector no espera a que tu equipo reconstruya la historia.',
  },
  {
    title: 'RRHH termina como mesa de ayuda',
    body: 'Vacaciones, boletas, documentos, firmas y consultas legales consumen horas que deberían ir a gestión y prevención.',
  },
] as const

const operatingShifts = [
  'Los vencimientos dejan de depender de memoria o chats: aparecen por sede, criticidad y responsable.',
  'Cada trabajador, contrato y evento SST deja rastro; la evidencia ya no se reconstruye de emergencia.',
  'La gerencia ve prioridad, exposición y avance sin esperar que RRHH arme otro reporte manual.',
  'Cuando llega una inspección, el equipo abre el expediente vivo y responde con trazabilidad.',
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
    body: 'Contratos, anexos, políticas, boletas y constancias con trazabilidad y vencimientos.',
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
    title: 'Logística y servicios',
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
    body: 'Migramos legajos, configuramos roles, flujos, alertas y responsables por módulo.',
  },
  {
    label: 'Operación',
    title: 'Tu equipo trabaja desde un solo lugar',
    body: 'RRHH, SST, legal, jefes de sede y trabajadores firman, revisan y actúan sin perseguirse por chat.',
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
    q: '¿Cuánto demora implementarlo?',
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

  useEffect(() => {
    const scrollToCurrentHash = () => {
      const id = window.location.hash.slice(1)
      if (!id) return

      const target = document.getElementById(decodeURIComponent(id))
      if (!target) return

      target.scrollIntoView({ block: 'start' })
    }

    const scheduleHashScroll = () => {
      window.requestAnimationFrame(scrollToCurrentHash)
      window.setTimeout(scrollToCurrentHash, 250)
      window.setTimeout(scrollToCurrentHash, 900)
    }

    scheduleHashScroll()
    window.addEventListener('hashchange', scheduleHashScroll)

    return () => {
      window.removeEventListener('hashchange', scheduleHashScroll)
    }
  }, [])

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
    <main className="c360-landing c360-marketing-light">
      <LandingNav
        isSignedIn={isSignedIn}
        roleHome={roleHome}
        ctaHref={ctaHref}
        onCtaClick={handleCtaClick('nav_demo')}
      />
      <Hero ctaHref={ctaHref} onCtaClick={handleCtaClick('hero_demo')} />
      <PlatformDemoSection />
      <ProofRail />
      <ControlSection />
      <ProblemSection />
      <TransformationSection />
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
            <span>{isSignedIn ? 'Ir al producto' : 'Crear cuenta'}</span>
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
            <span>{isSignedIn ? 'Ir al producto' : 'Crear cuenta'}</span>
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
        <div className="lp-hero-stage">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <Sparkles aria-hidden size={15} />
              Command center laboral para empresas peruanas
            </div>
            <h1>Convierte el caos laboral en evidencia lista para SUNAFIL.</h1>
            <p>
              Comply360 une RRHH, SST, legal, jefes de sede y trabajadores en una operación
              trazable: riesgos priorizados, documentos vivos, alertas accionables y portal
              trabajador desde el celular.
            </p>
            <div className="lp-hero-actions">
              <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary lp-button-large">
                <span>Crear cuenta gratis</span>
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
            <div className="lp-hero-metrics" aria-label="Indicadores de vista demo">
              {heroMetrics.map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <LeadCapturePanel />
        </div>

        <CommandCenterVisual />
      </div>
    </section>
  )
}

function LeadCapturePanel() {
  return (
    <form
      action="/diagnostico-gratis"
      method="get"
      className="lp-lead-panel"
      onSubmit={() => track('free_diagnostic_started', { source: 'hero_panel' })}
    >
      <div className="lp-lead-kicker">
        <ShieldCheck aria-hidden size={16} />
        Diagnóstico gratis
      </div>
      <h2>Calcula tu exposición SUNAFIL en 90 segundos.</h2>
      <p>
        Recibe una lectura inicial del riesgo, los documentos críticos y el primer plan de
        acción para ordenar tu operación.
      </p>

      <div className="lp-lead-fields">
        <label className="lp-field">
          <span>Sector</span>
          <select name="sector" defaultValue="multi-sede">
            <option value="multi-sede">Empresa multi-sede</option>
            <option value="construccion">Construcción / campo</option>
            <option value="retail">Retail / restaurantes</option>
            <option value="servicios">Logística / servicios</option>
          </select>
        </label>
        <label className="lp-field">
          <span>Trabajadores</span>
          <select name="workers" defaultValue="51-250">
            <option value="1-50">1 a 50</option>
            <option value="51-250">51 a 250</option>
            <option value="251-1000">251 a 1000</option>
            <option value="1000+">Más de 1000</option>
          </select>
        </label>
        <label className="lp-field lp-field-wide">
          <span>Correo corporativo</span>
          <input
            name="email"
            type="email"
            placeholder="tu@empresa.pe"
            style={{ background: '#ffffff', backgroundColor: '#ffffff', colorScheme: 'light' }}
          />
        </label>
      </div>

      <button className="lp-button lp-button-primary lp-button-large" type="submit">
        <span>Ver mi riesgo inicial</span>
        <ArrowRight aria-hidden size={18} />
      </button>

      <div className="lp-lead-trust">
        <Check aria-hidden size={14} />
        Sin tarjeta. Sin spam. Con contexto laboral peruano.
      </div>
    </form>
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
          <div className="lp-score-meta">
            <span>Meta de 30 días</span>
            <strong>93/100</strong>
          </div>
        </div>

        <div className="lp-command-panel lp-action-panel">
          <div className="lp-panel-header">
            <div>
              <span className="lp-panel-label">Plan de acción</span>
              <h3>Hoy requiere atención</h3>
            </div>
            <ClipboardCheck aria-hidden size={22} />
          </div>
          <div className="lp-action-list">
            <ActionItem status="critical" title="Capacitación SST vencida" meta="Obra Norte · 17 personas" />
            <ActionItem status="warning" title="Contrato por renovar" meta="Equipo ventas · vence en 6 días" />
            <ActionItem status="ok" title="Boletas firmadas" meta="241/247 completadas" />
          </div>
        </div>

        <div className="lp-command-panel lp-site-panel">
          <div className="lp-panel-header">
            <div>
              <span className="lp-panel-label">Mapa multi-sede</span>
              <h3>Riesgo por operación</h3>
            </div>
            <Radar aria-hidden size={22} />
          </div>
          <div className="lp-site-list">
            {commandSites.map((site) => (
              <div key={site.name} className="lp-site-row">
                <div>
                  <strong>{site.name}</strong>
                  <small>{site.status}</small>
                </div>
                <span>
                  <i style={{ width: site.width }} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-command-panel lp-inspection-panel">
          <div className="lp-panel-label">Modo inspección</div>
          <h3>Expediente listo</h3>
          <div className="lp-document-stack">
            <span>IPERC 2026</span>
            <span>Comité SST</span>
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
          <div className="lp-ai-status" aria-hidden="true">
            <span />
            Listo para responder
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

function PlatformDemoSection() {
  return (
    <section className="lp-section lp-demo-section" id="demo">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Demo cinematográfica"
          title="Mira el SaaS operando como lo vería un empleador antes de una inspección."
          lead="Un recorrido guiado con capturas reales, clics, acercamientos y narrativa ejecutiva: del riesgo disperso a evidencia lista para mostrar."
        />

        <div className="lp-demo-player lp-tour-player" aria-label="Tour animado de Comply360 funcionando">
          <div className="lp-demo-player-top lp-tour-top">
            <div className="lp-demo-playing">
              <PlayCircle aria-hidden size={18} />
              Demo guiada en reproducción
            </div>
            <div className="lp-tour-status" aria-label="Estado de la demo">
              <span>
                <i aria-hidden="true" />
                Capturas reales del producto
              </span>
              <strong>00:00 / 00:28</strong>
            </div>
          </div>

          <div className="lp-tour-layout">
            <div className="lp-tour-stage">
              <div className="lp-tour-browser-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <strong>app.comply360.pe/demo-empleador</strong>
              </div>

              <div className="lp-tour-scenes">
                {platformTourScenes.map((scene, index) => (
                  <figure
                    key={`${scene.time}-${scene.label}`}
                    className="lp-tour-scene"
                    style={
                      {
                        '--tour-delay': `${index * 7}s`,
                        '--tour-origin': scene.origin,
                        '--hotspot-left': scene.hotspot.left,
                        '--hotspot-top': scene.hotspot.top,
                        '--hotspot-width': scene.hotspot.width,
                        '--hotspot-height': scene.hotspot.height,
                        '--callout-left': scene.callout.left,
                        '--callout-top': scene.callout.top,
                      } as CSSProperties
                    }
                  >
                    <Image
                      src={scene.src}
                      alt={scene.alt}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 1020px) calc(100vw - 48px), 820px"
                    />
                    <div className="lp-tour-route-pill">{scene.route}</div>
                    <div className="lp-tour-vignette" aria-hidden="true" />
                    <div className="lp-tour-hotspot" aria-hidden="true" />
                    <figcaption className="lp-tour-callout">
                      <span>{scene.time} · {scene.label}</span>
                      <h3>{scene.title}</h3>
                      <p>{scene.body}</p>
                      <small>{scene.click}</small>
                    </figcaption>
                  </figure>
                ))}
                <div className="lp-tour-cursor" aria-hidden="true" />
              </div>
            </div>

            <aside className="lp-tour-director" aria-label="Narrativa del recorrido">
              <div className="lp-tour-director-head">
                <span>Guion comercial</span>
                <strong>Recorrido empleador</strong>
                <p>Cuatro momentos que conectan gerencia, RRHH, SST y trabajador.</p>
              </div>
              <div className="lp-tour-chapters">
                {platformTourScenes.map((scene, index) => (
                  <article
                    key={`chapter-${scene.time}`}
                    className="lp-tour-chapter"
                    style={{ '--tour-delay': `${index * 7}s` } as CSSProperties}
                  >
                    <div>
                      <span>{scene.time}</span>
                      <strong>{scene.label}</strong>
                    </div>
                    <p>{scene.voice}</p>
                    <small>{scene.result}</small>
                  </article>
                ))}
              </div>
            </aside>
          </div>

          <div className="lp-demo-controls">
            <div className="lp-demo-progress" aria-hidden="true">
              <span />
            </div>
            <div className="lp-tour-takeaways" aria-label="Resultados del recorrido">
              <div>
                <span>Lo que ve gerencia</span>
                <strong>Riesgo priorizado por impacto</strong>
              </div>
              <div>
                <span>Lo que ejecuta RRHH</span>
                <strong>Responsables, fechas y evidencia</strong>
              </div>
              <div>
                <span>Lo que recibe SUNAFIL</span>
                <strong>Expediente trazable y listo</strong>
              </div>
            </div>
            <div className="lp-real-demo-proof lp-tour-proof">
              <Check aria-hidden size={17} />
              Tour construido con pantallas reales de Comply360, animado con clics, zoom y lectura ejecutiva para una demo de venta.
            </div>
          </div>
        </div>
      </div>
    </section>
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

function ControlSection() {
  return (
    <section className="lp-section lp-control-section">
      <div className="lp-shell lp-control-shell">
        <div className="lp-control-copy">
          <div className="lp-eyebrow">
            <ClipboardCheck aria-hidden size={15} />
            Control operativo
          </div>
          <h2>Una sola fuente de verdad para riesgo, evidencia y acción.</h2>
          <p>
            La diferencia entre una empresa preparada y una empresa corriendo es visible:
            responsables claros, documentos actualizados, trabajadores informados y gerencia
            mirando el mismo tablero.
          </p>
        </div>

        <div className="lp-control-grid">
          {controlPillars.map(({ icon: Icon, metric, title, body }) => (
            <article key={title} className="lp-control-card">
              <div className="lp-control-card-top">
                <div className="lp-icon-box">
                  <Icon aria-hidden size={21} />
                </div>
                <span>{metric}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="lp-section lp-narrative-section" id="riesgo">
      <div className="lp-shell lp-narrative-shell">
        <h2>El cumplimiento laboral no falla por falta de esfuerzo. Falla por falta de sistema.</h2>
        <p>
          Tu equipo puede ser excelente y aun así vivir expuesto si la evidencia está rota,
          los plazos no conversan y cada sede decide con su propio Excel.
        </p>
        <div className="lp-narrative-lines">
          {riskNarratives.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TransformationSection() {
  return (
    <section className="lp-section lp-shift-section">
      <div className="lp-shell lp-shift-layout">
        <div>
          <h2>Del desorden defensivo a una operación que se anticipa.</h2>
          <p>
            Comply360 no maquilla carpetas. Convierte cumplimiento, SST y legal laboral en
            una rutina clara: qué hacer, quién responde, qué falta y cómo se demuestra.
          </p>
        </div>
        <div className="lp-shift-lines">
          {operatingShifts.map((item, index) => (
            <div key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </div>
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
          <SystemNode icon={HardHat} title="SST" body="Plan anual, comité, IPERC, EMO y visitas." />
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
          <div className="lp-risk-bars">
            {riskBreakdown.map((risk) => (
              <div key={risk.label} className="lp-risk-line">
                <div>
                  <span>{risk.label}</span>
                  <strong>{risk.value}</strong>
                </div>
                <i aria-hidden="true">
                  <b style={{ width: risk.width }} />
                </i>
              </div>
            ))}
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
          eyebrow="Especialización"
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
  return (
    <section className="lp-section lp-pricing-section" id="precios">
      <div className="lp-shell">
        <SectionHeading
          eyebrow="Precios"
          title="Planes claros para pasar de reaccionar a controlar."
          lead="Tres caminos simples: ordenar una PYME, escalar una empresa en crecimiento o gobernar una operación multi-sede."
        />
        <MarketingPricingGrid
          variant="landing"
          featuredPlan="PRO"
          ctaHref={ctaHref}
          signedIn={Boolean(isSignedIn)}
          onPlanClick={onPricingClick}
        />
        <p className="lp-pricing-note">
          Enterprise disponible para holdings, empresas 300+ trabajadores e integraciones con sistemas externos.
        </p>
      </div>
    </section>
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
            Primer paso
          </div>
          <h2>Trae tu caos documental. Sal con una ruta clara para ordenarlo.</h2>
          <p>
            Crea tu cuenta, corre el diagnóstico inicial y mira qué documentos, alertas y
            flujos deberías priorizar para llegar preparado a una inspección.
          </p>
          <div className="lp-hero-actions">
            <Link href={ctaHref} onClick={onCtaClick} className="lp-button lp-button-primary lp-button-large">
              <span>{isSignedIn ? 'Ir al producto' : 'Crear cuenta gratis'}</span>
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
        cursor: pointer;
        font-family: inherit;
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

      .lp-hero-stage {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 390px;
        align-items: center;
        gap: 34px;
      }

      .lp-hero-copy {
        max-width: 760px;
        margin: 0;
        text-align: left;
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
        margin: 24px 0 0;
        color: #cbd5e1;
        font-size: 1.08rem;
        line-height: 1.7;
      }

      .lp-hero-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 12px;
        margin-top: 28px;
      }

      .lp-signal-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
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

      .lp-hero-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        max-width: 680px;
        margin-top: 24px;
      }

      .lp-hero-metrics div {
        min-height: 92px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 14px;
        background: rgba(15, 23, 42, 0.58);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .lp-hero-metrics strong,
      .lp-hero-metrics span {
        display: block;
      }

      .lp-hero-metrics strong {
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2rem;
        font-weight: 520;
        line-height: 1;
      }

      .lp-hero-metrics span {
        margin-top: 8px;
        color: #8b9bb1;
        font-size: 0.78rem;
        line-height: 1.35;
      }

      .lp-hero-stage.lp-hero-stage-centered {
        display: block;
      }

      .lp-hero-stage-centered .lp-hero-copy {
        max-width: 980px;
        margin: 0 auto;
        text-align: center;
      }

      .lp-hero-stage-centered .lp-hero-copy > p {
        max-width: 780px;
        margin-right: auto;
        margin-left: auto;
      }

      .lp-hero-stage-centered .lp-hero-actions,
      .lp-hero-stage-centered .lp-signal-row {
        justify-content: center;
      }

      .lp-lead-panel {
        position: relative;
        overflow: hidden;
        width: 100%;
        margin: 0;
        padding: 22px;
        border: 1px solid rgba(94, 234, 212, 0.24);
        border-radius: 8px;
        background:
          linear-gradient(180deg, rgba(20, 184, 166, 0.14), rgba(15, 23, 42, 0.92)),
          rgba(15, 23, 42, 0.86);
        box-shadow:
          0 26px 70px rgba(0, 0, 0, 0.32),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .lp-lead-panel::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 3px;
        background: linear-gradient(90deg, #14b8a6, #38bdf8, #facc15);
      }

      .lp-lead-panel > * {
        position: relative;
      }

      .lp-lead-kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #99f6e4;
        font-size: 0.78rem;
        font-weight: 820;
        text-transform: uppercase;
      }

      .lp-lead-kicker svg {
        color: #5eead4;
      }

      .lp-lead-panel h2 {
        margin: 14px 0 0;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 1.82rem;
        font-weight: 520;
        line-height: 1.08;
        letter-spacing: 0;
      }

      .lp-lead-panel p {
        margin: 12px 0 0;
        color: #a8b8cc;
        font-size: 0.92rem;
        line-height: 1.58;
      }

      .lp-lead-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .lp-field {
        display: grid;
        gap: 7px;
      }

      .lp-field-wide {
        grid-column: 1 / -1;
      }

      .lp-field span {
        color: #dbe4f0;
        font-size: 0.78rem;
        font-weight: 720;
      }

      .lp-field input,
      .lp-field select {
        width: 100%;
        min-height: 44px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.48);
        color: #f8fafc;
        font: inherit;
        font-size: 0.9rem;
        outline: none;
        padding: 0 12px;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background 160ms ease;
      }

      .lp-field input::placeholder {
        color: #64748b;
      }

      .lp-field input:focus,
      .lp-field select:focus {
        border-color: rgba(94, 234, 212, 0.6);
        background: rgba(2, 6, 23, 0.68);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
      }

      .lp-field option {
        background: #0f172a;
        color: #f8fafc;
      }

      .lp-lead-panel .lp-button {
        width: 100%;
        margin-top: 16px;
      }

      .lp-lead-trust {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 12px;
        color: #8b9bb1;
        font-size: 0.78rem;
        line-height: 1.45;
      }

      .lp-lead-trust svg {
        flex: none;
        margin-top: 2px;
        color: #5eead4;
      }

      .lp-command {
        position: relative;
        width: min(1060px, 100%);
        margin: 30px auto 0;
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
        grid-template-columns: 0.85fr 1.35fr 1fr 0.95fr;
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

      .lp-score-meta {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 12px;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        padding-top: 12px;
        text-align: left;
      }

      .lp-score-meta span {
        color: #8b9bb1;
        font-size: 0.72rem;
        font-weight: 760;
      }

      .lp-score-meta strong {
        color: #99f6e4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.9rem;
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

      .lp-site-panel {
        background:
          linear-gradient(180deg, rgba(37, 99, 235, 0.14), rgba(15, 23, 42, 0.78));
      }

      .lp-site-list {
        display: grid;
        gap: 11px;
      }

      .lp-site-row {
        display: grid;
        gap: 8px;
      }

      .lp-site-row strong,
      .lp-site-row small {
        display: block;
      }

      .lp-site-row strong {
        color: #e5eef9;
        font-size: 0.82rem;
      }

      .lp-site-row small {
        margin-top: 2px;
        color: #8b9bb1;
        font-size: 0.74rem;
      }

      .lp-site-row > span {
        display: block;
        overflow: hidden;
        height: 8px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
      }

      .lp-site-row i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #14b8a6, #38bdf8);
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
        grid-column: span 4;
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

      .lp-ai-status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-left: auto;
        white-space: nowrap;
        color: #99f6e4;
        font-size: 0.75rem;
        font-weight: 760;
      }

      .lp-ai-status span {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.12);
      }

      @keyframes lp-demo-progress {
        from {
          width: 8%;
        }
        to {
          width: 100%;
        }
      }

      @keyframes lp-demo-cursor {
        0%, 100% {
          transform: translate(0, 0);
        }
        28% {
          transform: translate(236px, 42px);
        }
        56% {
          transform: translate(520px, 178px);
        }
        78% {
          transform: translate(760px, 86px);
        }
      }

      @keyframes lp-demo-row {
        0%, 100% {
          transform: translateX(0);
          border-color: rgba(148, 163, 184, 0.16);
        }
        45% {
          transform: translateX(6px);
          border-color: rgba(94, 234, 212, 0.5);
        }
      }

      @keyframes lp-tour-scene {
        0%, 22% {
          opacity: 1;
        }
        26%, 100% {
          opacity: 0;
        }
      }

      @keyframes lp-tour-image {
        0%, 6% {
          transform: scale(1.01);
        }
        11%, 23% {
          transform: scale(1.24);
        }
        26%, 100% {
          transform: scale(1.01);
        }
      }

      @keyframes lp-tour-hotspot {
        0%, 4% {
          opacity: 0;
          transform: scale(0.98);
        }
        6%, 23% {
          opacity: 1;
          transform: scale(1);
        }
        26%, 100% {
          opacity: 0;
          transform: scale(1.02);
        }
      }

      @keyframes lp-tour-callout {
        0%, 4% {
          opacity: 0;
          transform: translateY(12px);
        }
        6%, 23% {
          opacity: 1;
          transform: translateY(0);
        }
        26%, 100% {
          opacity: 0;
          transform: translateY(-8px);
        }
      }

      @keyframes lp-tour-chapter {
        0%, 22% {
          border-color: rgba(94, 234, 212, 0.48);
          background:
            linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(37, 99, 235, 0.14)),
            rgba(15, 23, 42, 0.92);
          box-shadow:
            0 16px 42px rgba(20, 184, 166, 0.14),
            inset 3px 0 0 #5eead4;
          opacity: 1;
          transform: translateX(0);
        }
        26%, 100% {
          border-color: rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.58);
          box-shadow: inset 3px 0 0 rgba(148, 163, 184, 0.16);
          opacity: 0.72;
          transform: translateX(0);
        }
      }

      @keyframes lp-tour-cursor {
        0% {
          left: 28%;
          top: 50%;
          opacity: 0;
        }
        4%, 20% {
          left: 36%;
          top: 49%;
          opacity: 1;
        }
        25%, 45% {
          left: 84%;
          top: 28%;
          opacity: 1;
        }
        50%, 70% {
          left: 62%;
          top: 66%;
          opacity: 1;
        }
        75%, 95% {
          left: 79%;
          top: 42%;
          opacity: 1;
        }
        100% {
          left: 36%;
          top: 49%;
          opacity: 0;
        }
      }

      @keyframes lp-tour-click {
        0%, 48% {
          opacity: 0;
          transform: scale(0.4);
        }
        58% {
          opacity: 0.54;
          transform: scale(1.15);
        }
        100% {
          opacity: 0;
          transform: scale(2.2);
        }
      }

      .lp-demo-section {
        padding: 92px 0 90px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(239, 246, 255, 0.48) 46%, rgba(255, 255, 255, 0));
      }

      .lp-demo-player {
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 8px;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96));
        box-shadow:
          0 34px 100px rgba(15, 23, 42, 0.22),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .lp-demo-player-top {
        display: flex;
        min-height: 58px;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        padding: 0 18px;
        color: #e5eef9;
      }

      .lp-demo-playing {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: #99f6e4;
        font-weight: 850;
      }

      .lp-demo-player-top > span {
        color: #cbd5e1;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .lp-demo-screen {
        position: relative;
        display: grid;
        grid-template-columns: 190px minmax(0, 1fr) 244px;
        gap: 14px;
        min-height: 430px;
        overflow: hidden;
        padding: 18px;
        background:
          radial-gradient(circle at 62% 22%, rgba(20, 184, 166, 0.18), transparent 34%),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.05) 0, rgba(148, 163, 184, 0.05) 1px, transparent 1px, transparent 44px),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.04) 0, rgba(148, 163, 184, 0.04) 1px, transparent 1px, transparent 44px);
      }

      .lp-demo-sidebar,
      .lp-demo-main,
      .lp-demo-phone,
      .lp-demo-steps article {
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.74);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
      }

      .lp-demo-sidebar {
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 16px;
      }

      .lp-demo-sidebar strong {
        color: #f8fafc;
        font-size: 1rem;
      }

      .lp-demo-sidebar span {
        display: block;
        border-radius: 8px;
        padding: 11px 12px;
        color: #cbd5e1;
        font-size: 0.82rem;
        font-weight: 760;
      }

      .lp-demo-sidebar .is-active {
        color: #99f6e4;
        background: rgba(20, 184, 166, 0.14);
      }

      .lp-demo-main {
        display: grid;
        align-content: start;
        gap: 14px;
        padding: 18px;
      }

      .lp-demo-main-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .lp-demo-main-head span {
        display: block;
        color: #5eead4;
        font-size: 0.76rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-demo-main-head h3 {
        margin: 8px 0 0;
        color: #f8fafc;
        font-size: 1.34rem;
        line-height: 1.18;
      }

      .lp-demo-main-head strong {
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 3.1rem;
        font-weight: 520;
        line-height: 0.95;
      }

      .lp-demo-kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .lp-demo-kpis div {
        min-height: 94px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 8px;
        padding: 12px;
        background: rgba(2, 6, 23, 0.32);
      }

      .lp-demo-kpis strong,
      .lp-demo-kpis span {
        display: block;
      }

      .lp-demo-kpis strong {
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.2rem;
        font-weight: 520;
        line-height: 1;
      }

      .lp-demo-kpis span {
        margin-top: 8px;
        color: #cbd5e1;
        font-size: 0.78rem;
        line-height: 1.35;
      }

      .lp-demo-feed {
        display: grid;
        gap: 9px;
      }

      .lp-demo-feed-row {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) 18px;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 11px;
        background: rgba(2, 6, 23, 0.28);
        animation: lp-demo-row 4.6s ease-in-out infinite;
      }

      .lp-demo-feed-row:nth-child(2) {
        animation-delay: 0.8s;
      }

      .lp-demo-feed-row:nth-child(3) {
        animation-delay: 1.5s;
      }

      .lp-demo-feed-row i {
        width: 8px;
        height: 8px;
        border-radius: 999px;
      }

      .lp-demo-critical i {
        background: #fb7185;
      }

      .lp-demo-ok i {
        background: #22c55e;
      }

      .lp-demo-warning i {
        background: #fbbf24;
      }

      .lp-demo-feed-row strong,
      .lp-demo-feed-row span {
        display: block;
      }

      .lp-demo-feed-row strong {
        color: #f8fafc;
        font-size: 0.9rem;
      }

      .lp-demo-feed-row span {
        margin-top: 2px;
        color: #cbd5e1;
        font-size: 0.78rem;
      }

      .lp-demo-feed-row svg {
        color: #5eead4;
      }

      .lp-demo-phone {
        align-self: stretch;
        padding: 16px;
        background:
          linear-gradient(180deg, rgba(20, 184, 166, 0.16), rgba(15, 23, 42, 0.78));
      }

      .lp-demo-phone-bar {
        width: 48px;
        height: 5px;
        margin: 0 auto 20px;
        border-radius: 999px;
        background: rgba(203, 213, 225, 0.46);
      }

      .lp-demo-phone > span {
        color: #5eead4;
        font-size: 0.74rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-demo-phone h3 {
        margin: 14px 0 0;
        color: #f8fafc;
        font-size: 1.25rem;
        line-height: 1.18;
      }

      .lp-demo-phone p {
        margin: 12px 0 0;
        color: #cbd5e1;
        font-size: 0.88rem;
        line-height: 1.55;
      }

      .lp-demo-signature {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 24px;
        border-radius: 8px;
        padding: 12px;
        color: #082f49;
        background: #ccfbf1;
        font-size: 0.84rem;
        font-weight: 900;
      }

      .lp-demo-cursor {
        position: absolute;
        left: 242px;
        top: 138px;
        width: 18px;
        height: 18px;
        border: 3px solid #ffffff;
        border-radius: 999px;
        background: #14b8a6;
        box-shadow:
          0 0 0 8px rgba(20, 184, 166, 0.18),
          0 16px 36px rgba(2, 6, 23, 0.42);
        animation: lp-demo-cursor 7.2s ease-in-out infinite;
      }

      .lp-demo-controls {
        border-top: 1px solid rgba(148, 163, 184, 0.16);
        padding: 16px 18px 18px;
      }

      .lp-demo-progress {
        overflow: hidden;
        height: 9px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
      }

      .lp-demo-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #14b8a6, #2563eb, #f59e0b);
        animation: lp-demo-progress 7.2s linear infinite;
      }

      .lp-demo-steps {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .lp-demo-steps article {
        min-height: 150px;
        padding: 14px;
      }

      .lp-demo-steps article > span {
        color: #99f6e4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .lp-demo-steps strong {
        display: block;
        margin-top: 8px;
        color: #5eead4;
        font-size: 0.74rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-demo-steps h3 {
        margin: 10px 0 0;
        color: #f8fafc;
        font-size: 0.98rem;
        line-height: 1.25;
      }

      .lp-demo-steps p {
        margin: 8px 0 0;
        color: #cbd5e1;
        font-size: 0.8rem;
        line-height: 1.48;
      }

      .lp-real-demo-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 0.36fr);
        gap: 14px;
        padding: 18px;
        background:
          radial-gradient(circle at 62% 22%, rgba(20, 184, 166, 0.18), transparent 34%),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.05) 0, rgba(148, 163, 184, 0.05) 1px, transparent 1px, transparent 44px),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.04) 0, rgba(148, 163, 184, 0.04) 1px, transparent 1px, transparent 44px);
      }

      .lp-real-demo-main,
      .lp-real-demo-thumb {
        overflow: hidden;
        min-width: 0;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.74);
        box-shadow:
          0 18px 50px rgba(2, 6, 23, 0.24),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .lp-real-demo-main {
        margin: 0;
      }

      .lp-real-demo-main img,
      .lp-real-demo-thumb img {
        display: block;
        width: 100%;
        height: auto;
        object-fit: cover;
        object-position: left top;
        background: #020617;
        filter: saturate(1.06) contrast(1.02);
      }

      .lp-real-demo-main img {
        aspect-ratio: 16 / 10;
      }

      .lp-real-demo-thumb img {
        aspect-ratio: 16 / 9;
      }

      .lp-real-demo-caption,
      .lp-real-demo-thumb figcaption {
        border-top: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.82);
      }

      .lp-real-demo-caption {
        padding: 16px 18px 18px;
      }

      .lp-real-demo-caption span,
      .lp-real-demo-thumb span {
        display: block;
        color: #5eead4;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-real-demo-caption h3 {
        margin: 8px 0 0;
        color: #f8fafc;
        font-size: 1.22rem;
        line-height: 1.18;
      }

      .lp-real-demo-caption p {
        margin: 8px 0 0;
        max-width: 760px;
        color: #cbd5e1;
        font-size: 0.9rem;
        line-height: 1.55;
      }

      .lp-real-demo-side {
        display: grid;
        grid-template-rows: repeat(2, minmax(0, 1fr));
        gap: 14px;
        min-width: 0;
      }

      .lp-real-demo-thumb {
        display: grid;
        align-content: start;
        margin: 0;
      }

      .lp-real-demo-thumb figcaption {
        padding: 12px 14px 14px;
      }

      .lp-real-demo-thumb strong {
        display: block;
        margin-top: 7px;
        color: #f8fafc;
        font-size: 0.92rem;
        line-height: 1.28;
      }

      .lp-real-demo-proof {
        display: flex;
        min-height: 150px;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        border: 1px solid rgba(94, 234, 212, 0.24);
        border-radius: 8px;
        padding: 14px;
        color: #dbeafe;
        background:
          linear-gradient(180deg, rgba(20, 184, 166, 0.12), rgba(37, 99, 235, 0.08)),
          rgba(15, 23, 42, 0.74);
        font-size: 0.88rem;
        font-weight: 800;
        line-height: 1.42;
      }

      .lp-real-demo-proof svg {
        color: #5eead4;
      }

      .lp-tour-player {
        position: relative;
      }

      .lp-tour-top {
        align-items: center;
        flex-wrap: wrap;
      }

      .lp-tour-status {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        color: #cbd5e1;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .lp-tour-status span {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .lp-tour-status i {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
      }

      .lp-tour-status strong {
        color: #f8fafc;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.82rem;
      }

      .lp-tour-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 330px;
        gap: 0;
        background:
          radial-gradient(circle at 28% 16%, rgba(20, 184, 166, 0.18), transparent 34%),
          linear-gradient(135deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.96));
      }

      .lp-tour-stage {
        position: relative;
        overflow: hidden;
        min-width: 0;
        padding: 50px 18px 18px;
        background:
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.05) 0, rgba(148, 163, 184, 0.05) 1px, transparent 1px, transparent 44px),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.04) 0, rgba(148, 163, 184, 0.04) 1px, transparent 1px, transparent 44px);
      }

      .lp-tour-browser-bar {
        position: absolute;
        inset: 0 0 auto;
        display: flex;
        height: 42px;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        padding: 0 18px;
        color: #94a3b8;
        background: rgba(15, 23, 42, 0.82);
      }

      .lp-tour-browser-bar span {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #fb7185;
      }

      .lp-tour-browser-bar span:nth-child(2) {
        background: #fbbf24;
      }

      .lp-tour-browser-bar span:nth-child(3) {
        background: #22c55e;
      }

      .lp-tour-browser-bar strong {
        margin-left: 8px;
        overflow: hidden;
        color: #cbd5e1;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.78rem;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lp-tour-scenes {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        aspect-ratio: 16 / 10;
        background: #020617;
        box-shadow:
          0 28px 82px rgba(2, 6, 23, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .lp-tour-scene {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        animation: lp-tour-scene 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
      }

      .lp-tour-scene img {
        object-fit: cover;
        object-position: left top;
        transform-origin: var(--tour-origin);
        animation: lp-tour-image 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
        filter: saturate(1.08) contrast(1.03);
      }

      .lp-tour-route-pill {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 3;
        max-width: calc(100% - 24px);
        overflow: hidden;
        border: 1px solid rgba(203, 213, 225, 0.22);
        border-radius: 999px;
        padding: 7px 11px;
        color: #dbeafe;
        background: rgba(2, 6, 23, 0.76);
        box-shadow: 0 12px 34px rgba(2, 6, 23, 0.32);
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.72rem;
        font-weight: 850;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lp-tour-vignette {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at var(--hotspot-left) var(--hotspot-top), transparent 0, transparent 16%, rgba(2, 6, 23, 0.12) 44%, rgba(2, 6, 23, 0.5) 100%),
          linear-gradient(180deg, rgba(2, 6, 23, 0), rgba(2, 6, 23, 0.28));
        pointer-events: none;
      }

      .lp-tour-hotspot {
        position: absolute;
        left: var(--hotspot-left);
        top: var(--hotspot-top);
        width: var(--hotspot-width);
        height: var(--hotspot-height);
        border: 2px solid rgba(94, 234, 212, 0.92);
        border-radius: 8px;
        background: rgba(20, 184, 166, 0.08);
        box-shadow:
          0 0 0 999px rgba(2, 6, 23, 0.18),
          0 0 0 8px rgba(20, 184, 166, 0.12),
          0 22px 60px rgba(20, 184, 166, 0.24);
        opacity: 0;
        pointer-events: none;
        animation: lp-tour-hotspot 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
      }

      .lp-tour-callout {
        position: absolute;
        left: var(--callout-left);
        top: var(--callout-top);
        z-index: 2;
        width: min(390px, calc(100% - 32px));
        border: 1px solid rgba(94, 234, 212, 0.32);
        border-radius: 8px;
        padding: 16px;
        color: #e5eef9;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(8, 13, 27, 0.9)),
          rgba(2, 6, 23, 0.94);
        box-shadow:
          0 18px 56px rgba(2, 6, 23, 0.46),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        opacity: 0;
        backdrop-filter: blur(14px) saturate(1.2);
        animation: lp-tour-callout 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
      }

      .lp-tour-callout span {
        display: block;
        color: #5eead4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-tour-callout h3 {
        margin: 8px 0 0;
        color: #f8fafc;
        font-size: 1.1rem;
        line-height: 1.2;
      }

      .lp-tour-callout p {
        margin: 8px 0 0;
        color: #cbd5e1;
        font-size: 0.86rem;
        line-height: 1.5;
      }

      .lp-tour-callout small {
        display: inline-flex;
        margin-top: 12px;
        border-radius: 999px;
        padding: 7px 10px;
        color: #082f49;
        background: #ccfbf1;
        font-size: 0.74rem;
        font-weight: 900;
      }

      .lp-tour-cursor {
        position: absolute;
        z-index: 5;
        width: 30px;
        height: 32px;
        background: transparent;
        filter: drop-shadow(0 12px 18px rgba(2, 6, 23, 0.48));
        animation: lp-tour-cursor 28s ease-in-out infinite;
      }

      .lp-tour-cursor::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 24px;
        height: 30px;
        background: #f8fafc;
        clip-path: polygon(0 0, 0 24px, 7px 18px, 12px 30px, 17px 28px, 12px 16px, 22px 16px);
      }

      .lp-tour-cursor::after {
        content: "";
        position: absolute;
        left: -5px;
        top: -3px;
        width: 24px;
        height: 24px;
        border: 2px solid rgba(94, 234, 212, 0.8);
        border-radius: 999px;
        opacity: 0;
        animation: lp-tour-click 7s ease-out infinite;
      }

      .lp-tour-player .lp-demo-progress span {
        animation-duration: 28s;
      }

      .lp-tour-director {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 14px;
        border-left: 1px solid rgba(148, 163, 184, 0.16);
        padding: 18px;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.96)),
          #020617;
      }

      .lp-tour-director-head {
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 14px;
        background: rgba(15, 23, 42, 0.62);
      }

      .lp-tour-director-head span {
        color: #5eead4;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-tour-director-head strong {
        display: block;
        margin-top: 7px;
        color: #f8fafc;
        font-size: 1.02rem;
        line-height: 1.2;
      }

      .lp-tour-director-head p {
        margin: 8px 0 0;
        color: #cbd5e1;
        font-size: 0.82rem;
        line-height: 1.5;
      }

      .lp-tour-chapters {
        display: grid;
        gap: 9px;
      }

      .lp-tour-chapter {
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 8px;
        padding: 12px;
        background: rgba(15, 23, 42, 0.58);
        box-shadow: inset 3px 0 0 rgba(148, 163, 184, 0.16);
        animation: lp-tour-chapter 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
      }

      .lp-tour-chapter div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .lp-tour-chapter span {
        color: #99f6e4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .lp-tour-chapter strong {
        color: #e2e8f0;
        font-size: 0.74rem;
        font-weight: 900;
        text-align: right;
        text-transform: uppercase;
      }

      .lp-tour-chapter p {
        margin: 9px 0 0;
        color: #cbd5e1;
        font-size: 0.8rem;
        line-height: 1.48;
      }

      .lp-tour-chapter small {
        display: inline-flex;
        margin-top: 10px;
        border-radius: 999px;
        padding: 6px 9px;
        color: #082f49;
        background: #ccfbf1;
        font-size: 0.7rem;
        font-weight: 900;
      }

      .lp-tour-takeaways {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .lp-tour-takeaways div {
        min-height: 92px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 14px;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.54));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
      }

      .lp-tour-takeaways span,
      .lp-tour-takeaways strong {
        display: block;
      }

      .lp-tour-takeaways span {
        color: #99f6e4;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-tour-takeaways strong {
        margin-top: 10px;
        color: #f8fafc;
        font-size: 0.98rem;
        line-height: 1.26;
      }

      .lp-tour-proof {
        min-height: auto;
        margin-top: 12px;
      }

      .lp-proof {
        border-top: 1px solid rgba(148, 163, 184, 0.12);
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(2, 6, 23, 0.28);
      }

      .lp-proof-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
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

      .lp-control-section {
        padding: 92px 0 76px;
        background:
          linear-gradient(180deg, rgba(2, 6, 23, 0.1), rgba(8, 16, 28, 0.34));
      }

      .lp-control-shell {
        display: grid;
        grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
        gap: 42px;
        align-items: center;
      }

      .lp-control-copy h2 {
        margin: 18px 0 0;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.85rem;
        font-weight: 520;
        line-height: 1.04;
      }

      .lp-control-copy p {
        margin: 20px 0 0;
        color: #a8b8cc;
        font-size: 1rem;
        line-height: 1.72;
      }

      .lp-control-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .lp-control-card {
        position: relative;
        overflow: hidden;
        min-height: 256px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 20px;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.72));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .lp-control-card::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 3px;
        background: linear-gradient(90deg, #14b8a6, #2563eb, #f59e0b);
      }

      .lp-control-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lp-control-card-top span {
        color: #5eead4;
        font-size: 0.72rem;
        font-weight: 860;
        text-transform: uppercase;
      }

      .lp-control-card h3 {
        margin: 24px 0 0;
        color: #f8fafc;
        font-size: 1.08rem;
        line-height: 1.25;
      }

      .lp-control-card p {
        margin: 12px 0 0;
        color: #a8b8cc;
        font-size: 0.92rem;
        line-height: 1.62;
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

      .lp-narrative-section {
        padding-bottom: 84px;
      }

      .lp-narrative-shell {
        max-width: 1060px;
        text-align: center;
      }

      .lp-narrative-shell h2,
      .lp-shift-layout h2 {
        margin: 0;
        color: #f8fafc;
        font-family: var(--font-serif), ui-serif, Georgia, serif;
        font-size: 2.9rem;
        font-weight: 520;
        line-height: 1.04;
        letter-spacing: 0;
      }

      .lp-narrative-shell > p,
      .lp-shift-layout > div > p {
        max-width: 720px;
        margin: 22px auto 0;
        color: #a8b8cc;
        font-size: 1.05rem;
        line-height: 1.72;
      }

      .lp-narrative-lines {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 28px;
        margin-top: 58px;
        text-align: left;
      }

      .lp-narrative-lines div {
        border-top: 1px solid rgba(94, 234, 212, 0.24);
        padding-top: 18px;
      }

      .lp-narrative-lines strong {
        display: block;
        color: #f8fafc;
        font-size: 1.05rem;
        line-height: 1.3;
      }

      .lp-narrative-lines span {
        display: block;
        margin-top: 10px;
        color: #a8b8cc;
        font-size: 0.94rem;
        line-height: 1.65;
      }

      .lp-shift-section {
        padding-top: 84px;
        background:
          linear-gradient(180deg, rgba(2, 6, 23, 0.04), rgba(8, 16, 28, 0.54));
      }

      .lp-shift-layout {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        align-items: start;
        gap: 58px;
      }

      .lp-shift-layout > div > p {
        margin-right: 0;
        margin-left: 0;
      }

      .lp-shift-lines {
        display: grid;
        gap: 0;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }

      .lp-shift-lines div {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 20px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        padding: 22px 0;
      }

      .lp-shift-lines span {
        color: #5eead4;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .lp-shift-lines p {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.98rem;
        line-height: 1.65;
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
        gap: 12px;
        margin-top: 28px;
      }

      .lp-risk-line {
        display: grid;
        gap: 8px;
      }

      .lp-risk-line div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .lp-risk-line span,
      .lp-risk-line strong {
        font-size: 0.78rem;
        line-height: 1.2;
      }

      .lp-risk-line span {
        color: #fecdd3;
      }

      .lp-risk-line strong {
        color: #fef3c7;
        font-weight: 820;
      }

      .lp-risk-line i {
        display: block;
        overflow: hidden;
        height: 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .lp-risk-line b {
        display: block;
        height: 100%;
        border-radius: inherit;
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
          font-size: 4.35rem;
        }
      }

      @media (min-width: 1160px) {
        .lp-hero h1 {
          font-size: 4.9rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .lp-demo-progress span,
        .lp-demo-cursor,
        .lp-demo-feed-row,
        .lp-tour-scene,
        .lp-tour-scene img,
        .lp-tour-hotspot,
        .lp-tour-callout,
        .lp-tour-cursor,
        .lp-tour-cursor::after,
        .lp-tour-chapter {
          animation: none;
        }

        .lp-demo-progress span {
          width: 62%;
        }

        .lp-tour-scene:first-child {
          opacity: 1;
        }

        .lp-tour-scene:not(:first-child),
        .lp-tour-cursor {
          display: none;
        }

        .lp-tour-scene:first-child .lp-tour-hotspot,
        .lp-tour-scene:first-child .lp-tour-callout {
          opacity: 1;
        }

        .lp-tour-chapter {
          opacity: 0.88;
        }

        .lp-tour-chapter:first-child {
          border-color: rgba(94, 234, 212, 0.48);
          background:
            linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(37, 99, 235, 0.14)),
            rgba(15, 23, 42, 0.92);
          box-shadow:
            0 16px 42px rgba(20, 184, 166, 0.14),
            inset 3px 0 0 #5eead4;
          opacity: 1;
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

        .lp-hero-stage {
          grid-template-columns: 1fr;
          gap: 28px;
        }

        .lp-hero-copy {
          max-width: 880px;
        }

        .lp-command-grid,
        .lp-card-grid-three,
        .lp-card-grid-four,
        .lp-control-shell,
        .lp-product-layout,
        .lp-risk-layout,
        .lp-shift-layout,
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

        .lp-demo-screen {
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.52fr);
        }

        .lp-real-demo-grid {
          grid-template-columns: 1fr;
        }

        .lp-real-demo-side {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: auto;
        }

        .lp-tour-layout {
          grid-template-columns: 1fr;
        }

        .lp-tour-director {
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          border-left: 0;
        }

        .lp-tour-chapters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-demo-sidebar {
          grid-column: span 2;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
        }

        .lp-demo-sidebar strong {
          grid-column: span 4;
        }

        .lp-demo-main {
          min-height: 330px;
        }

        .lp-demo-steps {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-tour-script {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-demo-cursor {
          display: none;
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

        .lp-hero-stage-centered .lp-hero-copy {
          text-align: left;
        }

        .lp-hero-stage-centered .lp-hero-copy > p {
          margin-left: 0;
        }

        .lp-hero-stage-centered .lp-hero-actions,
        .lp-hero-stage-centered .lp-signal-row {
          justify-content: flex-start;
        }

        .lp-lead-fields,
        .lp-narrative-lines,
        .lp-control-grid,
        .lp-shift-layout {
          grid-template-columns: 1fr;
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

        .lp-narrative-shell {
          text-align: left;
        }

        .lp-narrative-shell h2,
        .lp-shift-layout h2 {
          font-size: 2.35rem;
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
        .lp-control-shell,
        .lp-control-grid,
        .lp-product-layout,
        .lp-risk-layout,
        .lp-shift-layout,
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

        .lp-demo-section {
          padding: 72px 0;
        }

        .lp-demo-player-top {
          min-height: auto;
          align-items: flex-start;
          padding: 14px;
        }

        .lp-demo-screen,
        .lp-demo-steps {
          grid-template-columns: 1fr;
        }

        .lp-demo-screen {
          min-height: auto;
          gap: 10px;
          padding: 12px;
        }

        .lp-real-demo-grid {
          gap: 10px;
          padding: 12px;
        }

        .lp-real-demo-side,
        .lp-real-demo-steps,
        .lp-tour-script {
          grid-template-columns: 1fr;
        }

        .lp-tour-top {
          align-items: flex-start;
        }

        .lp-tour-status {
          width: 100%;
          justify-content: space-between;
        }

        .lp-tour-stage {
          padding: 40px 10px 10px;
        }

        .lp-tour-scenes {
          aspect-ratio: 4 / 5;
        }

        .lp-tour-route-pill {
          right: 10px;
          left: 10px;
          max-width: none;
          font-size: 0.68rem;
        }

        .lp-tour-scene img {
          object-position: left top;
        }

        .lp-tour-hotspot {
          display: none;
        }

        .lp-tour-callout {
          inset: auto 12px 12px;
          width: auto;
          padding: 13px;
          background:
            linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(8, 13, 27, 0.96)),
            rgba(2, 6, 23, 0.98);
          box-shadow: 0 18px 46px rgba(2, 6, 23, 0.5);
        }

        .lp-tour-callout h3 {
          font-size: 1rem;
        }

        .lp-tour-callout p {
          font-size: 0.8rem;
        }

        .lp-tour-cursor {
          display: none;
        }

        .lp-tour-director {
          padding: 12px;
        }

        .lp-tour-chapters,
        .lp-tour-takeaways {
          grid-template-columns: 1fr;
        }

        .lp-real-demo-main img,
        .lp-real-demo-thumb img {
          aspect-ratio: 4 / 3;
        }

        .lp-real-demo-caption,
        .lp-real-demo-thumb figcaption {
          padding: 14px;
        }

        .lp-demo-sidebar {
          display: none;
        }

        .lp-demo-main {
          min-height: auto;
          padding: 14px;
        }

        .lp-demo-main-head {
          gap: 12px;
        }

        .lp-demo-main-head h3 {
          font-size: 1.12rem;
        }

        .lp-demo-main-head strong {
          font-size: 2.45rem;
        }

        .lp-demo-kpis {
          grid-template-columns: 1fr;
        }

        .lp-demo-kpis div {
          min-height: 76px;
        }

        .lp-demo-phone {
          min-height: 230px;
          padding: 14px;
        }

        .lp-demo-controls {
          padding: 14px 12px 12px;
        }

        .lp-demo-steps article {
          min-height: auto;
        }

        .lp-real-demo-proof {
          min-height: auto;
        }

        .lp-tour-proof {
          margin-top: 10px;
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
        .lp-lead-panel,
        .lp-info-card,
        .lp-module-card,
        .lp-demo-main,
        .lp-demo-phone,
        .lp-demo-steps article,
        .lp-real-demo-caption,
        .lp-real-demo-thumb figcaption,
        .lp-real-demo-proof,
        .lp-price-card,
        .lp-step,
        .lp-risk-board {
          padding: 18px;
        }

        .lp-demo-player-top {
          padding: 12px;
        }

        .lp-demo-screen,
        .lp-demo-controls,
        .lp-tour-stage {
          padding: 10px;
        }

        .lp-tour-stage {
          padding-top: 40px;
        }

        .lp-tour-browser-bar {
          padding: 0 12px;
        }
      }

      /* Clarity OS light theme */
      .c360-landing {
        background:
          radial-gradient(circle at 16% 12%, rgba(45, 212, 191, 0.18), transparent 30%),
          radial-gradient(circle at 86% 6%, rgba(59, 130, 246, 0.14), transparent 28%),
          linear-gradient(180deg, #f7fcfc 0%, #ffffff 42%, #f4faf9 100%);
        color: #0f172a;
      }

      .lp-nav {
        border-bottom-color: rgba(203, 213, 225, 0.78);
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 12px 38px rgba(15, 23, 42, 0.05);
      }

      .lp-brand,
      .lp-nav-links a:hover,
      .lp-link-button:hover,
      .lp-mobile-menu a:hover {
        color: #0f172a;
      }

      .lp-nav-links a,
      .lp-link-button,
      .lp-mobile-menu a {
        color: #475569;
      }

      .lp-menu-button {
        border-color: rgba(203, 213, 225, 0.9);
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      }

      .lp-mobile-menu {
        background: rgba(255, 255, 255, 0.94);
      }

      .lp-button-primary {
        border-color: rgba(20, 184, 166, 0.44);
        background: linear-gradient(135deg, #14b8a6 0%, #2563eb 100%);
        color: #ffffff;
        box-shadow: 0 18px 46px rgba(20, 184, 166, 0.22);
      }

      .lp-button-ghost {
        border-color: rgba(203, 213, 225, 0.95);
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
      }

      .lp-button-ghost:hover {
        border-color: rgba(20, 184, 166, 0.34);
        background: #ecfdf5;
      }

      .lp-hero {
        background:
          repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.035) 0, rgba(15, 23, 42, 0.035) 1px, transparent 1px, transparent 72px),
          repeating-linear-gradient(0deg, rgba(15, 23, 42, 0.028) 0, rgba(15, 23, 42, 0.028) 1px, transparent 1px, transparent 72px),
          linear-gradient(180deg, #f8fdfd 0%, #ffffff 62%, #f4faf9 100%);
      }

      .lp-hero-lines {
        background:
          linear-gradient(120deg, transparent 0%, rgba(45, 212, 191, 0.16) 36%, transparent 38%),
          linear-gradient(60deg, transparent 0%, rgba(59, 130, 246, 0.1) 54%, transparent 56%);
      }

      .lp-eyebrow,
      .lp-lead-kicker {
        border-color: rgba(20, 184, 166, 0.22);
        background: #ecfdf5;
        color: #0f766e;
      }

      .lp-hero h1,
      .lp-section-head h2,
      .lp-final-box h2,
      .lp-shift-layout h2,
      .lp-risk-amount strong,
      .lp-info-card h3,
      .lp-module-card h3,
      .lp-step h3,
      .lp-faq-item button,
      .lp-footer strong {
        color: #0f172a;
      }

      .lp-hero-copy > p,
      .lp-section-head p,
      .lp-info-card p,
      .lp-module-card p,
      .lp-step p,
      .lp-faq-item p,
      .lp-final-box p,
      .lp-footer p,
      .lp-system-list li,
      .lp-proof-item span,
      .lp-command-list li {
        color: #475569;
      }

      .lp-signal-row span {
        color: #475569;
      }

      .lp-hero-metrics div {
        border-color: rgba(203, 213, 225, 0.82);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.78)),
          #ffffff;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
      }

      .lp-hero-metrics strong {
        color: #0f172a;
      }

      .lp-hero-metrics span {
        color: #64748b;
      }

      .lp-lead-panel {
        border-color: rgba(20, 184, 166, 0.22);
        background:
          linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(239, 246, 255, 0.88)),
          #ffffff;
        box-shadow:
          0 24px 72px rgba(15, 23, 42, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .lp-lead-panel h2 {
        color: #0f172a;
      }

      .lp-lead-panel p,
      .lp-lead-trust {
        color: #64748b;
      }

      .lp-field span {
        color: #334155;
      }

      .lp-field input,
      .lp-field select {
        border-color: rgba(203, 213, 225, 0.95);
        background: #ffffff;
        color: #0f172a;
      }

      .c360-landing .lp-field input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
      .c360-landing .lp-field select {
        border-color: rgba(203, 213, 225, 0.95);
        background: #ffffff !important;
        background-color: #ffffff !important;
        color-scheme: light;
        color: #0f172a;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
      }

      .c360-landing .lp-field input::placeholder {
        color: #94a3b8;
      }

      .lp-field option {
        background: #ffffff;
        color: #0f172a;
      }

      .lp-command {
        border-color: rgba(203, 213, 225, 0.92);
        background: #ffffff;
        box-shadow:
          0 30px 100px rgba(15, 23, 42, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      .lp-command::before {
        background:
          repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.035) 0, rgba(15, 23, 42, 0.035) 1px, transparent 1px, transparent 46px),
          repeating-linear-gradient(0deg, rgba(15, 23, 42, 0.028) 0, rgba(15, 23, 42, 0.028) 1px, transparent 1px, transparent 46px);
      }

      .lp-command-topbar {
        border-bottom-color: rgba(203, 213, 225, 0.78);
      }

      .lp-command-title {
        color: #334155;
      }

      .lp-command-panel,
      .lp-info-card,
      .lp-module-card,
      .lp-step,
      .lp-risk-board,
      .lp-final-box {
        border-color: rgba(203, 213, 225, 0.9);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
          #ffffff;
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
      }

      .lp-command-panel strong,
      .lp-command-panel h3,
      .lp-command-panel h4,
      .lp-command-panel p,
      .lp-action-row strong,
      .lp-action-row span,
      .lp-ai-message strong,
      .lp-ai-message span {
        color: #0f172a;
      }

      .lp-command-panel p,
      .lp-command-panel small,
      .lp-command-metric span,
      .lp-action-row span,
      .lp-ai-message span {
        color: #64748b;
      }

      .lp-action-item,
      .lp-document-stack span {
        background: #f8fafc;
      }

      .lp-action-item strong,
      .lp-site-row strong,
      .lp-document-stack span {
        color: #0f172a;
      }

      .lp-action-item small,
      .lp-site-row small,
      .lp-score-meta span {
        color: #64748b;
      }

      .lp-score-meta {
        border-top-color: rgba(203, 213, 225, 0.78);
      }

      .lp-score-meta strong,
      .lp-ai-status {
        color: #0f766e;
      }

      .lp-site-panel {
        background:
          linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(255, 255, 255, 0.94)),
          #ffffff;
      }

      .lp-site-row > span {
        background: #e2e8f0;
      }

      .lp-score-ring {
        background:
          radial-gradient(circle, #ffffff 52%, transparent 53%),
          conic-gradient(#14b8a6 0 88%, #e2e8f0 88% 100%);
        color: #0f172a;
      }

      .lp-narrative-section,
      .lp-product-section,
      .lp-sector-section,
      .lp-pricing-section {
        background:
          linear-gradient(180deg, rgba(236, 253, 245, 0.46), rgba(255, 255, 255, 0));
      }

      .lp-shift-section,
      .lp-risk-section {
        background:
          linear-gradient(180deg, rgba(239, 246, 255, 0.62), rgba(255, 255, 255, 0));
      }

      .lp-proof {
        border-color: rgba(203, 213, 225, 0.72);
        background: rgba(255, 255, 255, 0.76);
      }

      .lp-proof-item {
        border-right-color: rgba(203, 213, 225, 0.68);
      }

      .lp-proof-item strong {
        color: #0f172a;
      }

      .lp-info-card-danger {
        border-color: rgba(251, 146, 60, 0.38);
        background:
          linear-gradient(180deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.96)),
          #ffffff;
      }

      .lp-risk-line span {
        color: #9f1239;
      }

      .lp-risk-line strong {
        color: #92400e;
      }

      .lp-risk-line i {
        background: rgba(251, 207, 232, 0.52);
      }

      .lp-control-section {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(236, 253, 245, 0.62) 44%, rgba(255, 255, 255, 0));
      }

      .lp-control-copy h2 {
        color: #0f172a;
      }

      .lp-control-copy p,
      .lp-narrative-shell > p,
      .lp-shift-layout > div > p,
      .lp-shift-lines p {
        color: #334155;
      }

      .lp-control-card {
        border-color: rgba(203, 213, 225, 0.86);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92)),
          #ffffff;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
      }

      .lp-control-card h3,
      .lp-narrative-lines strong {
        color: #0f172a;
      }

      .lp-control-card p,
      .lp-narrative-lines span {
        color: #334155;
      }

      .lp-panel-label,
      .lp-section-head > span,
      .lp-module-top span,
      .lp-step small,
      .lp-control-card-top span,
      .lp-risk-header span {
        color: #0f766e;
        font-weight: 900;
      }

      .lp-live-pill,
      .lp-ai-status,
      .lp-score-meta strong {
        color: #0f766e;
        font-weight: 850;
      }

      .lp-hero-copy > p,
      .lp-section-head p,
      .lp-info-card p,
      .lp-module-card p,
      .lp-step p,
      .lp-faq-item p,
      .lp-final-box p,
      .lp-footer p,
      .lp-proof-item span,
      .lp-hero-metrics span,
      .lp-command-panel p,
      .lp-command-panel small,
      .lp-action-item small,
      .lp-site-row small,
      .lp-lead-panel p,
      .lp-lead-trust {
        color: #334155;
      }

      .lp-field span,
      .lp-price-head > span,
      .lp-footer a,
      .lp-footer span {
        color: #334155;
      }

      .lp-info-card,
      .lp-module-card,
      .lp-step {
        box-shadow:
          0 22px 64px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.92);
      }

      .lp-risk-board::before,
      .lp-final-box::before,
      .lp-info-card::before,
      .lp-module-card::before,
      .lp-step::before {
        background: linear-gradient(90deg, #14b8a6, #2563eb, #f59e0b);
      }

      .lp-faq-list,
      .lp-faq-item {
        border-color: rgba(203, 213, 225, 0.78);
      }

      .lp-final-cta {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(236, 253, 245, 0.68));
      }

      .lp-final-box {
        background:
          repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.035) 0, rgba(15, 23, 42, 0.035) 1px, transparent 1px, transparent 56px),
          linear-gradient(135deg, rgba(236, 253, 245, 0.92), rgba(239, 246, 255, 0.82));
      }

      .lp-footer {
        border-top-color: rgba(203, 213, 225, 0.78);
        background: rgba(255, 255, 255, 0.72);
      }

      .lp-footer a,
      .lp-footer span {
        color: #64748b;
      }

      .lp-footer a:hover {
        color: #0f766e;
      }
    `}</style>
  )
}
