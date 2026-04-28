'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { PLANS } from '@/lib/constants'
import { track } from '@/lib/analytics'

// ─── Editorial Emerald landing — handoff "lNufxUI6cGhIK99GcegiQw" ─────────────
// Tipografía: Instrument Serif (drama) + Geist (UI) + Geist Mono (data tags).
// Paleta: emerald-50→950 + ink slate. Spacing generoso, secciones de 120 px,
// hero con mini-dashboard compuesto. Mobile-first responsive con grid collapse.

// ============================================================================
// Tokens — paleta y tipografía locales (scoped via inline styles).
// ============================================================================
const ink = '#0f172a'
const ink2 = '#334155'
const ink3 = '#64748b'
const muted = '#94a3b8'
const line = 'rgba(15,23,42,0.08)'
const lineStrong = 'rgba(15,23,42,0.14)'
const fontSerif = "var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif"
const fontSans = "var(--font-geist-sans, 'Geist'), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const fontMono = "var(--font-geist-mono, 'Geist Mono'), ui-monospace, 'SF Mono', monospace"

// ============================================================================
// Module catalog — 8 módulos cubriendo el ciclo SUNAFIL completo.
// ============================================================================
const MODULES = [
  { tag: 'SST', title: 'Seguridad y salud', desc: 'Comité paritario, IPERC, capacitaciones obligatorias, exámenes médicos, accidentes y reportes a SUNAFIL.', ref: 'Ley 29783 · D.S. 005-2012-TR' },
  { tag: 'Planilla', title: 'Boletas y T-Registro', desc: 'Cálculo automático de CTS, gratificación, AFP/ONP. Integración con PLAME y firma digital de boletas.', ref: 'D.S. 001-98-TR' },
  { tag: 'Contratos', title: 'Gestión contractual', desc: 'Plantillas legales, firmas digitales con RENIEC, vencimientos automáticos y registro electrónico ante MTPE.', ref: 'D.S. 003-97-TR' },
  { tag: 'Hostigamiento', title: 'Canal de denuncias', desc: 'Canal anónimo encriptado, comité de intervención y plazos automáticos. Cumple Ley 27942 y Ley 31806.', ref: 'Ley 27942 · 31806' },
  { tag: 'Asistencia', title: 'Marcaje y horarios', desc: 'Marcaje GPS, geofencing, horas extras automáticas, tardanzas y reportes laborales para inspecciones.', ref: 'D.S. 004-2006-TR' },
  { tag: 'Capacitación', title: 'LMS integrado', desc: 'Cursos SST, hostigamiento, código de ética. Certificados con QR verificables y reportes de avance.', ref: 'Anual obligatoria' },
  { tag: 'Diagnóstico', title: 'Score SUNAFIL', desc: 'Evaluación continua de 47 indicadores. Sabes exactamente dónde te vas a caer en una inspección.', ref: 'Tiempo real' },
  { tag: 'Portal', title: 'Mi-portal del trabajador', desc: 'App-like para que el trabajador firme, descargue boletas, pida vacaciones y vea su ID digital. Sin papeles.', ref: 'iOS · Android · Web' },
] as const

const TESTIMONIALS = [
  {
    quote: 'Pasamos de tener un Excel maldito de 8,000 filas a un sistema donde todos saben qué firmar y cuándo. La inspección de SUNAFIL la pasamos sin sudar.',
    name: 'Lucía Vargas',
    role: 'Gerente de RRHH · Constructora Andina (240 trabajadores)',
    initial: 'L',
  },
  {
    quote: 'Recuperamos S/ 24,000 al año en multas que veníamos pagando por capacitaciones SST vencidas. En tres meses se pagó solo.',
    name: 'Rodrigo Salas',
    role: 'CFO · Estrella Foods Perú',
    initial: 'R',
  },
  {
    quote: 'Mis chicos en obra usan el portal desde el celular. Firman su boleta antes de irme yo. Eso no lo había logrado con ningún otro sistema.',
    name: 'Mario Quispe',
    role: 'Jefe de Operaciones · Servipack Logística',
    initial: 'M',
  },
] as const

const FAQS = [
  {
    q: '¿Comply360 cumple con la legislación laboral peruana?',
    a: 'Sí. Toda la plataforma está construida sobre el marco legal peruano: Ley 29783 (SST), D.S. 003-97-TR (LPCL), Ley 27942 (hostigamiento), Ley 31806 (protección al denunciante), entre otros. Nuestro equipo legal revisa los cambios normativos cada mes y actualiza la plataforma sin costo.',
  },
  {
    q: '¿Cuánto demora la implementación?',
    a: 'Dos semanas en promedio para empresas Empresa/Pro. Migramos tu data desde Excel, planillas o tu sistema actual; configuramos roles, organigrama y políticas; y capacitamos a tu equipo. No te dejamos solo después del kickoff.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Datos encriptados en tránsito y en reposo, hosteados en infraestructura cloud Tier 1. Cumplimos con la Ley 29733 de Protección de Datos Personales y aplicamos buenas prácticas ISO 27001. Auditorías de seguridad periódicas.',
  },
  {
    q: '¿Qué pasa si SUNAFIL me visita?',
    a: 'Tienes el expediente listo. Cada acción en Comply360 queda con sello de tiempo, hash y huella del responsable. Generas el reporte para el inspector con un clic.',
  },
  {
    q: '¿Funciona si tengo trabajadores en obra o de campo?',
    a: 'Es para lo que está hecho. Marcaje con GPS y geofencing, app que funciona offline y sincroniza al recuperar señal, firmas con huella desde el celular. Construcción, minería, agro y logística son nuestros sectores fuertes.',
  },
  {
    q: '¿Puedo migrar mis boletas históricas?',
    a: 'Sí, sin costo extra en cualquier plan. Te subimos hasta 5 años de histórico de boletas, contratos y capacitaciones para que tengas todo el legajo digital desde el día 1.',
  },
  {
    q: '¿Tienen integración con SUNAT y MTPE?',
    a: 'Sí. Generamos PLAME automáticamente y registramos contratos electrónicamente ante MTPE. También integramos con tu ERP (SAP, Oracle) o tu sistema contable.',
  },
] as const

// ============================================================================
// Page component
// ============================================================================
export default function LandingPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [roleHome, setRoleHome] = useState<'/dashboard' | '/mi-portal'>('/dashboard')

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: string } | null) => {
        if (cancelled || !data) return
        if (data.role === 'WORKER') {
          setRoleHome('/mi-portal')
          router.replace('/mi-portal')
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isSignedIn, router])

  const ctaHref = isSignedIn ? roleHome : '/sign-up'
  const handleCtaClick = useCallback((cta: string) => (e: React.MouseEvent) => {
    track('landing_cta_clicked', { cta, signed_in: isSignedIn ?? false })
    if (isSignedIn) { e.preventDefault(); router.push(roleHome) }
  }, [isSignedIn, roleHome, router])

  // 3 planes destacados de PLANS — Starter / Empresa (featured) / Pro.
  // Mantenemos PLANS como fuente de verdad para pricing y features.
  const featuredPlans = [PLANS.STARTER, PLANS.EMPRESA, PLANS.PRO] as const

  return (
    <div style={{ fontFamily: fontSans, background: '#fafbfa', color: ink }}>
      {/* ============== NAV ============== */}
      <Nav isSignedIn={isSignedIn} ctaHref={ctaHref} roleHome={roleHome} onCtaClick={handleCtaClick('nav_demo')} />

      {/* ============== HERO ============== */}
      <Hero ctaHref={ctaHref} onCtaClick={handleCtaClick('hero_demo')} />

      {/* ============== LOGO STRIP ============== */}
      <LogoStrip />

      {/* ============== PILARES ============== */}
      <Pillars />

      {/* ============== STATS DARK ============== */}
      <StatsDark />

      {/* ============== MÓDULOS ============== */}
      <Modules />

      {/* ============== TESTIMONIOS ============== */}
      <Testimonials />

      {/* ============== PRICING ============== */}
      <Pricing
        plans={featuredPlans}
        ctaHref={ctaHref}
        onCtaClick={handleCtaClick('pricing_card')}
        isSignedIn={isSignedIn}
      />

      {/* ============== FAQ ============== */}
      <Faq />

      {/* ============== CTA FINAL ============== */}
      <FinalCta ctaHref={ctaHref} onCtaClick={handleCtaClick('final_demo')} isSignedIn={isSignedIn} />

      {/* ============== FOOTER ============== */}
      <Footer />
    </div>
  )
}

// ============================================================================
// NAV
// ============================================================================
function Nav({
  isSignedIn,
  ctaHref,
  roleHome,
  onCtaClick,
}: {
  isSignedIn: boolean | undefined
  ctaHref: string
  roleHome: string
  onCtaClick: (e: React.MouseEvent) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(250,251,250,0.85)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: '0.5px solid transparent',
      }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 sm:px-8" style={{ paddingTop: 22, paddingBottom: 22 }}>
        <Link href="/" className="flex items-center gap-2.5" style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em' }}>
          <BrandShield size={26} />
          <span>Comply<span style={{ color: 'var(--emerald-600)' }}>360</span></span>
        </Link>

        <nav className="hidden lg:flex items-center" style={{ gap: 32, fontSize: 14, color: ink2 }}>
          <a href="#producto" className="hover:text-slate-900 transition-colors">Producto</a>
          <a href="#modulos" className="hover:text-slate-900 transition-colors">Módulos</a>
          <a href="#clientes" className="hover:text-slate-900 transition-colors">Clientes</a>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
        </nav>

        <div className="hidden lg:flex items-center" style={{ gap: 10 }}>
          <Link
            href={isSignedIn ? roleHome : '/sign-in'}
            style={{ color: ink2, fontSize: 14, fontWeight: 500, padding: '10px 14px' }}
            className="hover:text-slate-900 transition-colors"
          >
            {isSignedIn ? (roleHome === '/mi-portal' ? 'Mi portal' : 'Mi dashboard') : 'Iniciar sesión'}
          </Link>
          <Link href={ctaHref} onClick={onCtaClick} className="btn-primary-editorial">
            {isSignedIn ? 'Ir al producto' : 'Solicitar demo'}
          </Link>
        </div>

        <button
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t" style={{ borderColor: line, background: '#fafbfa', padding: '12px 20px 20px' }}>
          {[['Producto', '#producto'], ['Módulos', '#modulos'], ['Clientes', '#clientes'], ['Precios', '#precios'], ['FAQ', '#faq']].map(([l, h]) => (
            <a key={h} href={h} onClick={() => setMobileOpen(false)} className="block" style={{ padding: '12px 0', fontSize: 15, color: ink2 }}>{l}</a>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href={isSignedIn ? roleHome : '/sign-in'} className="text-center" style={{ padding: '12px', borderRadius: 10, border: `0.5px solid ${lineStrong}`, fontSize: 14, fontWeight: 500 }}>
              {isSignedIn ? 'Ir al producto' : 'Iniciar sesión'}
            </Link>
            <Link href={ctaHref} onClick={onCtaClick} className="btn-primary-editorial text-center" style={{ width: '100%', justifyContent: 'center' }}>
              {isSignedIn ? 'Ir al producto' : 'Solicitar demo'}
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.btn-primary-editorial) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${ink};
          color: #fff;
          font-weight: 500;
          font-size: 14px;
          padding: 10px 18px;
          border-radius: 10px;
          border: 0.5px solid transparent;
          box-shadow: 0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        :global(.btn-primary-editorial:hover) {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(15,23,42,0.18);
        }
      `}</style>
    </header>
  )
}

function BrandShield({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="navg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z" fill="url(#navg)" />
      <path d="M22 32 L29 39 L43 23" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ============================================================================
// HERO
// ============================================================================
function Hero({ ctaHref, onCtaClick }: { ctaHref: string; onCtaClick: (e: React.MouseEvent) => void }) {
  return (
    <section style={{ position: 'relative', padding: '60px 0 40px', overflow: 'hidden' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.10), transparent 70%), radial-gradient(ellipse 80% 40% at 80% 20%, rgba(52,211,153,0.06), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8" style={{ position: 'relative', textAlign: 'center', paddingTop: 30 }}>
        <Eyebrow style={{ marginBottom: 28 }}>Hecho para el Perú · SUNAFIL · MTPE</Eyebrow>

        <h1
          style={{
            fontFamily: fontSerif,
            fontSize: 'clamp(48px, 9vw, 116px)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            margin: '0 0 28px',
            color: ink,
          }}
        >
          Cumplimiento laboral,<br />
          <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>sin estrés ni multas.</em>
        </h1>

        <p style={{
          fontSize: 'clamp(17px, 1.4vw, 20px)',
          color: ink2,
          lineHeight: 1.55,
          maxWidth: '64ch',
          margin: '0 auto',
        }}>
          Comply360 unifica planilla, SST, contratos, capacitaciones y el portal del trabajador en una sola plataforma — auditable, peruana y lista para SUNAFIL.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginTop: 36 }}>
          <Link href={ctaHref} onClick={onCtaClick} className="btn-lg-editorial-primary inline-flex items-center justify-center" style={{ gap: 8 }}>
            Solicitar demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <a href="#producto" className="btn-lg-editorial-secondary inline-flex items-center justify-center">Ver el producto</a>
        </div>

        <div className="flex flex-wrap items-center justify-center" style={{ gap: 18, marginTop: 28, fontSize: 13, color: ink3 }}>
          {['Implementación en 2 semanas', 'Soporte humano en Lima', 'Datos protegidos · Ley 29733'].map((label, i) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {label}
              {i < 2 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: muted, marginLeft: 18 }} />}
            </span>
          ))}
        </div>

        <HeroProductPreview />
      </div>

      <style jsx>{`
        :global(.btn-lg-editorial-primary) {
          background: ${ink};
          color: #fff;
          font-weight: 500;
          font-size: 15px;
          padding: 14px 24px;
          border-radius: 12px;
          border: 0.5px solid transparent;
          box-shadow: 0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        :global(.btn-lg-editorial-primary:hover) {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(15,23,42,0.18);
        }
        :global(.btn-lg-editorial-secondary) {
          background: #fff;
          color: ${ink};
          font-weight: 500;
          font-size: 15px;
          padding: 14px 24px;
          border-radius: 12px;
          border: 0.5px solid ${lineStrong};
          box-shadow: 0 1px 2px rgba(15,23,42,0.05);
          transition: background 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }
        :global(.btn-lg-editorial-secondary:hover) {
          background: #fff;
          border-color: rgba(15,23,42,0.22);
        }
      `}</style>
    </section>
  )
}

function HeroProductPreview() {
  return (
    <div
      style={{
        margin: '80px auto 0',
        maxWidth: 1140,
        background: '#fff',
        borderRadius: 20,
        border: `0.5px solid ${line}`,
        boxShadow:
          '0 40px 80px -20px rgba(15,23,42,0.20), 0 16px 32px -8px rgba(15,23,42,0.10), inset 0 0 0 1px rgba(255,255,255,0.7)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="hidden md:grid" style={{ gridTemplateColumns: '240px 1fr', minHeight: 520 }}>
        {/* Sidebar */}
        <div style={{ background: 'linear-gradient(180deg,#fafbfa,#f4f7f5)', borderRight: '0.5px solid rgba(15,23,42,0.06)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#34d399,#047857)', display: 'grid', placeItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Comply<span style={{ color: '#059669' }}>360</span></div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, padding: '0 8px', marginTop: 8 }}>Principal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SidebarItem active label="Dashboard" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>} />
            <SidebarItem label="Trabajadores" badge="247" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
            <SidebarItem label="Alertas" alertBadge={3} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>} />
            <SidebarItem label="Diagnóstico" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
            <SidebarItem label="Calendario" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
          </div>
        </div>

        {/* Main */}
        <div style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Constructora Andina · Mar 2026</div>
              <div style={{ fontFamily: fontSerif, fontSize: 28, letterSpacing: '-0.025em', marginTop: 4 }}>
                Tu cumplimiento, <em style={{ fontStyle: 'italic', color: '#047857' }}>al día</em>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'linear-gradient(135deg,#ecfdf5,#fff)', border: '0.5px solid rgba(16,185,129,0.3)', padding: '6px 12px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>Auditable</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            <KpiCard label="Score SUNAFIL" value="94" suffix="/100" valueColor="#047857" trend="↑ 8 pts vs. feb" trendColor="#10b981" />
            <KpiCard label="Multas evitadas" value="38k" prefix="S/" trend="en últimos 12 meses" />
            <KpiCard label="Trabajadores activos" value="247" trend="+12 este mes" />
          </div>

          <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fff)', border: '0.5px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>3 capacitaciones SST vencen en 5 días</div>
              <div style={{ fontSize: 11.5, color: ink2, marginTop: 1 }}>Ley 29783 — afecta a 12 trabajadores en obra Ate</div>
            </div>
            <button style={{ padding: '6px 12px', borderRadius: 8, background: '#fff', border: '0.5px solid rgba(15,23,42,0.15)', fontSize: 11.5, fontWeight: 600 }}>Resolver</button>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Cumplimiento mensual</div>
              <div style={{ fontSize: 11, color: muted, fontFamily: fontMono }}>12 últimos meses</div>
            </div>
            <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0 60 L33 50 L66 55 L100 40 L133 45 L166 30 L200 35 L233 25 L266 20 L300 22 L333 14 L366 10 L400 8 L400 80 L0 80 Z" fill="url(#chartg)" />
              <path d="M0 60 L33 50 L66 55 L100 40 L133 45 L166 30 L200 35 L233 25 L266 20 L300 22 L333 14 L366 10 L400 8" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="400" cy="8" r="4" fill="#fff" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Mobile preview — tarjeta sintética */}
      <div className="md:hidden" style={{ padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <KpiCard label="Score SUNAFIL" value="94" suffix="/100" valueColor="#047857" trend="↑ 8 pts" trendColor="#10b981" />
          <KpiCard label="Multas evitadas" value="38k" prefix="S/" trend="últimos 12 meses" />
          <KpiCard label="Trabajadores" value="247" trend="+12 este mes" />
        </div>
      </div>
    </div>
  )
}

function SidebarItem({ active, label, icon, badge, alertBadge }: { active?: boolean; label: string; icon: React.ReactNode; badge?: string; alertBadge?: number }) {
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      padding: '8px 10px',
      borderRadius: 8,
      background: active ? 'linear-gradient(90deg,rgba(16,185,129,0.10),transparent)' : undefined,
      color: active ? '#047857' : '#475569',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
    }}>
      {icon}
      <span style={{ textAlign: 'left', flex: 1 }}>{label}</span>
      {badge && <span style={{ fontFamily: fontMono, fontSize: 11, color: muted }}>{badge}</span>}
      {alertBadge && <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>{alertBadge}</span>}
    </div>
  )
}

function KpiCard({ label, value, prefix, suffix, valueColor, trend, trendColor }: { label: string; value: string; prefix?: string; suffix?: string; valueColor?: string; trend?: string; trendColor?: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', textAlign: 'left' }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: muted }}>{label}</div>
      <div style={{ fontFamily: fontSerif, fontSize: 36, letterSpacing: '-0.03em', color: valueColor ?? ink, marginTop: 4, lineHeight: 1 }}>
        {prefix && <span style={{ color: muted, fontSize: 18 }}>{prefix} </span>}
        {value}
        {suffix && <span style={{ fontSize: 18, color: muted }}>{suffix}</span>}
      </div>
      {trend && <div style={{ fontSize: 11, color: trendColor ?? muted, marginTop: 4, fontWeight: trendColor ? 600 : 400 }}>{trend}</div>}
    </div>
  )
}

// ============================================================================
// Shared eyebrow + section head
// ============================================================================
function Eyebrow({ children, style, dark }: { children: React.ReactNode; style?: React.CSSProperties; dark?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: dark ? '#6ee7b7' : 'var(--emerald-700)',
      fontFamily: fontSans,
      ...style,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dark ? '#34d399' : 'var(--emerald-500)', boxShadow: dark ? '0 0 0 4px rgba(52,211,153,0.2)' : '0 0 0 4px rgba(16,185,129,0.18)' }} />
      {children}
    </span>
  )
}

function SectionHead({ eyebrow, title, lead, dark }: { eyebrow: string; title: React.ReactNode; lead?: string; dark?: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 72, maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
      <Eyebrow dark={dark} style={{ marginBottom: 20 }}>{eyebrow}</Eyebrow>
      <h2 style={{
        fontFamily: fontSerif,
        fontSize: 'clamp(36px, 5.5vw, 72px)',
        fontWeight: 400,
        lineHeight: 1.02,
        letterSpacing: '-0.03em',
        margin: '0 0 20px',
        color: dark ? '#fff' : ink,
      }}>{title}</h2>
      {lead && <p style={{ fontSize: 'clamp(17px, 1.4vw, 20px)', color: dark ? '#cbd5e1' : ink2, lineHeight: 1.55, maxWidth: '64ch', margin: '18px auto 0' }}>{lead}</p>}
    </div>
  )
}

// ============================================================================
// LOGO STRIP
// ============================================================================
function LogoStrip() {
  const logos: Array<[string, React.ReactNode]> = [
    ['Andina', <svg key="andina" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 18l3-3 4 2 5-5 6 4"/><circle cx="9" cy="9" r="2"/></svg>],
    ['Mitsui Perú', <svg key="mitsui" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></svg>],
    ['Globalpe', <svg key="global" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>],
    ['Estrella Foods', <svg key="estrella" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 2 3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>],
    ['Servipack', <svg key="servipack" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>],
    ['VitalCorp', <svg key="vital" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l3-9 6 18 3-9h4"/></svg>],
  ]
  return (
    <section id="clientes" style={{ padding: '60px 0 40px', borderTop: `0.5px solid ${line}`, borderBottom: `0.5px solid ${line}`, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.6))' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, marginBottom: 36 }}>
          Más de 340 empresas peruanas confían en Comply360
        </div>
        <div className="grid items-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 24 }}>
          {logos.map(([name, icon]) => (
            <div key={name} className="logo-mark" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: fontSerif,
              fontSize: 22,
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              color: ink3,
              opacity: 0.75,
              transition: 'opacity 0.2s ease',
            }}>
              {icon}
              {name}
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        :global(.logo-mark:hover) { opacity: 1 !important; color: ${ink} !important; }
      `}</style>
    </section>
  )
}

// ============================================================================
// PILARES
// ============================================================================
function Pillars() {
  const pillars = [
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
      title: 'Auditoría siempre lista',
      desc: 'Cada acción queda registrada con hash, IP y huella digital del trabajador. Cuando llegue SUNAFIL, ya tendrás el expediente armado.',
      foot: 'SUNAFIL · MTPE · D.S. 010-2003-TR',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      title: 'Alertas que llegan a tiempo',
      desc: 'Vencimientos de capacitaciones, contratos a término y exámenes médicos te avisan antes de que se conviertan en multa. No después.',
      foot: '+ Email · WhatsApp · Slack',
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      title: 'Portal que el trabajador sí usa',
      desc: 'Boletas, vacaciones, capacitaciones y firma digital desde el celular. Sin instalar apps, sin chambear con papelitos.',
      foot: 'iOS · Android · Web',
    },
  ]
  return (
    <section id="producto" style={{ padding: '120px 0' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHead
          eyebrow="Producto"
          title={<>Una plataforma. <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>Todo el ciclo laboral.</em></>}
          lead="Reemplaza Excel, archivos en Drive y los cinco sistemas que nadie quiere abrir. Comply360 conecta lo que SUNAFIL te pide con lo que tu equipo realmente hace."
        />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {pillars.map((p) => (
            <div key={p.title} className="pillar-card" style={{
              background: '#fff',
              border: `0.5px solid ${line}`,
              borderRadius: 20,
              padding: '32px 28px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--emerald-50), #fff)',
                border: '0.5px solid var(--emerald-200)',
                color: 'var(--emerald-700)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 22,
              }}>{p.icon}</div>
              <div style={{ fontFamily: fontSerif, fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>{p.title}</div>
              <div style={{ fontSize: 15, color: ink2, lineHeight: 1.55, marginBottom: 18 }}>{p.desc}</div>
              <div style={{ fontFamily: fontMono, fontSize: 11, color: muted, letterSpacing: '0.02em', paddingTop: 16, borderTop: `0.5px solid ${line}` }}>{p.foot}</div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        :global(.pillar-card:hover) {
          transform: translateY(-2px);
          border-color: var(--emerald-200);
          box-shadow: 0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
        }
      `}</style>
    </section>
  )
}

// ============================================================================
// STATS DARK
// ============================================================================
function StatsDark() {
  const stats: Array<[React.ReactNode, string]> = [
    [<><em key="x" style={{ color: '#6ee7b7', fontStyle: 'italic' }}>340+</em></>, 'empresas peruanas operando con Comply360'],
    [<>S/ <em key="x" style={{ color: '#6ee7b7', fontStyle: 'italic' }}>12M</em></>, 'en multas SUNAFIL evitadas en 2025'],
    [<><em key="x" style={{ color: '#6ee7b7', fontStyle: 'italic' }}>96<span style={{ fontSize: '0.6em' }}>%</span></em></>, 'de capacitaciones SST completadas a tiempo'],
    [<><em key="x" style={{ color: '#6ee7b7', fontStyle: 'italic' }}>2</em> sem</>, 'de implementación promedio, con tu data migrada'],
  ]
  return (
    <section style={{ padding: '120px 0', background: 'linear-gradient(180deg, var(--emerald-950) 0%, #051f1a 100%)', color: '#e2e8f0' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHead
          dark
          eyebrow="Resultados"
          title={<>Cumplir <em style={{ color: '#6ee7b7', fontStyle: 'italic' }}>se siente</em> distinto.</>}
        />
        <div className="grid text-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
          {stats.map(([num, label], i) => (
            <div key={i}>
              <div style={{ fontFamily: fontSerif, fontSize: 'clamp(48px, 7vw, 92px)', letterSpacing: '-0.04em', lineHeight: 0.95, color: '#fff', marginBottom: 12 }}>
                {num}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.45 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// MÓDULOS
// ============================================================================
function Modules() {
  return (
    <section id="modulos" style={{ padding: '120px 0', background: 'linear-gradient(180deg, #f4f7f5, #fff)' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHead
          eyebrow="Módulos"
          title={<>Cubre <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>todo lo que SUNAFIL pregunta.</em></>}
          lead="Activa solo lo que necesitas hoy. Activa el resto cuando crezcas."
        />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {MODULES.map((m) => (
            <div key={m.title} className="module-card" style={{
              background: '#fff',
              border: `0.5px solid ${line}`,
              borderRadius: 14,
              padding: '24px 22px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                display: 'inline-block',
                fontFamily: fontMono,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--emerald-700)',
                background: 'var(--emerald-50)',
                border: '0.5px solid var(--emerald-200)',
                padding: '3px 8px',
                borderRadius: 6,
                marginBottom: 16,
              }}>{m.tag}</div>
              <div style={{ fontFamily: fontSerif, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.15 }}>{m.title}</div>
              <div style={{ fontSize: 13.5, color: ink2, lineHeight: 1.5, marginBottom: 16 }}>{m.desc}</div>
              <div style={{ fontFamily: fontMono, fontSize: 10.5, color: muted, letterSpacing: '0.02em', paddingTop: 12, borderTop: `0.5px solid ${line}` }}>{m.ref}</div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        :global(.module-card:hover) {
          border-color: var(--emerald-300);
          background: linear-gradient(180deg, var(--emerald-50) 0%, #fff 80%);
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  )
}

// ============================================================================
// TESTIMONIOS
// ============================================================================
function Testimonials() {
  return (
    <section style={{ padding: '120px 0' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHead
          eyebrow="Clientes"
          title={<>Lo que dicen <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>quienes ya cumplen.</em></>}
        />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="tcard" style={{
              background: '#fff',
              border: `0.5px solid ${line}`,
              borderRadius: 20,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ fontFamily: fontSerif, fontSize: 22, lineHeight: 1.35, letterSpacing: '-0.015em', color: ink, marginBottom: 28, flex: 1 }}>
                <span style={{ fontSize: 56, lineHeight: 0, verticalAlign: '-0.18em', color: 'var(--emerald-300)', marginRight: 4 }}>&ldquo;</span>
                {t.quote}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: `0.5px solid ${line}` }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--emerald-300), var(--emerald-700))', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: fontSerif, fontSize: 18, fontStyle: 'italic', flexShrink: 0 }}>
                  {t.initial}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: ink3, marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        :global(.tcard:hover) {
          box-shadow: 0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  )
}

// ============================================================================
// PRICING
// ============================================================================
type PlanCard = (typeof PLANS)[keyof typeof PLANS]

function Pricing({
  plans,
  ctaHref,
  onCtaClick,
  isSignedIn,
}: {
  plans: readonly PlanCard[]
  ctaHref: string
  onCtaClick: (e: React.MouseEvent) => void
  isSignedIn: boolean | undefined
}) {
  return (
    <section id="precios" style={{ padding: '120px 0', background: 'linear-gradient(180deg, #f4f7f5, #fff)' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHead
          eyebrow="Precios"
          title={<>Empieza pequeño. <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>Crece tranquilo.</em></>}
          lead="Precios en soles, sin sorpresas. Todos los planes incluyen soporte humano en Lima e implementación."
        />
        <div className="grid items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {plans.map((plan) => {
            const featured = plan.key === 'EMPRESA'
            return <PricingCard key={plan.key} plan={plan} featured={featured} ctaHref={ctaHref} onCtaClick={onCtaClick} isSignedIn={isSignedIn} />
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: muted, marginTop: 28 }}>
          ¿Necesitas más? <Link href="#cta" style={{ color: 'var(--emerald-700)', fontWeight: 600 }}>Conversemos sobre Enterprise</Link> · empresas con +750 trabajadores u holdings.
        </p>
      </div>
    </section>
  )
}

function PricingCard({
  plan,
  featured,
  ctaHref,
  onCtaClick,
  isSignedIn,
}: {
  plan: PlanCard
  featured: boolean
  ctaHref: string
  onCtaClick: (e: React.MouseEvent) => void
  isSignedIn: boolean | undefined
}) {
  return (
    <div style={{
      background: featured ? 'linear-gradient(180deg, var(--emerald-950), #051f1a)' : '#fff',
      color: featured ? '#e2e8f0' : ink,
      border: featured ? '0.5px solid var(--emerald-700)' : `0.5px solid ${line}`,
      borderRadius: 20,
      padding: '36px 30px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: featured ? '0 8px 24px -4px rgba(16,185,129,0.25), 0 24px 48px -8px rgba(4,78,55,0.40)' : undefined,
      transform: featured ? 'translateY(-8px)' : undefined,
    }}>
      {featured && (
        <div style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--emerald-400)',
          color: 'var(--emerald-950)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '5px 12px',
          borderRadius: 999,
          fontFamily: fontSans,
        }}>Más popular</div>
      )}
      <div style={{
        fontFamily: fontMono,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: featured ? 'var(--emerald-300)' : ink3,
        marginBottom: 18,
      }}>{plan.name}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontFamily: fontSerif, marginBottom: 16 }}>
        {plan.isCustomQuote ? (
          <span style={{ fontSize: 42, letterSpacing: '-0.04em', lineHeight: 1, color: featured ? '#fff' : ink }}>A medida</span>
        ) : (
          <>
            <span style={{ fontSize: 22, color: featured ? 'var(--emerald-300)' : ink3 }}>S/</span>
            <span style={{ fontSize: 64, letterSpacing: '-0.04em', lineHeight: 1, color: featured ? '#fff' : ink }}>{plan.price.toLocaleString('es-PE')}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: featured ? 'var(--emerald-300)' : ink3, marginLeft: 6 }}>/ mes</span>
          </>
        )}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.5, color: featured ? '#cbd5e1' : ink2, marginBottom: 28 }}>
        {plan.key === 'STARTER' && 'Para PYMEs hasta 20 trabajadores que recién están ordenando su cumplimiento.'}
        {plan.key === 'EMPRESA' && 'Para empresas en crecimiento que quieren cubrir todo el cumplimiento sin contratar más gente.'}
        {plan.key === 'PRO' && 'Para empresas medianas con equipos en obra/campo, IA legal y portal del trabajador con firma biométrica.'}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {plan.features.slice(0, 6).map((f: string) => (
          <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: featured ? '#e2e8f0' : ink2, lineHeight: 1.45 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={featured ? 'var(--emerald-300)' : 'var(--emerald-600)'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        onClick={onCtaClick}
        style={{
          width: '100%',
          textAlign: 'center',
          padding: '14px 24px',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 500,
          background: featured ? 'var(--emerald-400)' : ink,
          color: featured ? 'var(--emerald-950)' : '#fff',
          boxShadow: '0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
          transition: 'transform 0.15s ease, background 0.15s ease',
        }}
      >
        {isSignedIn ? 'Ir al producto' : featured ? 'Solicitar demo' : 'Empezar'}
      </Link>
    </div>
  )
}

// ============================================================================
// FAQ
// ============================================================================
function Faq() {
  return (
    <section id="faq" style={{ padding: '120px 0' }}>
      <div className="mx-auto max-w-[820px] px-5 sm:px-8">
        <SectionHead
          eyebrow="Preguntas frecuentes"
          title={<>Lo que <em style={{ color: 'var(--emerald-700)', fontStyle: 'italic' }}>todos preguntan.</em></>}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ borderTop: `0.5px solid ${line}`, padding: '24px 0' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: fontSerif,
          fontSize: 'clamp(18px, 2vw, 24px)',
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
          color: ink,
          textAlign: 'left',
        }}
      >
        <span>{q}</span>
        <span style={{ width: 18, height: 18, marginLeft: 24, flexShrink: 0, color: 'var(--emerald-500)', display: 'inline-flex', transition: 'transform 0.2s ease' }}>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </span>
      </button>
      {open && (
        <div style={{ paddingTop: 16, fontSize: 16, color: ink2, lineHeight: 1.6, maxWidth: '70ch' }}>{a}</div>
      )}
    </div>
  )
}

// ============================================================================
// FINAL CTA
// ============================================================================
function FinalCta({ ctaHref, onCtaClick, isSignedIn }: { ctaHref: string; onCtaClick: (e: React.MouseEvent) => void; isSignedIn: boolean | undefined }) {
  return (
    <section id="cta" style={{ padding: '120px 0' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, var(--emerald-950) 0%, #042820 50%, #051f1a 100%)',
          borderRadius: 28,
          padding: 'clamp(60px, 8vw, 100px) clamp(28px, 4vw, 60px)',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div aria-hidden style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(52,211,153,0.20), transparent 70%), radial-gradient(ellipse 50% 60% at 100% 100%, rgba(16,185,129,0.15), transparent 70%), radial-gradient(ellipse 50% 60% at 0% 100%, rgba(110,231,183,0.10), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <Eyebrow dark>Da el primer paso</Eyebrow>
            <h2 style={{
              fontFamily: fontSerif,
              fontSize: 'clamp(36px, 5.5vw, 72px)',
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: '#fff',
              marginTop: 14,
              marginBottom: 20,
            }}>
              Cumplir <em style={{ color: 'var(--emerald-300)', fontStyle: 'italic' }}>nunca fue</em><br />tan simple.
            </h2>
            <p style={{ fontSize: 'clamp(17px, 1.4vw, 19px)', color: '#cbd5e1', maxWidth: '56ch', margin: '0 auto 36px', lineHeight: 1.55 }}>
              Agenda una demo de 30 minutos. Te mostramos exactamente cómo Comply360 se vería en tu empresa. Sin compromiso, sin tarjeta.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={ctaHref}
                onClick={onCtaClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'var(--emerald-400)',
                  color: 'var(--emerald-950)',
                  fontWeight: 600,
                  fontSize: 15,
                  padding: '14px 24px',
                  borderRadius: 12,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 8px 24px -4px rgba(16,185,129,0.45)',
                }}
              >
                {isSignedIn ? 'Ir al producto' : 'Solicitar demo gratis'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <a href="#contacto" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 500,
                fontSize: 15,
                padding: '14px 24px',
                borderRadius: 12,
                border: '0.5px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap',
              }}>Hablar con ventas</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  const cols: Array<[string, Array<[string, string]>]> = [
    ['Producto', [['Módulos', '#modulos'], ['Portal del trabajador', '/mi-portal'], ['Score SUNAFIL', '/diagnostico-gratis'], ['Calculadoras', '/calculadoras'], ['Precios', '#precios']]],
    ['Empresa', [['Sobre nosotros', '#'], ['Clientes', '#clientes'], ['Blog', '#'], ['Trabaja con nosotros', '#'], ['Contacto', '#contacto']]],
    ['Recursos', [['Centro de ayuda', '#'], ['Guía SUNAFIL 2026', '#'], ['Plantillas legales', '#'], ['Webinars', '#'], ['API docs', '#']]],
    ['Legal', [['Términos', '/terminos'], ['Privacidad', '/privacidad'], ['Cookies', '#'], ['Seguridad', '#']]],
  ]
  return (
    <footer id="contacto" style={{ background: '#fff', borderTop: `0.5px solid ${line}`, padding: '80px 0 32px' }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 48, marginBottom: 64 }}>
          <div style={{ gridColumn: 'span 1', minWidth: 220 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 17, marginBottom: 16 }}>
              <BrandShield size={22} />
              <span>Comply<span style={{ color: '#34d399' }}>360</span></span>
            </Link>
            <p style={{ fontSize: 14, color: ink3, lineHeight: 1.55, maxWidth: '32ch', margin: 0 }}>
              La plataforma de cumplimiento laboral hecha para empresas peruanas. Lima · Perú.
            </p>
          </div>
          {cols.map(([heading, items]) => (
            <div key={heading}>
              <div style={{ fontFamily: fontMono, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted, marginBottom: 20 }}>{heading}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} style={{ fontSize: 14, color: ink2, transition: 'color 0.15s ease' }} className="footer-link">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: `0.5px solid ${line}`, fontSize: 13, color: muted, fontFamily: fontMono, flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} Comply360 SAC · Lima, Perú</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/terminos" className="footer-link">Términos</Link>
            <Link href="/privacidad" className="footer-link">Privacidad</Link>
            <a href="#" className="footer-link">Cookies</a>
          </div>
        </div>
      </div>
      <style jsx>{`
        :global(.footer-link:hover) { color: var(--emerald-700) !important; }
      `}</style>
    </footer>
  )
}
