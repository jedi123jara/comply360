'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Scale,
  FileText,
  Calculator,
  Shield,
  Bell,
  Users,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Zap,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Building2,
  Layers,
} from 'lucide-react'
import { PLANS } from '@/lib/constants'
import { useUser } from '@clerk/nextjs'
import { track } from '@/lib/analytics'

// ─── Intersection Observer for scroll-reveal ─────────────────────────────────
// Nota: devolvemos tuple `[ref, visible]` en lugar de objeto `{ref, visible}`
// porque React 19 eslint-plugin-react-hooks confunde lecturas `.visible`
// con lecturas de refs cuando el objeto también expone `.ref` ("Cannot access
// refs during render"). La tuple elimina la ambigüedad.
function useReveal(threshold = 0.12): readonly [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible] as const
}

// ─── CountUp animation ────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    const startTime = performance.now()
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, trigger])
  return value
}

// ─── Feature tabs data ────────────────────────────────────────────────────────
const FEATURE_TABS = [
  {
    id: 'contratos',
    label: 'Contratos',
    icon: FileText,
    heading: 'Genera contratos laborales en minutos',
    desc: 'Crea contratos personalizados con IA a partir de una descripción simple. Plazo fijo, indefinido, locación de servicios y más. Cumplimiento garantizado con la normativa peruana vigente.',
    bullets: [
      '19 cláusulas obligatorias incluidas (SST, datos personales, igualdad salarial)',
      'Generación IA o desde plantilla base',
      'Exportación PDF y DOCX lista para firmar',
      'Auto-guardado en el legajo del trabajador',
    ],
    mockupBg: 'from-blue-50 to-slate-50',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600',
  },
  {
    id: 'calculadoras',
    label: 'Calculadoras',
    icon: Calculator,
    heading: 'Cálculos exactos en segundos',
    desc: 'CTS, gratificaciones, vacaciones, liquidaciones e indemnizaciones. Actualizados con la UIT y RMV vigentes. Sin Excel, sin errores.',
    bullets: [
      'CTS y gratificaciones con prorrateo automático',
      'Liquidaciones de cese y indemnizaciones',
      'Simulador de escenarios (tiempo completo / parcial / MYPE)',
      'Exporta el cálculo en PDF con firma del empleador',
    ],
    mockupBg: 'from-amber-50 to-orange-50',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-500',
  },
  {
    id: 'alertas',
    label: 'Alertas y Cumplimiento',
    icon: Bell,
    heading: 'Nunca pierdas una fecha crítica',
    desc: 'El motor de alertas monitorea vencimientos de contratos, fechas de pago de beneficios y cambios normativos. Notificaciones automáticas al correo.',
    bullets: [
      'Alertas: CTS (mayo/nov), gratificaciones (julio/dic), vacaciones vencidas',
      'Notificación de contratos por vencer con 30 y 15 días de anticipación',
      'Score de cumplimiento por trabajador y organización',
      'Panel SUNAFIL con simulacro de inspección laboral',
    ],
    mockupBg: 'from-violet-50 to-purple-50',
    accent: 'text-violet-600',
    accentBg: 'bg-violet-600',
  },
  {
    id: 'legajo',
    label: 'Legajo Digital',
    icon: Users,
    heading: 'Legajo completo y siempre ordenado',
    desc: 'Centraliza todos los documentos laborales de cada trabajador. Importa contratos desde PDF, extrae datos automáticamente y organiza el archivo digital.',
    bullets: [
      'Importación masiva desde PDF con extracción IA por contrato',
      'Score de completitud del legajo (0-100)',
      'Documentos de ingreso, SST, previsional y cese',
      'Portal del trabajador para consulta de sus documentos',
    ],
    mockupBg: 'from-emerald-50 to-teal-50',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-600',
  },
]

/* ============================================================ */
/*  PAGE                                                         */
/* ============================================================ */
export default function LandingPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [roleHome, setRoleHome] = useState<'/dashboard' | '/mi-portal'>('/dashboard')

  // Detectar si el usuario es WORKER → su "home" es /mi-portal, no /dashboard.
  // Esto importa sobre todo para la PWA: si un trabajador instala Comply360
  // y toca el ícono desde home screen, start_url="/" debe llevarlo a su portal.
  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: string } | null) => {
        if (cancelled || !data) return
        if (data.role === 'WORKER') {
          setRoleHome('/mi-portal')
          // Auto-redirect: workers no deberían ver el landing comercial
          router.replace('/mi-portal')
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isSignedIn, router])

  const ctaHref = isSignedIn ? roleHome : '/sign-up'
  const handleCtaClick = (e: React.MouseEvent) => {
    track('landing_cta_clicked', { cta: 'hero_primary', signed_in: isSignedIn ?? false })
    if (isSignedIn) { e.preventDefault(); router.push(roleHome) }
  }

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [annBannerVisible, setAnnBannerVisible] = useState(true)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Reveal refs — tuples `[ref, visible]` para evitar falsos positivos de
  // react-hooks/refs al leer .visible de un objeto que también tiene .ref.
  const [metricsRef, metricsVisible] = useReveal()
  const [featuresRef, featuresVisible] = useReveal()
  const [stepsRef, stepsVisible] = useReveal()
  const [testimonialsRef, testimonialsVisible] = useReveal()
  const [pricingRef, pricingVisible] = useReveal()
  const [ctaRef, ctaVisible] = useReveal()

  // CountUps
  const empresasCount = useCountUp(500, 2000, metricsVisible)
  const calcCount = useCountUp(50000, 2000, metricsVisible)
  const horasCount = useCountUp(20, 2000, metricsVisible)
  const precisionCount = useCountUp(99.9, 2000, metricsVisible)

  const tab = FEATURE_TABS[activeTab]

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Announcement bar ──────────────────────────────────────────── */}
      {annBannerVisible && (
        <div
          className="text-white py-2.5 px-4 flex items-center justify-center gap-3 text-sm relative"
          style={{
            background: 'linear-gradient(90deg, #047857 0%, #10b981 50%, #047857 100%)',
          }}
        >
          <Sparkles className="h-4 w-4 text-amber-300 flex-shrink-0" />
          <span>
            <strong className="font-semibold">SUNAFIL aumentó 30% las fiscalizaciones en 2026.</strong>{' '}
            Calculá tu riesgo de multa en 10 minutos.{' '}
            <Link
              href="/diagnostico-gratis"
              onClick={() => track('landing_cta_clicked', { cta: 'announcement_bar' })}
              className="underline underline-offset-2 font-medium text-emerald-50 hover:text-white transition-colors"
            >
              Diagnóstico gratis →
            </Link>
          </span>
          <button
            onClick={() => setAnnBannerVisible(false)}
            className="absolute right-4 p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 bg-white transition-all duration-200 ${
          scrolled ? 'border-b border-gray-100 shadow-sm' : 'border-b border-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo — COMPLY360 Variant A "Sello notarial" */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(165deg, #059669 0%, #047857 55%, #065f46 100%)',
                boxShadow: '0 1px 2px rgba(4,120,87,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Comply<span className="text-emerald-700">360</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              ['Funciones', 'funciones'],
              ['Cómo funciona', 'como-funciona'],
              ['Precios', 'precios'],
              ['Contacto', 'contacto'],
            ].map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-2">
            {isSignedIn ? (
              <Link
                href={roleHome}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {roleHome === '/mi-portal' ? 'Mi Portal' : 'Mi Dashboard'}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
            <Link
              href={ctaHref}
              onClick={handleCtaClick}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              {isSignedIn ? (roleHome === '/mi-portal' ? 'Ir a Mi Portal' : 'Ir al Dashboard') : 'Prueba gratis'}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-1 shadow-lg">
            {[['Funciones', 'funciones'], ['Cómo funciona', 'como-funciona'], ['Precios', 'precios'], ['Contacto', 'contacto']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50">
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link href={isSignedIn ? roleHome : '/sign-in'} className="px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 text-center">
                {isSignedIn ? (roleHome === '/mi-portal' ? 'Mi Portal' : 'Mi Dashboard') : 'Iniciar sesión'}
              </Link>
              <Link href={ctaHref} onClick={handleCtaClick} className="px-4 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-xl text-center">
                {isSignedIn ? (roleHome === '/mi-portal' ? 'Ir a Mi Portal' : 'Ir al Dashboard') : 'Prueba gratis'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-16 pb-8 lg:pt-24 lg:pb-0"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.97) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
        }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(90% 70% at 50% 30%, #000 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(90% 70% at 50% 30%, #000 0%, transparent 80%)',
          }}
        />
        {/* Emerald halo pulsante */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 70%)',
            animation: 'c360-breathe 6s ease-in-out infinite',
          }}
        />
        <div className="absolute top-60 -left-20 w-[400px] h-[400px] rounded-full bg-amber-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text column */}
          <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            {/* Badge — eyebrow editorial con número fuerte */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-7">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800">
                Multa SUNAFIL máxima: S/ 289,000
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: 'var(--text-emerald-700)',
                marginBottom: 24,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  'Evita <em style="color: var(--emerald-700); font-style: italic">multas SUNAFIL</em> sin contratar un abogado.',
              }}
            />

            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              El <strong>piloto automático</strong> para tus obligaciones laborales:
              135 preguntas SUNAFIL · 12 regímenes · firma biométrica del trabajador ·
              alertas 30 días antes de cualquier vencimiento. Lo que un estudio de
              abogados cobra S/5,000/mes, por <strong>S/129</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-6">
              <Link
                href="/diagnostico-gratis"
                onClick={() => track('landing_cta_clicked', { cta: 'hero_diagnostic' })}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base transition-all hover:bg-emerald-700 w-full sm:w-auto justify-center"
                style={{
                  boxShadow: '0 10px 30px -8px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                <Shield className="h-5 w-5" />
                Calcular mi riesgo de multa (gratis)
              </Link>
              <Link
                href={ctaHref}
                onClick={handleCtaClick}
                className="group inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-semibold text-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all"
              >
                {isSignedIn ? 'Ir al Dashboard' : 'Probar 14 días gratis'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Trust indicators con mini-métricas */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start text-xs text-gray-500 mb-3">
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                10 minutos · sin tarjeta
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Conforme Ley 29733
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Cancela cuando quieras
              </li>
            </ul>
            <p className="text-xs text-gray-400">
              Base legal: D.S. 019-2006-TR + UIT 2026 (S/5,500). Multa máxima 52.53 UIT por infracción muy grave.
            </p>
          </div>

          {/* Product screenshot — browser frame */}
          <div className="flex-1 w-full max-w-2xl lg:max-w-none hidden lg:block">
            <div className="relative">
              {/* Browser chrome */}
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/15 border border-gray-200/80 ring-1 ring-gray-900/5">
                {/* Browser bar */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 font-mono flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      app.comply360.pe/dashboard
                    </div>
                  </div>
                </div>
                {/* Dashboard mockup */}
                <div className="bg-slate-950 p-5 space-y-4">
                  {/* Top row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Contratos activos', val: '47', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                      { label: 'Score cumplimiento', val: '94/100', icon: Shield, color: 'text-green-400', bg: 'bg-green-400/10' },
                      { label: 'Alertas pendientes', val: '3', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    ].map(({ label, val, icon: Icon, color, bg }) => (
                      <div key={label} className="rounded-xl bg-white/5 border border-white/8 p-4">
                        <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <div className="text-xl font-bold text-white">{val}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Middle row */}
                  <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-200">Trabajadores activos</span>
                      <span className="text-xs text-slate-400">Mayo 2026</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 65, 55, 80, 70, 90, 75, 95, 85, 100, 88, 92].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-300 opacity-70"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Alert row */}
                  <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-300">Todos los contratos cumplen la normativa SUNAFIL vigente</span>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -left-8 top-1/3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-900/10 animate-float hidden xl:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">CTS calculada</div>
                    <div className="text-base font-bold text-gray-900">S/ 4,800</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-6 bottom-16 p-4 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-900/10 animate-float-delay hidden xl:block">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">IA generó contrato</div>
                    <div className="text-sm font-bold text-gray-900">en 8 segundos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="relative mt-16 lg:mt-0">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </section>

      {/* ── Trust logos ──────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
            Empresas y estudios jurídicos que confían en COMPLY360
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['Grupo Andino', 'Paz & Asociados', 'Tech Solutions', 'BCP Asesores', 'Sierra Alta Mining', 'Red Corporativa SAC'].map((name) => (
              <span key={name} className="text-lg font-bold text-gray-200 hover:text-gray-300 transition-colors select-none">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div
          ref={metricsRef}
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${metricsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: empresasCount, suffix: '+', label: 'Empresas activas', desc: 'en toda la región' },
              { value: calcCount, suffix: '+', label: 'Cálculos realizados', desc: 'con precisión garantizada' },
              { value: horasCount, suffix: 'h', label: 'Horas ahorradas', desc: 'por semana por empresa' },
              { value: precisionCount, suffix: '%', label: 'Precisión', desc: 'en cálculos laborales' },
            ].map(({ value, suffix, label, desc }, i) => (
              <div key={label} className={`text-center transition-all duration-700 delay-${i * 100}`}>
                <div className="text-4xl lg:text-5xl font-extrabold text-emerald-700 tracking-tight mb-1">
                  {value >= 1000
                    ? `${Math.round(value / 1000).toLocaleString('es-PE')}k`
                    : value >= 100
                    ? Math.round(value).toLocaleString('es-PE')
                    : value.toFixed(value % 1 !== 0 ? 1 : 0)}
                  <span className="text-amber-500">{suffix}</span>
                </div>
                <div className="text-base font-semibold text-gray-800 mb-0.5">{label}</div>
                <div className="text-sm text-gray-400">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (tabbed) ─────────────────────────────────────────── */}
      <section id="funciones" className="py-24 bg-gray-50/60">
        <div
          ref={featuresRef}
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-4">
              Módulos de la plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Todo lo que tu equipo necesita,{' '}
              <span className="text-emerald-700">en un solo lugar</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed">
              Cada módulo está diseñado por abogados laboralistas peruanos
              para cubrir el ciclo completo de cumplimiento laboral.
            </p>
          </div>

          {/* Tab strip */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {FEATURE_TABS.map((t, i) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(i)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === i
                      ? 'bg-white text-gray-900 shadow-md border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activeTab === i ? t.accent : 'text-gray-400'}`} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-900/5 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Text side */}
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tab.accentBg} text-white mb-6 shadow-lg`}>
                  <tab.icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
                  {tab.heading}
                </h3>
                <p className="text-gray-500 leading-relaxed mb-8">{tab.desc}</p>
                <ul className="space-y-3 mb-10">
                  {tab.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full ${tab.accentBg} flex items-center justify-center`}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-600 leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={ctaHref}
                  onClick={handleCtaClick}
                  className={`self-start inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white ${tab.accentBg} shadow-lg transition-all hover:opacity-90`}
                >
                  Probar este módulo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Visual side */}
              <div className={`bg-gradient-to-br ${tab.mockupBg} p-10 lg:p-14 flex items-center justify-center min-h-[360px]`}>
                <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-100 shadow-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{tab.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Activo</span>
                  </div>
                  {/* Mock content rows */}
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${tab.accentBg} opacity-20`} />
                      <div className="flex-1 space-y-1.5">
                        <div className={`h-2.5 rounded-full bg-gray-100`} style={{ width: `${70 - i * 10}%` }} />
                        <div className="h-2 rounded-full bg-gray-50" style={{ width: `${50 - i * 5}%` }} />
                      </div>
                      <div className="h-5 w-12 rounded-full bg-gray-50" />
                    </div>
                  ))}
                  <div className={`rounded-xl ${tab.accentBg} opacity-10 h-10`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-white">
        <div
          ref={stepsRef}
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-4">
              Cómo funciona
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Empieza a cumplir en{' '}
              <span className="text-emerald-800">3 pasos simples</span>
            </h2>
            <p className="text-lg text-gray-500">
              Sin configuraciones complejas. En menos de 10 minutos tu organización
              está operando con cumplimiento total.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-emerald-600/20 via-emerald-600/40 to-emerald-600/20" />

            {[
              {
                step: '01',
                icon: Building2,
                title: 'Registra tu empresa',
                desc: 'Completa el onboarding con los datos de tu organización: RUC, régimen laboral y datos del representante legal. Tarda menos de 5 minutos.',
                color: 'bg-blue-600',
                light: 'bg-blue-50',
                textColor: 'text-blue-600',
              },
              {
                step: '02',
                icon: Users,
                title: 'Agrega tus trabajadores',
                desc: 'Importa desde Excel o registra manualmente. Puedes también subir un PDF con múltiples contratos y la IA extrae los datos automáticamente.',
                color: 'bg-emerald-600',
                light: 'bg-emerald-50',
                textColor: 'text-emerald-700',
              },
              {
                step: '03',
                icon: Shield,
                title: 'Gestiona y cumple',
                desc: 'Genera contratos, calcula beneficios, recibe alertas de vencimientos y mantén el legajo digital siempre completo y listo para SUNAFIL.',
                color: 'bg-amber-500',
                light: 'bg-amber-50',
                textColor: 'text-amber-700',
              },
            ].map(({ step, icon: Icon, title, desc, color, light, textColor }, i) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-8 rounded-3xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Step number */}
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${color} text-white text-xl font-extrabold mb-5 shadow-lg`}>
                  {step}
                </div>
                <div className={`inline-flex p-3 rounded-xl ${light} mb-4`}>
                  <Icon className={`h-6 w-6 ${textColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href={ctaHref}
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              Empezar ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why COMPLY360 ───────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-4">
              Por qué elegirnos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Diseñado para la realidad{' '}
              <span className="text-emerald-700">peruana</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Scale,
                title: 'Normativa peruana actualizada',
                desc: 'D.Leg. 728, Ley 29783 (SST), Ley 27942 (hostigamiento), Ley 29733 (datos personales) y Ley 30709 (igualdad salarial) integradas.',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: Zap,
                title: 'IA entrenada en derecho laboral',
                desc: 'El generador de contratos usa modelos de lenguaje especializados con el corpus legal peruano completo. No es solo una plantilla.',
                color: 'text-violet-600',
                bg: 'bg-violet-50',
              },
              {
                icon: Shield,
                title: 'Preparado para SUNAFIL',
                desc: 'Simulacro de inspección laboral con 120 preguntas. Detecta vulnerabilidades antes que el inspector y genera el plan de acción.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                icon: BarChart3,
                title: 'Score de cumplimiento en tiempo real',
                desc: 'Cada trabajador y la organización tienen un score 0-100. Sabes exactamente qué falta y cómo mejorar.',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              {
                icon: Layers,
                title: 'Legajo digital completo',
                desc: 'Contratos, DNI, AFP, seguro vida, SST y más. Legajo de ingreso, vigente y de cese organizados automáticamente.',
                color: 'text-rose-600',
                bg: 'bg-rose-50',
              },
              {
                icon: MessageSquare,
                title: 'Asesor IA 24/7',
                desc: 'Chat legal entrenado en derecho laboral peruano. Consulta dudas sobre beneficios, despidos, periodo de prueba o régimen MYPE.',
                color: 'text-cyan-600',
                bg: 'bg-cyan-50',
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group p-7 rounded-2xl bg-white border border-gray-100 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-600/10 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`inline-flex p-3 rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div
          ref={testimonialsRef}
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-4">
              Testimonios
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Lo que dicen quienes{' '}
              <span className="text-emerald-800">ya lo usan</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'COMPLY360 nos ahorró 20 horas semanales en gestión de contratos. La generación con IA es increíble — cada cláusula está perfectamente redactada.',
                name: 'María Torres',
                title: 'Jefa de RRHH',
                company: 'Grupo Andino S.A.C.',
                rating: 5,
                initial: 'M',
                initBg: 'from-blue-500 to-blue-600',
              },
              {
                quote: 'Las calculadoras son exactas y las alertas normativas nos mantienen al día. Es indispensable para cualquier estudio jurídico que maneje planillas.',
                name: 'Jorge Ramírez',
                title: 'Abogado Senior',
                company: 'Estudio Paz & Asociados',
                rating: 5,
                initial: 'J',
                initBg: 'from-violet-500 to-violet-600',
              },
              {
                quote: 'Antes usabamos Excel para todo. Ahora todo está automatizado y sin errores. El simulacro SUNAFIL nos salvó de una multa importante.',
                name: 'Ana Castillo',
                title: 'Gerente Legal',
                company: 'Tech Solutions Perú',
                rating: 5,
                initial: 'A',
                initBg: 'from-emerald-500 to-emerald-600',
              },
            ].map(({ quote, name, title, company, rating, initial, initBg }, i) => (
              <div
                key={name}
                className="flex flex-col p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-900/5 hover:border-gray-200 transition-all duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-500" />
                  ))}
                </div>
                <blockquote className="flex-1 text-gray-700 leading-relaxed text-sm mb-6">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${initBg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{title} · {company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="precios" className="py-24 bg-gray-50/60">
        <div
          ref={pricingRef}
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-4">
              Precios
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Planes para cada{' '}
              <span className="text-emerald-700">tamaño de empresa</span>
            </h2>
            <p className="text-lg text-gray-500">
              Sin letras pequeñas. Todo incluido desde el primer día.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {(Object.values(PLANS) as Array<{ key: string; name: string; price: number; features: readonly string[] }>).map((plan) => {
              const isPopular = plan.key === 'EMPRESA'
              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
                    isPopular
                      ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/25 scale-[1.02] z-10'
                      : 'bg-white border border-gray-200 hover:shadow-xl hover:shadow-gray-900/5'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide shadow-md">
                      Más popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-lg font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm ${isPopular ? 'text-white/60' : 'text-gray-400'}`}>S/</span>
                      <span className={`text-4xl font-extrabold ${isPopular ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                      <span className={`text-sm ${isPopular ? 'text-white/60' : 'text-gray-400'}`}>/mes</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isPopular ? 'text-amber-200' : 'text-emerald-700'}`} />
                        <span className={`text-sm ${isPopular ? 'text-white/80' : 'text-gray-600'}`}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={ctaHref}
                    onClick={handleCtaClick}
                    className={`block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all ${
                      isPopular
                        ? 'bg-white text-emerald-700 hover:bg-gray-50 shadow-lg'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isSignedIn ? 'Ir al Dashboard' : 'Comenzar gratis'}
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div
          ref={ctaRef}
          className={`mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="relative overflow-hidden rounded-3xl p-12 sm:p-16 text-center shadow-2xl shadow-emerald-600/25" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 45%, #10b981 100%)' }}>
            {/* Decorative */}
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-6">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-white/90">14 días gratis, sin riesgo</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-5">
                Empieza a cumplir la normativa{' '}
                <span className="text-amber-200">desde hoy</span>
              </h2>
              <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
                Únete a cientos de empresas y estudios jurídicos peruanos
                que ya gestionan su planilla sin miedo a SUNAFIL.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const emailInput = form.elements.namedItem('email') as HTMLInputElement
                  const email = emailInput?.value?.trim()
                  if (isSignedIn) router.push(roleHome)
                  else if (email) router.push(`/sign-up?email=${encodeURIComponent(email)}`)
                  else router.push('/sign-up')
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-5"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="tu@empresa.pe"
                  autoComplete="email"
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 backdrop-blur-sm"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-amber-500 text-white font-semibold shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:shadow-amber-500/50 transition-all whitespace-nowrap"
                >
                  {isSignedIn ? 'Ir al Dashboard' : 'Comenzar gratis'}
                </button>
              </form>
              <p className="text-xs text-white/35">
                Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer id="contacto" className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand — footer */}
            <div className="lg:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                  style={{
                    background: 'linear-gradient(165deg, #059669 0%, #047857 55%, #065f46 100%)',
                    boxShadow: '0 1px 2px rgba(4,120,87,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">
                  Comply<span className="text-emerald-400">360</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed max-w-xs mb-6 text-gray-500">
                La plataforma de cumplimiento laboral inteligente para empresas
                y estudios jurídicos peruanos.
              </p>
              <div className="space-y-2 text-sm">
                <a href="mailto:legaliproperu@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" /> legaliproperu@gmail.com
                </a>
                <a href="tel:+51916275643" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" /> +51 916 275 643
                </a>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Lima, Perú
                </span>
              </div>
            </div>

            {[
              {
                heading: 'Producto',
                links: [
                  { label: 'Generador de Contratos', href: '#' },
                  { label: 'Calculadoras Laborales', href: '#' },
                  { label: 'Alertas Normativas', href: '#' },
                  { label: 'Legajo Digital', href: '#' },
                  { label: 'Asesor IA', href: '#' },
                ],
              },
              {
                heading: 'Empresa',
                links: [
                  { label: 'Nosotros', href: '#' },
                  { label: 'Blog', href: '#' },
                  { label: 'Carreras', href: '#' },
                  { label: 'Soporte', href: '#' },
                  { label: 'Contacto', href: '#contacto' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Términos de Servicio', href: '/terminos' },
                  { label: 'Privacidad', href: '/privacidad' },
                  { label: 'Cookies', href: '#' },
                  { label: 'Protección de Datos', href: '/privacidad' },
                ],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">{heading}</h4>
                <ul className="space-y-2.5 text-sm">
                  {links.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className="hover:text-white transition-colors">{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              &copy; 2026 COMPLY360. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-3">
              {[
                { label: 'in', title: 'LinkedIn' },
                { label: 'tw', title: 'Twitter' },
                { label: 'fb', title: 'Facebook' },
              ].map(({ label, title }) => (
                <a
                  key={title}
                  href="#"
                  aria-label={title}
                  className="h-8 w-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
