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
  PlayCircle,
  Radar,
  Scale,
  ShieldCheck,
  Siren,
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

// `tone` solo define el color del chip de nivel; el nivel siempre va escrito.
const riskBreakdown = [
  { label: 'Capacitaciones SST', value: 'Crítico', tone: 'high', width: '88%' },
  { label: 'Contratos por vencer', value: 'Medio', tone: 'mid', width: '64%' },
  { label: 'Boletas sin cargo', value: 'Bajo', tone: 'low', width: '42%' },
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
            <div className="lp-eyebrow">Command center laboral para empresas peruanas</div>
            <h1>
              Convierte el caos laboral en evidencia lista para{' '}
              <span className="lp-hl">SUNAFIL.</span>
            </h1>
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
          <div className="lp-eyebrow">Control operativo</div>
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
              <div key={risk.label} className={`lp-risk-line lp-risk-${risk.tone}`}>
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
          <div className="lp-eyebrow">Primer paso</div>
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
      {/* Colores sólidos (antes degradados que el navegador ya pintaba como su
          primer color): mismo isotipo, sin IDs duplicados entre header y footer. */}
      <svg viewBox="0 0 64 64" focusable="false">
        <rect x="5" y="5" width="54" height="54" rx="15" fill="#1e3a6e" />
        <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" fill="#eff6ff" fillOpacity="0.96" />
        <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" fill="none" stroke="#eff6ff" strokeOpacity="0.5" strokeWidth="0.9" />
        <path d="M23.5 32.2 29.6 38.1 41.2 25.3" fill="none" stroke="#06111f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function LandingStyles() {
  return (
    <style jsx global>{`
      /* ════════════════════════════════════════════════════════════════════
         Comply360 · Landing — identidad azul marino + ámbar
         Header, hero, banda final y footer en navy; cuerpo claro con tarjetas
         blancas. Todo en sans-serif (Plus Jakarta Sans), sin serif ni itálicas.
         Contrastes verificados (WCAG AA): ver informe del cambio.
         ════════════════════════════════════════════════════════════════════ */

      main.c360-landing {
        --lp-font: var(--font-jakarta), var(--font-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        --lp-navy: #0b1b36;
        --lp-navy-2: #0f2547;
        --lp-navy-deep: #081428;
        --lp-amber: #f5b301;
        --lp-amber-hover: #e0a100;
        --lp-amber-ink: #b45309;
        --lp-amber-ink-strong: #92400e;
        --lp-amber-soft: #fff7e0;
        --lp-blue: #2563eb;
        --lp-blue-ink: #1d4ed8;
        --lp-blue-soft: #eff4ff;
        --lp-ink: #0b1b36;
        --lp-body: #475569;
        --lp-strong-body: #334155;
        --lp-line: #e5eaf2;
        --lp-line-strong: #d5ddea;
        --lp-soft: #f5f7fb;
        --lp-on-navy: #ffffff;
        --lp-on-navy-2: #cbd5e1;
        --lp-shadow: 0 1px 2px rgba(11, 27, 54, 0.04), 0 8px 24px rgba(11, 27, 54, 0.06);
        --lp-shadow-hover: 0 2px 4px rgba(11, 27, 54, 0.05), 0 18px 40px rgba(11, 27, 54, 0.1);
        min-height: 100vh;
        overflow-x: clip;
        background: #ffffff;
        color: var(--lp-ink);
        font-family: var(--lp-font);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .c360-landing *,
      .c360-landing *::before,
      .c360-landing *::after {
        box-sizing: border-box;
      }

      .c360-landing h1,
      .c360-landing h2,
      .c360-landing h3 {
        font-family: var(--lp-font);
        font-style: normal;
        letter-spacing: -0.02em;
      }

      /* El header es sticky: que los anclas (#demo, #precios…) no queden debajo. */
      .c360-landing [id] {
        scroll-margin-top: 84px;
      }

      /* Foco visible: azul sobre fondos claros, ámbar sobre navy. */
      .c360-landing a:focus-visible,
      .c360-landing button:focus-visible,
      .c360-landing input:focus-visible,
      .c360-landing select:focus-visible {
        outline: 3px solid var(--lp-blue);
        outline-offset: 3px;
      }

      .lp-nav a:focus-visible,
      .lp-nav button:focus-visible,
      .lp-hero-copy a:focus-visible,
      .lp-demo-player a:focus-visible,
      .lp-final-cta a:focus-visible,
      .lp-footer a:focus-visible {
        outline-color: var(--lp-amber);
      }

      .lp-shell {
        width: min(1180px, calc(100% - 40px));
        margin: 0 auto;
      }

      /* ───────────── Header ───────────── */

      .lp-nav {
        position: sticky;
        top: 0;
        z-index: 50;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: var(--lp-navy);
      }

      .lp-nav-inner {
        display: flex;
        min-height: 72px;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .lp-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border-radius: 6px;
        color: var(--lp-on-navy);
        font-size: 1.06rem;
        font-weight: 800;
        letter-spacing: -0.01em;
        text-decoration: none;
      }

      .lp-brand span span {
        color: var(--lp-amber);
      }

      .lp-brand-mark {
        display: inline-grid;
        width: 30px;
        height: 30px;
        flex: none;
        place-items: center;
      }

      .lp-brand-mark svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .lp-nav-links {
        display: flex;
        align-items: center;
        gap: 28px;
      }

      .lp-nav-actions {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .lp-nav-links a {
        position: relative;
        padding: 6px 0;
        color: var(--lp-on-navy);
        font-size: 0.92rem;
        font-weight: 600;
        text-decoration: none;
      }

      .lp-nav-links a::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 2px;
        border-radius: 999px;
        background: var(--lp-amber);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 180ms ease;
      }

      .lp-nav-links a:hover::after {
        transform: scaleX(1);
      }

      .lp-link-button {
        color: var(--lp-on-navy);
        font-size: 0.92rem;
        font-weight: 600;
        text-decoration: none;
        transition: color 160ms ease;
      }

      .lp-link-button:hover {
        color: var(--lp-amber);
      }

      .lp-menu-button {
        display: none;
        width: 44px;
        height: 44px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 10px;
        background: transparent;
        color: var(--lp-on-navy);
        cursor: pointer;
      }

      .lp-mobile-menu {
        display: none;
      }

      /* ───────────── Botones ───────────── */

      .lp-button {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1.5px solid transparent;
        border-radius: 10px;
        padding: 0 18px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease;
      }

      .lp-button:hover {
        transform: translateY(-1px);
      }

      /* Principal: ámbar con texto navy (9,3:1). Nunca texto blanco sobre ámbar. */
      .lp-button-primary {
        border-color: var(--lp-amber);
        background: var(--lp-amber);
        color: var(--lp-navy);
        box-shadow: 0 10px 24px rgba(245, 179, 1, 0.22);
      }

      .lp-button-primary:hover {
        border-color: var(--lp-amber-hover);
        background: var(--lp-amber-hover);
        color: var(--lp-navy);
        box-shadow: 0 14px 30px rgba(224, 161, 0, 0.28);
      }

      /* Secundario sobre fondo claro: borde navy. */
      .lp-button-ghost {
        border-color: var(--lp-navy);
        background: #ffffff;
        color: var(--lp-navy);
      }

      .lp-button-ghost:hover {
        background: var(--lp-navy);
        color: var(--lp-on-navy);
      }

      /* Secundario sobre navy: borde blanco, hover ámbar. */
      .lp-hero-copy .lp-button-ghost,
      .lp-final-cta .lp-button-ghost {
        border-color: rgba(255, 255, 255, 0.72);
        background: transparent;
        color: var(--lp-on-navy);
      }

      .lp-hero-copy .lp-button-ghost:hover,
      .lp-final-cta .lp-button-ghost:hover {
        border-color: var(--lp-amber);
        background: rgba(245, 179, 1, 0.08);
        color: var(--lp-amber);
      }

      .lp-button-large {
        min-height: 52px;
        padding: 0 22px;
        font-size: 0.98rem;
      }

      /* ───────────── Etiquetas (mayúsculas + rayita ámbar) ───────────── */

      .lp-eyebrow,
      .lp-section-head > span {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        color: var(--lp-blue);
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        line-height: 1.35;
        text-transform: uppercase;
      }

      .lp-eyebrow::after,
      .lp-section-head > span::after {
        content: "";
        display: block;
        width: 44px;
        height: 3px;
        border-radius: 999px;
        background: var(--lp-amber);
      }

      /* ───────────── Hero ───────────── */

      .lp-hero {
        --lp-hero-tail: 190px;
        position: relative;
        padding: 84px 0 56px;
        color: var(--lp-on-navy);
        background:
          linear-gradient(180deg, transparent calc(100% - var(--lp-hero-tail)), var(--lp-soft) calc(100% - var(--lp-hero-tail))),
          radial-gradient(circle at 88% 0%, rgba(245, 179, 1, 0.12), transparent 36%),
          radial-gradient(circle at 0% 72%, rgba(37, 99, 235, 0.2), transparent 42%),
          linear-gradient(160deg, var(--lp-navy) 0%, var(--lp-navy-2) 100%);
      }

      .lp-hero-lines {
        position: absolute;
        inset: 0 0 var(--lp-hero-tail);
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
        background-size: 64px 64px;
        -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 80%);
        mask-image: linear-gradient(180deg, #000 0%, transparent 80%);
      }

      .lp-hero-content {
        position: relative;
      }

      .lp-hero-stage {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 420px;
        align-items: center;
        gap: 48px;
      }

      .lp-hero-copy {
        max-width: 700px;
        margin: 0;
        text-align: left;
      }

      .lp-hero .lp-eyebrow {
        color: var(--lp-on-navy-2);
      }

      .lp-hero h1 {
        margin: 22px 0 0;
        color: var(--lp-on-navy);
        font-size: clamp(2.35rem, 5.2vw, 4.2rem);
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: -0.02em;
        text-wrap: balance;
      }

      .lp-hl {
        color: var(--lp-amber);
      }

      .lp-hero-copy > p {
        max-width: 620px;
        margin: 22px 0 0;
        color: var(--lp-on-navy-2);
        font-size: 1.1rem;
        line-height: 1.65;
        text-wrap: pretty;
      }

      .lp-hero-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 12px;
        margin-top: 32px;
      }

      /* Fila de garantías: check ámbar dentro de un círculo. */
      .lp-signal-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 22px;
        margin-top: 26px;
      }

      .lp-signal-row span {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: var(--lp-on-navy);
        font-size: 0.88rem;
        font-weight: 600;
      }

      .lp-signal-row svg {
        flex: none;
        width: 22px;
        height: 22px;
        padding: 4px;
        border-radius: 999px;
        background: rgba(245, 179, 1, 0.14);
        box-shadow: inset 0 0 0 1.5px var(--lp-amber);
        color: var(--lp-amber);
        stroke-width: 3;
      }

      .lp-hero-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        max-width: 640px;
        margin-top: 32px;
      }

      .lp-hero-metrics div {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.06);
        transition: border-color 160ms ease, transform 160ms ease;
      }

      .lp-hero-metrics div:hover {
        border-color: rgba(245, 179, 1, 0.5);
        transform: translateY(-2px);
      }

      .lp-hero-metrics strong,
      .lp-hero-metrics span {
        display: block;
      }

      .lp-hero-metrics strong {
        color: var(--lp-on-navy);
        font-size: 1.85rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .lp-hero-metrics span {
        margin-top: 8px;
        color: var(--lp-on-navy-2);
        font-size: 0.8rem;
        line-height: 1.4;
      }

      /* Formulario de diagnóstico: tarjeta blanca sobre el navy. */
      .lp-lead-panel {
        position: relative;
        overflow: hidden;
        width: 100%;
        margin: 0;
        padding: 28px;
        border: 1px solid var(--lp-line);
        border-radius: 16px;
        background: #ffffff;
        color: var(--lp-ink);
        box-shadow: 0 30px 70px rgba(3, 10, 26, 0.4);
      }

      .lp-lead-panel::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 4px;
        background: var(--lp-amber);
      }

      .lp-lead-kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        padding: 6px 11px;
        background: var(--lp-amber-soft);
        color: var(--lp-amber-ink-strong);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .lp-lead-kicker svg {
        flex: none;
        color: var(--lp-amber-ink);
      }

      .lp-lead-panel h2 {
        margin: 16px 0 0;
        color: var(--lp-ink);
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1.15;
        text-wrap: balance;
      }

      .lp-lead-panel p {
        margin: 10px 0 0;
        color: var(--lp-body);
        font-size: 0.93rem;
        line-height: 1.6;
      }

      /* Sector lleva textos más largos ("Logística / servicios") que Trabajadores. */
      .lp-lead-fields {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        gap: 14px;
        margin-top: 20px;
      }

      .lp-field {
        display: grid;
        gap: 6px;
      }

      .lp-field-wide {
        grid-column: 1 / -1;
      }

      .lp-field span {
        color: var(--lp-strong-body);
        font-size: 0.8rem;
        font-weight: 700;
      }

      .lp-field input,
      .lp-field select {
        width: 100%;
        min-height: 46px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background-color: #ffffff;
        color: var(--lp-ink);
        color-scheme: light;
        font: inherit;
        font-size: 0.92rem;
        padding: 0 12px;
        box-shadow: none;
        transition: border-color 160ms ease, box-shadow 160ms ease;
      }

      .lp-field select {
        padding-right: 34px;
        text-overflow: ellipsis;
      }

      .lp-field input::placeholder {
        color: #64748b;
        opacity: 1;
      }

      .lp-field input:hover,
      .lp-field select:hover {
        border-color: #94a3b8;
      }

      .lp-field input:focus,
      .lp-field select:focus {
        border-color: var(--lp-blue);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      }

      .lp-field input:focus-visible,
      .lp-field select:focus-visible {
        outline: 2px solid transparent;
      }

      .lp-field option {
        background: #ffffff;
        color: var(--lp-ink);
      }

      .lp-lead-panel .lp-button {
        width: 100%;
        margin-top: 18px;
      }

      .lp-lead-trust {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 12px;
        color: var(--lp-body);
        font-size: 0.8rem;
        line-height: 1.45;
      }

      .lp-lead-trust svg {
        flex: none;
        margin-top: 2px;
        color: #15803d;
      }

      /* Vista del producto: ventana clara que cruza del navy al cuerpo claro. */
      .lp-command {
        position: relative;
        width: min(1080px, 100%);
        margin: 56px auto 0;
        overflow: hidden;
        border: 1px solid var(--lp-line);
        border-radius: 16px;
        background: var(--lp-soft);
        color: var(--lp-ink);
        box-shadow:
          0 40px 90px rgba(3, 10, 26, 0.32),
          0 2px 6px rgba(3, 10, 26, 0.1);
      }

      .lp-command-topbar {
        display: flex;
        min-height: 50px;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 18px;
        border-bottom: 1px solid var(--lp-line);
        background: #ffffff;
      }

      .lp-window-dots {
        display: flex;
        gap: 6px;
      }

      .lp-window-dots span {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #fb7185;
      }

      .lp-window-dots span:nth-child(2) {
        background: var(--lp-amber);
      }

      .lp-window-dots span:nth-child(3) {
        background: #22c55e;
      }

      .lp-command-title {
        color: var(--lp-ink);
        font-size: 0.86rem;
        font-weight: 700;
      }

      .lp-live-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        padding: 5px 10px;
        background: #dcfce7;
        color: #166534;
        font-size: 0.76rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .lp-live-pill span {
        width: 7px;
        height: 7px;
        flex: none;
        border-radius: 999px;
        background: #16a34a;
      }

      .lp-command-grid {
        display: grid;
        grid-template-columns: 0.85fr 1.35fr 1fr 0.95fr;
        gap: 14px;
        padding: 16px;
      }

      .lp-command-panel {
        min-width: 0;
        min-height: 142px;
        padding: 16px;
        border: 1px solid var(--lp-line);
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(11, 27, 54, 0.04);
      }

      .lp-panel-label {
        color: var(--lp-blue);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.1em;
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
        margin: 8px auto;
      }

      .lp-score-ring svg {
        width: 98px;
        height: 98px;
        transform: rotate(-90deg);
      }

      .lp-score-ring circle {
        fill: none;
        stroke: var(--lp-line);
        stroke-width: 10;
      }

      .lp-score-ring circle:nth-child(2) {
        stroke: var(--lp-blue);
        stroke-dasharray: 88 100;
        stroke-linecap: round;
      }

      .lp-score-ring div {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        color: var(--lp-ink);
      }

      .lp-score-ring strong {
        display: block;
        font-size: 2.2rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 0.95;
        font-variant-numeric: tabular-nums;
      }

      .lp-score-ring span {
        color: var(--lp-body);
        font-size: 0.78rem;
        font-weight: 600;
      }

      .lp-score-panel p,
      .lp-ai-panel p {
        margin: 0;
        color: var(--lp-body);
        font-size: 0.82rem;
        line-height: 1.5;
      }

      .lp-score-meta {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--lp-line);
        text-align: left;
      }

      .lp-score-meta span {
        color: var(--lp-body);
        font-size: 0.72rem;
        font-weight: 700;
      }

      .lp-score-meta strong {
        color: var(--lp-blue-ink);
        font-size: 0.9rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .lp-panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .lp-panel-header svg {
        flex: none;
        color: var(--lp-blue);
      }

      .lp-panel-header h3,
      .lp-inspection-panel h3 {
        margin: 4px 0 0;
        color: var(--lp-ink);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .lp-action-list {
        display: grid;
        gap: 8px;
      }

      .lp-action-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px;
        border: 1px solid #eef2f7;
        border-radius: 10px;
        background: var(--lp-soft);
      }

      .lp-action-item > span {
        width: 8px;
        height: 8px;
        margin-top: 5px;
        flex: none;
        border-radius: 999px;
      }

      .lp-action-critical > span {
        background: #dc2626;
      }

      .lp-action-warning > span {
        background: var(--lp-amber);
      }

      .lp-action-ok > span {
        background: #16a34a;
      }

      .lp-action-item strong,
      .lp-action-item small {
        display: block;
      }

      .lp-action-item strong {
        color: var(--lp-ink);
        font-size: 0.84rem;
        font-weight: 700;
      }

      .lp-action-item small {
        margin-top: 3px;
        color: var(--lp-body);
        font-size: 0.75rem;
      }

      .lp-site-list {
        display: grid;
        gap: 12px;
      }

      .lp-site-row {
        display: grid;
        gap: 7px;
      }

      .lp-site-row strong,
      .lp-site-row small {
        display: block;
      }

      .lp-site-row strong {
        color: var(--lp-ink);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .lp-site-row small {
        margin-top: 2px;
        color: var(--lp-body);
        font-size: 0.74rem;
      }

      .lp-site-row > span {
        display: block;
        overflow: hidden;
        height: 8px;
        border-radius: 999px;
        background: var(--lp-line);
      }

      .lp-site-row i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--lp-blue);
      }

      .lp-inspection-panel {
        border-color: #f6e3a8;
        background: var(--lp-amber-soft);
      }

      .lp-inspection-panel .lp-panel-label {
        color: var(--lp-amber-ink-strong);
      }

      .lp-inspection-panel h3 {
        margin-top: 8px;
        font-size: 1.35rem;
        font-weight: 800;
      }

      .lp-document-stack {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .lp-document-stack span {
        display: block;
        border: 1px solid #f1e2b5;
        border-radius: 8px;
        padding: 8px 10px;
        background: #ffffff;
        color: var(--lp-strong-body);
        font-size: 0.78rem;
        font-weight: 600;
      }

      .lp-ai-panel {
        grid-column: span 4;
        display: flex;
        min-height: auto;
        align-items: center;
        gap: 14px;
        border-color: #dbe6ff;
        background: var(--lp-blue-soft);
      }

      .lp-ai-panel .lp-panel-label {
        color: var(--lp-blue-ink);
      }

      .lp-ai-panel p {
        margin-top: 4px;
        color: var(--lp-strong-body);
      }

      .lp-ai-avatar {
        display: grid;
        width: 40px;
        height: 40px;
        flex: none;
        place-items: center;
        border-radius: 10px;
        background: #ffffff;
        color: var(--lp-blue);
        box-shadow: 0 1px 2px rgba(11, 27, 54, 0.06);
      }

      .lp-ai-status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-left: auto;
        color: #166534;
        font-size: 0.76rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .lp-ai-status span {
        width: 7px;
        height: 7px;
        flex: none;
        border-radius: 999px;
        background: #16a34a;
      }

      /* ───────────── Demo guiada (reproductor navy) ───────────── */

      @keyframes lp-demo-progress {
        from {
          width: 8%;
        }
        to {
          width: 100%;
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
          border-color: rgba(245, 179, 1, 0.55);
          background: rgba(245, 179, 1, 0.08);
          box-shadow: inset 3px 0 0 var(--lp-amber);
          opacity: 1;
        }
        26%, 100% {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.14);
          opacity: 0.8;
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
          opacity: 0.6;
          transform: scale(1.15);
        }
        100% {
          opacity: 0;
          transform: scale(2.2);
        }
      }

      .lp-demo-section {
        padding: 88px 0 96px;
        background: var(--lp-soft);
      }

      .lp-demo-player {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--lp-navy);
        border-radius: 16px;
        background: var(--lp-navy);
        color: var(--lp-on-navy);
        box-shadow: 0 34px 80px rgba(11, 27, 54, 0.22);
      }

      .lp-demo-player-top {
        display: flex;
        min-height: 58px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px 14px;
        padding: 10px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .lp-demo-playing {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: var(--lp-on-navy);
        font-weight: 700;
      }

      .lp-demo-playing svg {
        flex: none;
        color: var(--lp-amber);
      }

      .lp-tour-status {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        color: var(--lp-on-navy-2);
        font-size: 0.82rem;
        font-weight: 600;
      }

      .lp-tour-status span {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .lp-tour-status i {
        width: 8px;
        height: 8px;
        flex: none;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.16);
      }

      .lp-tour-status strong {
        color: var(--lp-on-navy);
        font-size: 0.82rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .lp-tour-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 330px;
        background: var(--lp-navy);
      }

      .lp-tour-stage {
        position: relative;
        min-width: 0;
        overflow: hidden;
        padding: 52px 20px 20px;
        background: linear-gradient(160deg, var(--lp-navy-2) 0%, var(--lp-navy) 100%);
      }

      .lp-tour-browser-bar {
        position: absolute;
        inset: 0 0 auto;
        display: flex;
        height: 42px;
        align-items: center;
        gap: 8px;
        padding: 0 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(8, 20, 40, 0.6);
      }

      .lp-tour-browser-bar span {
        width: 9px;
        height: 9px;
        flex: none;
        border-radius: 999px;
        background: #fb7185;
      }

      .lp-tour-browser-bar span:nth-child(2) {
        background: var(--lp-amber);
      }

      .lp-tour-browser-bar span:nth-child(3) {
        background: #22c55e;
      }

      .lp-tour-browser-bar strong {
        margin-left: 8px;
        overflow: hidden;
        color: var(--lp-on-navy-2);
        font-size: 0.78rem;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lp-tour-scenes {
        position: relative;
        overflow: hidden;
        aspect-ratio: 16 / 10;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: var(--lp-navy-deep);
        box-shadow: 0 24px 60px rgba(3, 10, 26, 0.45);
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
      }

      .lp-tour-route-pill {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 3;
        max-width: calc(100% - 24px);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        padding: 7px 11px;
        background: rgba(11, 27, 54, 0.9);
        color: var(--lp-on-navy);
        box-shadow: 0 12px 30px rgba(3, 10, 26, 0.32);
        font-size: 0.72rem;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lp-tour-vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at var(--hotspot-left) var(--hotspot-top), transparent 0, transparent 16%, rgba(8, 20, 40, 0.12) 44%, rgba(8, 20, 40, 0.48) 100%),
          linear-gradient(180deg, rgba(8, 20, 40, 0), rgba(8, 20, 40, 0.26));
      }

      .lp-tour-hotspot {
        position: absolute;
        left: var(--hotspot-left);
        top: var(--hotspot-top);
        width: var(--hotspot-width);
        height: var(--hotspot-height);
        border: 2px solid var(--lp-amber);
        border-radius: 10px;
        background: rgba(245, 179, 1, 0.08);
        box-shadow:
          0 0 0 999px rgba(8, 20, 40, 0.2),
          0 0 0 6px rgba(245, 179, 1, 0.18);
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
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 12px;
        padding: 16px;
        background: rgba(11, 27, 54, 0.96);
        color: var(--lp-on-navy);
        box-shadow: 0 18px 50px rgba(3, 10, 26, 0.45);
        opacity: 0;
        animation: lp-tour-callout 28s ease-in-out infinite;
        animation-delay: var(--tour-delay);
      }

      .lp-tour-callout span {
        display: block;
        color: var(--lp-amber);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-variant-numeric: tabular-nums;
      }

      .lp-tour-callout h3 {
        margin: 8px 0 0;
        color: var(--lp-on-navy);
        font-size: 1.1rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .lp-tour-callout p {
        margin: 8px 0 0;
        color: var(--lp-on-navy-2);
        font-size: 0.86rem;
        line-height: 1.5;
      }

      .lp-tour-callout small {
        display: inline-flex;
        margin-top: 12px;
        border-radius: 999px;
        padding: 7px 11px;
        background: var(--lp-amber);
        color: var(--lp-navy);
        font-size: 0.74rem;
        font-weight: 800;
      }

      .lp-tour-cursor {
        position: absolute;
        z-index: 5;
        width: 30px;
        height: 32px;
        filter: drop-shadow(0 12px 18px rgba(3, 10, 26, 0.48));
        animation: lp-tour-cursor 28s ease-in-out infinite;
      }

      .lp-tour-cursor::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 24px;
        height: 30px;
        background: #ffffff;
        clip-path: polygon(0 0, 0 24px, 7px 18px, 12px 30px, 17px 28px, 12px 16px, 22px 16px);
      }

      .lp-tour-cursor::after {
        content: "";
        position: absolute;
        left: -5px;
        top: -3px;
        width: 24px;
        height: 24px;
        border: 2px solid var(--lp-amber);
        border-radius: 999px;
        opacity: 0;
        animation: lp-tour-click 7s ease-out infinite;
      }

      .lp-tour-director {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 14px;
        padding: 20px;
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        background: var(--lp-navy);
      }

      .lp-tour-director-head {
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.04);
      }

      .lp-tour-director-head span {
        color: var(--lp-amber);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .lp-tour-director-head strong {
        display: block;
        margin-top: 7px;
        color: var(--lp-on-navy);
        font-size: 1.02rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .lp-tour-director-head p {
        margin: 8px 0 0;
        color: var(--lp-on-navy-2);
        font-size: 0.82rem;
        line-height: 1.5;
      }

      .lp-tour-chapters {
        display: grid;
        gap: 9px;
      }

      .lp-tour-chapter {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.14);
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
        color: var(--lp-amber);
        font-size: 0.72rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .lp-tour-chapter strong {
        color: var(--lp-on-navy);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-align: right;
        text-transform: uppercase;
      }

      .lp-tour-chapter p {
        margin: 9px 0 0;
        color: var(--lp-on-navy-2);
        font-size: 0.8rem;
        line-height: 1.48;
      }

      .lp-tour-chapter small {
        display: inline-flex;
        margin-top: 10px;
        border-radius: 999px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.1);
        color: var(--lp-on-navy);
        font-size: 0.7rem;
        font-weight: 700;
      }

      .lp-demo-controls {
        padding: 18px 20px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .lp-demo-progress {
        overflow: hidden;
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
      }

      .lp-demo-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--lp-blue), #60a5fa);
        animation: lp-demo-progress 28s linear infinite;
      }

      .lp-tour-takeaways {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .lp-tour-takeaways div {
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.04);
      }

      .lp-tour-takeaways span,
      .lp-tour-takeaways strong {
        display: block;
      }

      .lp-tour-takeaways span {
        color: var(--lp-amber);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .lp-tour-takeaways strong {
        margin-top: 8px;
        color: var(--lp-on-navy);
        font-size: 0.98rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .lp-real-demo-proof {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border: 1px solid rgba(245, 179, 1, 0.3);
        border-radius: 12px;
        padding: 14px;
        background: rgba(245, 179, 1, 0.06);
        color: var(--lp-on-navy-2);
        font-size: 0.88rem;
        font-weight: 600;
        line-height: 1.5;
      }

      .lp-real-demo-proof svg {
        flex: none;
        margin-top: 1px;
        color: var(--lp-amber);
      }

      .lp-tour-proof {
        margin-top: 12px;
      }

      /* ───────────── Cifras (proof rail) ───────────── */

      .lp-proof {
        border-bottom: 1px solid var(--lp-line);
        background: #ffffff;
      }

      .lp-proof-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .lp-proof-item {
        min-width: 0;
        padding: 32px 28px;
        border-right: 1px solid var(--lp-line);
      }

      .lp-proof-item:last-child {
        border-right: none;
      }

      .lp-proof-item::before {
        content: "";
        display: block;
        width: 28px;
        height: 3px;
        margin-bottom: 16px;
        border-radius: 999px;
        background: var(--lp-amber);
      }

      .lp-proof-item strong {
        display: block;
        color: var(--lp-ink);
        font-size: 2.1rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .lp-proof-item span {
        display: block;
        margin-top: 10px;
        color: var(--lp-body);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      /* ───────────── Secciones del cuerpo (claro) ───────────── */

      .lp-section {
        padding: 104px 0;
        background: #ffffff;
      }

      .lp-control-section,
      .lp-shift-section,
      .lp-risk-section,
      .lp-sector-section,
      .lp-pricing-section {
        background: var(--lp-soft);
      }

      .lp-section-head {
        max-width: 780px;
        margin: 0 auto 48px;
        text-align: center;
      }

      .lp-section-head > span {
        align-items: center;
      }

      .lp-section-head-left {
        max-width: 620px;
        margin-right: 0;
        margin-left: 0;
        text-align: left;
      }

      .lp-section-head-left > span {
        align-items: flex-start;
      }

      .lp-section-head h2,
      .lp-control-copy h2,
      .lp-narrative-shell h2,
      .lp-shift-layout h2,
      .lp-final-box h2 {
        margin: 18px 0 0;
        color: var(--lp-ink);
        font-size: clamp(1.9rem, 3.4vw, 2.75rem);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
        text-wrap: balance;
      }

      .lp-narrative-shell h2,
      .lp-shift-layout h2 {
        margin-top: 0;
      }

      .lp-section-head p {
        max-width: 680px;
        margin: 18px auto 0;
        color: var(--lp-body);
        font-size: 1.05rem;
        line-height: 1.65;
        text-wrap: pretty;
      }

      .lp-section-head-left p {
        margin-left: 0;
      }

      /* Tarjetas blancas con borde suave */
      .lp-control-card,
      .lp-info-card,
      .lp-module-card,
      .lp-system-node,
      .lp-step,
      .lp-narrative-lines div,
      .lp-shift-lines div,
      .lp-faq-item {
        border: 1px solid var(--lp-line);
        border-radius: 14px;
        background: #ffffff;
        box-shadow: var(--lp-shadow);
      }

      .lp-control-card,
      .lp-info-card,
      .lp-module-card,
      .lp-system-node,
      .lp-step {
        transition:
          transform 160ms ease,
          box-shadow 160ms ease,
          border-color 160ms ease;
      }

      .lp-control-card:hover,
      .lp-info-card:hover,
      .lp-module-card:hover,
      .lp-system-node:hover,
      .lp-step:hover {
        transform: translateY(-2px);
        border-color: var(--lp-line-strong);
        box-shadow: var(--lp-shadow-hover);
      }

      /* Cuadrito de ícono: azul por defecto, ámbar alternado. */
      .lp-icon-box {
        display: grid;
        width: 44px;
        height: 44px;
        flex: none;
        place-items: center;
        border-radius: 10px;
        background: var(--lp-blue-soft);
        color: var(--lp-blue);
      }

      .lp-control-card:nth-child(2) .lp-icon-box,
      .lp-module-card:nth-child(even) .lp-icon-box,
      .lp-system-node:nth-child(2) .lp-icon-box,
      .lp-system-node:nth-child(3) .lp-icon-box {
        background: var(--lp-amber-soft);
        color: var(--lp-amber-ink);
      }

      /* Control operativo */
      .lp-control-section {
        padding: 96px 0;
      }

      /* Encabezado arriba (título | bajada) y las 3 tarjetas debajo con aire. */
      .lp-control-shell {
        display: grid;
        grid-template-columns: 1fr;
        gap: 44px;
      }

      .lp-control-copy {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        align-items: end;
        column-gap: 56px;
      }

      .lp-control-copy .lp-eyebrow {
        grid-column: 1;
        justify-self: start;
      }

      .lp-control-copy h2 {
        grid-column: 1;
      }

      .lp-control-copy p {
        grid-column: 2;
        grid-row: 2;
        margin: 0;
        color: var(--lp-body);
        font-size: 1.02rem;
        line-height: 1.7;
      }

      .lp-control-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .lp-control-card {
        position: relative;
        min-width: 0;
        padding: 24px;
      }

      .lp-control-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lp-control-card-top span {
        color: var(--lp-blue-ink);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-align: right;
        text-transform: uppercase;
      }

      .lp-control-card h3 {
        margin: 22px 0 0;
        color: var(--lp-ink);
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .lp-control-card p {
        margin: 10px 0 0;
        color: var(--lp-body);
        font-size: 0.93rem;
        line-height: 1.6;
      }

      /* El problema */
      .lp-narrative-section {
        padding-bottom: 96px;
      }

      .lp-narrative-shell {
        max-width: 1060px;
        text-align: center;
      }

      .lp-narrative-shell > p,
      .lp-shift-layout > div > p {
        max-width: 700px;
        margin: 20px auto 0;
        color: var(--lp-body);
        font-size: 1.05rem;
        line-height: 1.7;
      }

      .lp-narrative-lines {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 52px;
        text-align: left;
      }

      .lp-narrative-lines div {
        padding: 26px 24px 24px;
      }

      .lp-narrative-lines div::before {
        content: "";
        display: block;
        width: 32px;
        height: 3px;
        border-radius: 999px;
        background: var(--lp-amber);
      }

      .lp-narrative-lines strong {
        display: block;
        margin-top: 16px;
        color: var(--lp-ink);
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .lp-narrative-lines span {
        display: block;
        margin-top: 10px;
        color: var(--lp-body);
        font-size: 0.94rem;
        line-height: 1.65;
      }

      /* La transformación */
      .lp-shift-section {
        padding: 96px 0;
      }

      .lp-shift-layout {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        align-items: start;
        gap: 64px;
      }

      .lp-shift-layout > div > p {
        margin-right: 0;
        margin-left: 0;
      }

      .lp-shift-lines {
        display: grid;
        gap: 12px;
      }

      .lp-shift-lines div {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr);
        align-items: center;
        gap: 18px;
        padding: 18px 20px;
      }

      .lp-shift-lines span {
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 10px;
        background: var(--lp-navy);
        color: var(--lp-amber);
        font-size: 0.86rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .lp-shift-lines p {
        margin: 0;
        color: var(--lp-strong-body);
        font-size: 0.98rem;
        line-height: 1.6;
      }

      /* Producto */
      .lp-product-layout,
      .lp-risk-layout {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        align-items: center;
        gap: 56px;
      }

      .lp-product-actions,
      .lp-risk-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 30px;
      }

      .lp-system-map {
        position: relative;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .lp-system-map::before {
        content: "";
        position: absolute;
        inset: 50% 24px auto;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--lp-amber), transparent);
      }

      .lp-system-node {
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 120px;
        gap: 14px;
        padding: 20px;
      }

      .lp-system-node h3 {
        margin: 0;
        color: var(--lp-ink);
        font-size: 1.02rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .lp-system-node p {
        margin: 6px 0 0;
        color: var(--lp-body);
        font-size: 0.9rem;
        line-height: 1.55;
      }

      /* Riesgo: tarjeta blanca, niveles siempre escritos en chips. */
      .lp-risk-board {
        position: relative;
        overflow: hidden;
        min-width: 0;
        padding: 30px;
        border: 1px solid var(--lp-line);
        border-radius: 16px;
        background: #ffffff;
        box-shadow: var(--lp-shadow-hover);
      }

      .lp-risk-board::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 4px;
        background: #dc2626;
      }

      .lp-risk-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lp-risk-header span {
        color: #b91c1c;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .lp-risk-header svg {
        flex: none;
        width: 36px;
        height: 36px;
        padding: 8px;
        border-radius: 10px;
        background: #fee2e2;
        color: #b91c1c;
      }

      .lp-risk-amount {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-top: 22px;
        color: var(--lp-ink);
      }

      .lp-risk-amount span {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .lp-risk-amount strong {
        font-size: clamp(3rem, 6vw, 4.6rem);
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .lp-risk-board p {
        max-width: 420px;
        margin: 12px 0 0;
        color: var(--lp-body);
        line-height: 1.6;
      }

      .lp-risk-bars {
        display: grid;
        gap: 16px;
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

      .lp-risk-line span {
        color: var(--lp-strong-body);
        font-size: 0.86rem;
        font-weight: 600;
        line-height: 1.3;
      }

      .lp-risk-line strong {
        flex: none;
        border-radius: 999px;
        padding: 4px 10px;
        background: var(--lp-blue-soft);
        color: var(--lp-blue-ink);
        font-size: 0.74rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .lp-risk-high strong {
        background: #fee2e2;
        color: #991b1b;
      }

      .lp-risk-mid strong {
        background: #fef3c7;
        color: var(--lp-amber-ink-strong);
      }

      .lp-risk-low strong {
        background: #dcfce7;
        color: #166534;
      }

      .lp-risk-line i {
        display: block;
        overflow: hidden;
        height: 8px;
        border-radius: 999px;
        background: var(--lp-line);
      }

      .lp-risk-line b {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--lp-blue);
      }

      /* Módulos y sectores */
      .lp-card-grid {
        display: grid;
        gap: 16px;
      }

      .lp-card-grid-three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .lp-card-grid-four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .lp-info-card,
      .lp-module-card {
        position: relative;
        min-width: 0;
        padding: 24px;
      }

      .lp-module-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lp-module-top span {
        border-radius: 999px;
        padding: 4px 10px;
        background: var(--lp-blue-soft);
        color: var(--lp-blue-ink);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .lp-module-card:nth-child(even) .lp-module-top span {
        background: var(--lp-amber-soft);
        color: var(--lp-amber-ink-strong);
      }

      .lp-info-card h3,
      .lp-module-card h3 {
        margin: 18px 0 0;
        color: var(--lp-ink);
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .lp-info-card p,
      .lp-module-card p {
        margin: 8px 0 0;
        color: var(--lp-body);
        font-size: 0.94rem;
        line-height: 1.6;
      }

      .lp-info-card-danger {
        border-color: #fecaca;
      }

      .lp-info-card-danger .lp-icon-box {
        background: #fee2e2;
        color: #b91c1c;
      }

      /* Sectores: cabecera navy con el ícono en ámbar (sin fotos). */
      .lp-sector-section .lp-info-card {
        overflow: hidden;
        padding: 0 0 24px;
      }

      .lp-sector-section .lp-info-card .lp-icon-box {
        width: 100%;
        height: 112px;
        border-radius: 0;
        background:
          radial-gradient(circle at 85% 0%, rgba(245, 179, 1, 0.18), transparent 55%),
          linear-gradient(150deg, var(--lp-navy-2) 0%, var(--lp-navy) 100%);
        color: var(--lp-amber);
      }

      .lp-sector-section .lp-info-card .lp-icon-box svg {
        width: 40px;
        height: 40px;
        stroke-width: 1.6;
      }

      .lp-sector-section .lp-info-card h3,
      .lp-sector-section .lp-info-card p {
        padding: 0 22px;
      }

      .lp-sector-section .lp-info-card h3 {
        margin-top: 20px;
      }

      /* Implementación */
      .lp-timeline {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }

      .lp-step {
        position: relative;
        min-width: 0;
        padding: 24px;
      }

      .lp-step > span {
        display: inline-grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 10px;
        background: var(--lp-navy);
        color: var(--lp-amber);
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .lp-step small {
        display: block;
        margin-top: 22px;
        color: var(--lp-blue);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .lp-step h3 {
        margin: 8px 0 0;
        color: var(--lp-ink);
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .lp-step p {
        margin: 8px 0 0;
        color: var(--lp-body);
        font-size: 0.93rem;
        line-height: 1.6;
      }

      /* Precios (la grilla es MarketingPricingGrid; aquí solo el contexto). */
      .lp-pricing-note {
        margin: 28px 0 0;
        color: var(--lp-body);
        font-size: 0.92rem;
        text-align: center;
      }

      /* FAQ */
      .lp-faq-shell {
        max-width: 880px;
      }

      .lp-faq-list {
        display: grid;
        gap: 12px;
      }

      .lp-faq-item {
        overflow: hidden;
      }

      .lp-faq-item button {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        border: 0;
        border-radius: 14px;
        padding: 20px 22px;
        background: transparent;
        color: var(--lp-ink);
        cursor: pointer;
        font-family: inherit;
        font-size: 1.04rem;
        font-weight: 700;
        line-height: 1.4;
        text-align: left;
      }

      .lp-faq-item button:focus-visible {
        outline-offset: -3px;
      }

      .lp-faq-item button svg {
        flex: none;
        width: 32px;
        height: 32px;
        padding: 7px;
        border-radius: 999px;
        background: var(--lp-blue-soft);
        color: var(--lp-blue);
        transition: background-color 160ms ease, color 160ms ease;
      }

      .lp-faq-item button[aria-expanded="true"] svg {
        background: var(--lp-amber);
        color: var(--lp-navy);
      }

      .lp-faq-item p {
        max-width: 760px;
        margin: 0;
        padding: 0 22px 22px;
        color: var(--lp-body);
        line-height: 1.65;
      }

      /* ───────────── Banda final de CTA (navy) ───────────── */

      .lp-final-cta {
        padding: 96px 0;
        color: var(--lp-on-navy);
        background:
          radial-gradient(circle at 88% 0%, rgba(245, 179, 1, 0.12), transparent 38%),
          radial-gradient(circle at 8% 100%, rgba(37, 99, 235, 0.2), transparent 44%),
          linear-gradient(160deg, var(--lp-navy) 0%, var(--lp-navy-2) 100%);
      }

      .lp-final-box {
        max-width: 820px;
        margin: 0 auto;
        text-align: center;
      }

      .lp-final-box .lp-eyebrow {
        align-items: center;
        color: var(--lp-on-navy-2);
      }

      .lp-final-box h2 {
        max-width: 760px;
        margin-right: auto;
        margin-left: auto;
        color: var(--lp-on-navy);
      }

      .lp-final-box p {
        max-width: 640px;
        margin: 18px auto 0;
        color: var(--lp-on-navy-2);
        font-size: 1.05rem;
        line-height: 1.65;
      }

      .lp-final-box .lp-hero-actions {
        justify-content: center;
      }

      /* ───────────── Footer ───────────── */

      .lp-footer {
        padding: 56px 0 48px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        background: var(--lp-navy-deep);
        color: var(--lp-on-navy-2);
      }

      .lp-footer-grid {
        display: grid;
        grid-template-columns: 1.7fr repeat(3, minmax(0, 1fr));
        gap: 32px;
      }

      .lp-footer p {
        max-width: 360px;
        margin: 16px 0 0;
        color: var(--lp-on-navy-2);
        font-size: 0.92rem;
        line-height: 1.65;
      }

      .lp-footer-grid > div > strong {
        display: block;
        margin-bottom: 12px;
        color: var(--lp-on-navy);
        font-size: 0.92rem;
        font-weight: 700;
      }

      .lp-footer-grid > div > a:not(.lp-brand) {
        display: block;
        width: fit-content;
        margin-top: 10px;
        color: var(--lp-on-navy-2);
        font-size: 0.9rem;
        text-decoration: none;
        transition: color 160ms ease;
      }

      .lp-footer-grid > div > a:not(.lp-brand):hover {
        color: var(--lp-amber);
      }

      .lp-footer-grid > div > span {
        display: block;
        margin-top: 10px;
        color: #94a3b8;
        font-size: 0.86rem;
      }

      /* ───────────── Movimiento reducido ───────────── */

      @media (prefers-reduced-motion: reduce) {
        .lp-demo-progress span,
        .lp-tour-scene,
        .lp-tour-scene img,
        .lp-tour-hotspot,
        .lp-tour-callout,
        .lp-tour-cursor,
        .lp-tour-cursor::after,
        .lp-tour-chapter {
          animation: none;
        }

        .c360-landing *,
        .c360-landing *::before,
        .c360-landing *::after {
          transition-duration: 0.01ms !important;
        }

        .lp-button:hover,
        .lp-hero-metrics div:hover,
        .lp-control-card:hover,
        .lp-info-card:hover,
        .lp-module-card:hover,
        .lp-system-node:hover,
        .lp-step:hover {
          transform: none;
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

        .lp-tour-chapter:first-child {
          border-color: rgba(245, 179, 1, 0.55);
          background: rgba(245, 179, 1, 0.08);
          box-shadow: inset 3px 0 0 var(--lp-amber);
        }
      }

      /* ───────────── Responsive ───────────── */

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
          padding: 10px 0 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lp-mobile-menu a {
          border-radius: 10px;
          padding: 12px;
          color: var(--lp-on-navy);
          font-weight: 600;
          text-decoration: none;
        }

        .lp-mobile-menu a:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .lp-mobile-menu a.lp-button-primary {
          margin-top: 8px;
          padding: 0 18px;
          color: var(--lp-navy);
        }

        .lp-mobile-menu a.lp-button-primary:hover {
          background: var(--lp-amber-hover);
        }

        .lp-hero-stage {
          grid-template-columns: 1fr;
          gap: 36px;
        }

        .lp-hero-copy {
          max-width: 760px;
        }

        .lp-lead-panel {
          max-width: 620px;
        }

        .lp-control-shell {
          gap: 36px;
        }

        .lp-control-copy {
          grid-template-columns: 1fr;
        }

        .lp-control-copy p {
          grid-column: 1;
          grid-row: auto;
          margin-top: 20px;
        }

        .lp-command-grid,
        .lp-card-grid-three,
        .lp-card-grid-four,
        .lp-risk-layout,
        .lp-shift-layout,
        .lp-timeline,
        .lp-footer-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        /* El mapa 2×2 necesita todo el ancho: encabezado arriba, nodos abajo. */
        .lp-product-layout {
          grid-template-columns: 1fr;
        }

        .lp-ai-panel {
          grid-column: span 2;
        }

        .lp-product-layout,
        .lp-risk-layout,
        .lp-shift-layout {
          gap: 36px;
        }

        .lp-tour-layout {
          grid-template-columns: 1fr;
        }

        .lp-tour-director {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 0;
        }

        .lp-tour-chapters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .lp-shell,
        .lp-mobile-menu {
          width: calc(100% - 32px);
        }

        .lp-nav-inner {
          min-height: 64px;
        }

        .lp-hero {
          --lp-hero-tail: 120px;
          padding: 56px 0 40px;
        }

        .lp-hero h1 {
          font-size: 2.4rem;
        }

        .lp-hero-copy > p {
          font-size: 1rem;
        }

        .lp-lead-panel {
          padding: 24px 20px;
        }

        .lp-lead-panel h2 {
          font-size: 1.4rem;
        }

        .lp-lead-fields,
        .lp-narrative-lines,
        .lp-control-grid {
          grid-template-columns: 1fr;
        }

        .lp-hero-actions,
        .lp-product-actions,
        .lp-risk-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .lp-button {
          width: 100%;
          white-space: normal;
          text-align: center;
        }

        .lp-command {
          margin-top: 40px;
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
        .lp-shift-layout,
        .lp-system-map,
        .lp-timeline,
        .lp-footer-grid {
          grid-template-columns: 1fr;
        }

        .lp-system-map::before {
          display: none;
        }

        .lp-ai-panel {
          grid-column: auto;
          flex-wrap: wrap;
        }

        .lp-ai-status {
          margin-left: 0;
        }

        .lp-proof-item {
          padding: 24px 4px;
          border-right: none;
          border-bottom: 1px solid var(--lp-line);
        }

        .lp-proof-item:last-child {
          border-bottom: none;
        }

        .lp-section,
        .lp-control-section,
        .lp-shift-section {
          padding: 72px 0;
        }

        .lp-section-head,
        .lp-section-head-left,
        .lp-narrative-shell {
          text-align: left;
        }

        .lp-section-head > span {
          align-items: flex-start;
        }

        .lp-section-head {
          margin-bottom: 36px;
        }

        .lp-section-head p,
        .lp-narrative-shell > p {
          margin-left: 0;
        }

        .lp-risk-board {
          padding: 26px 20px;
        }

        .lp-final-cta {
          padding: 72px 0;
        }

        .lp-final-box {
          text-align: left;
        }

        .lp-final-box .lp-eyebrow {
          align-items: flex-start;
        }

        .lp-final-box h2,
        .lp-final-box p {
          margin-left: 0;
        }

        .lp-demo-section {
          padding: 64px 0 72px;
        }

        .lp-demo-player-top {
          align-items: flex-start;
          padding: 14px;
        }

        .lp-tour-status {
          width: 100%;
          justify-content: space-between;
        }

        .lp-tour-stage {
          padding: 52px 10px 10px;
        }

        .lp-tour-browser-bar {
          padding: 0 12px;
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

        .lp-tour-hotspot,
        .lp-tour-cursor {
          display: none;
        }

        .lp-tour-callout {
          inset: auto 12px 12px;
          width: auto;
          padding: 13px;
          background: rgba(11, 27, 54, 0.98);
        }

        .lp-tour-callout h3 {
          font-size: 1rem;
        }

        .lp-tour-callout p {
          font-size: 0.8rem;
        }

        .lp-tour-director {
          padding: 12px;
        }

        .lp-tour-chapters,
        .lp-tour-takeaways {
          grid-template-columns: 1fr;
        }

        .lp-demo-controls {
          padding: 14px 12px 12px;
        }
      }

      @media (max-width: 560px) {
        .lp-hero-metrics {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .lp-hero-metrics div {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
        }

        .lp-hero-metrics strong {
          min-width: 96px;
          font-size: 1.6rem;
        }

        .lp-hero-metrics span {
          margin-top: 0;
        }
      }

      @media (max-width: 420px) {
        .lp-hero h1 {
          font-size: 2.15rem;
        }

        .lp-command-topbar {
          padding: 0 12px;
        }

        .lp-command-grid {
          padding: 10px;
        }

        .lp-command-panel,
        .lp-info-card,
        .lp-module-card,
        .lp-step,
        .lp-control-card {
          padding: 18px;
        }

        .lp-sector-section .lp-info-card {
          padding: 0 0 20px;
        }

        .lp-sector-section .lp-info-card h3,
        .lp-sector-section .lp-info-card p {
          padding: 0 18px;
        }

        .lp-risk-amount strong {
          font-size: 2.9rem;
        }
      }
    `}</style>
  )
}
