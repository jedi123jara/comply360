'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import {
  Home,
  FileText,
  Receipt,
  ClipboardList,
  UserCircle,
  Bell,
  LogOut,
  Menu,
  X,
  BookOpen,
  GraduationCap,
  Shield,
  ShieldCheck,
  FileSignature,
  Clock,
  MessageCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { ConsentGate } from '@/components/legal/consent-modal'
import { PendingAcksBanner } from '@/components/mi-portal/pending-acks-banner'

/**
 * Layout del Portal del Trabajador — Mobile-first Emerald Light.
 *
 * Arquitectura visual:
 *  - Mobile (<lg): top bar con brand + notif bell + menu. Bottom nav de 5 tabs.
 *  - Desktop (>=lg): sidebar izquierda con nav completa + topbar fixed.
 *
 * 5 secciones principales (bottom nav mobile):
 *   Inicio · Pulse · Asistencia · Boletas · Solicitudes
 *
 * Otras secciones (accesibles desde "Más" o sidebar desktop):
 *   Capacitaciones · RIT y Políticas · Canal denuncias · Notificaciones
 */

/** Nav principal — los 5 tabs del bottom nav (mobile) + sidebar core (desktop). */
const MAIN_NAV = [
  { href: '/mi-portal', label: 'Inicio', icon: Home },
  { href: '/mi-portal/pulse', label: 'Pulse', icon: Sparkles },
  { href: '/mi-portal/asistencia', label: 'Asistencia', icon: Clock },
  { href: '/mi-portal/boletas', label: 'Boletas', icon: Receipt },
  { href: '/mi-portal/solicitudes', label: 'Solicitudes', icon: ClipboardList },
] as const

/** Nav secundaria — visible en drawer mobile + sidebar desktop (sección "Más"). */
const SECONDARY_NAV = [
  { href: '/mi-portal/perfil', label: 'Perfil', icon: UserCircle },
  { href: '/mi-portal/documentos', label: 'Documentos', icon: FileText },
  { href: '/mi-portal/contratos', label: 'Contratos', icon: FileSignature },
  { href: '/mi-portal/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { href: '/mi-portal/reglamento', label: 'RIT y Políticas', icon: BookOpen },
  { href: '/mi-portal/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/mi-portal/denuncias', label: 'Canal de Denuncias', icon: Shield },
] as const

export default function MiPortalLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [roleGate, setRoleGate] = useState<'checking' | 'allowed' | 'wrong_role'>('checking')
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const pathname = usePathname() ?? '/mi-portal'
  const searchParams = useSearchParams()
  const router = useRouter()
  const { signOut } = useClerk()
  const isPublicAuth = pathname === '/mi-portal/registrarse' || pathname === '/mi-portal/ingresar'
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'
  const effectiveRoleGate = isWorkerPreview ? 'allowed' : roleGate

  useEffect(() => {
    if (isPublicAuth) return
    if (isWorkerPreview) return

    let cancelled = false

    fetch('/api/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          router.replace('/sign-in')
          return
        }

        const me = await res.json().catch(() => null) as { role?: string; workerId?: string | null } | null
        if (cancelled) return
        setCurrentRole(me?.role ?? null)

        if (me?.role === 'WORKER' || me?.workerId) {
          setRoleGate('allowed')
          return
        }

        setRoleGate('wrong_role')
      })
      .catch(() => {
        if (!cancelled) router.replace('/post-login')
      })

    return () => {
      cancelled = true
    }
  }, [isPublicAuth, isWorkerPreview, router])

  if (isPublicAuth) {
    return <>{children}</>
  }

  if (effectiveRoleGate !== 'allowed') {
    if (effectiveRoleGate === 'wrong_role') {
      return (
        <WorkerAccountMismatch
          role={currentRole}
          onWorkerLogin={() => signOut({ redirectUrl: '/mi-portal/ingresar' })}
        />
      )
    }

    return <WorkerPortalLoading />
  }

  function isActive(href: string): boolean {
    if (href === '/mi-portal') return pathname === '/mi-portal'
    return pathname.startsWith(href)
  }

  function withPreviewHref(href: string): string {
    return isWorkerPreview ? `${href}?__workerPreview=1` : href
  }

  async function handleLogout() {
    try {
      await signOut({ redirectUrl: '/sign-in' })
    } catch {
      window.location.assign('/sign-in')
    }
  }

  return (
    <div className="c360-worker-portal min-h-screen bg-[color:var(--bg-canvas,#ffffff)] text-[color:var(--text-primary)]">
      {/* Banner sticky de docs pendientes — solo aparece si hay alguno */}
      {isWorkerPreview ? null : <PendingAcksBanner />}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TOP BAR (visible siempre, sticky)                              */}
      {/* ────────────────────────────────────────────────────────────── */}
      <header
        className="c360-worker-topbar sticky top-0 z-40 flex h-20 items-center justify-between bg-white px-4 lg:fixed lg:left-72 lg:right-0 lg:h-20 lg:justify-end lg:px-8"
        style={{
          borderBottom: '0.5px solid var(--border-default)',
          backdropFilter: 'blur(8px)',
          background: 'rgba(255,255,255,0.92)',
        }}
      >
        {/* Mobile: brand compacto + toggle drawer secundario */}
        <div className="lg:hidden">
          <WorkerPortalBrand href={withPreviewHref('/mi-portal')} />
        </div>

        {/* Right: notif bell + más (drawer) */}
        <div className="flex items-center gap-2">
          <Link
            href={withPreviewHref('/mi-portal/notificaciones')}
            aria-label="Notificaciones"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-[color:var(--neutral-50)]"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              3
            </span>
          </Link>
          <Link
            href={withPreviewHref('/mi-portal/perfil')}
            aria-label="Mi perfil"
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-cyan-50 ring-1 ring-cyan-100 transition-transform hover:-translate-y-0.5 sm:flex"
          >
            <WorkerTopAvatar />
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[color:var(--neutral-50)] transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5 text-[color:var(--text-secondary)]" />
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* DESKTOP SIDEBAR                                                */}
      {/* ────────────────────────────────────────────────────────────── */}
      <aside
        className="c360-worker-sidebar fixed bottom-0 left-0 top-0 hidden w-72 overflow-y-auto bg-white lg:block"
        style={{ borderRight: '0.5px solid var(--border-default)' }}
      >
        <div className="px-6 pb-7 pt-8">
          <WorkerPortalBrand href={withPreviewHref('/mi-portal')} size="desktop" />
        </div>

        <nav aria-label="Navegación principal" className="space-y-1 px-5 pb-4">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={withPreviewHref(item.href)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    active ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)]'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Separator */}
          <div className="my-5 h-px bg-[color:var(--border-subtle)]" />

          <p className="mb-2 px-4 text-[10px] font-bold uppercase text-[color:var(--text-tertiary)]">
            Más opciones
          </p>
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={withPreviewHref(item.href)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    active ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)]'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer sidebar: logout */}
        <div className="absolute bottom-0 left-0 right-0 p-5" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-50 p-4 text-slate-700 ring-1 ring-cyan-100">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-bold text-slate-900">¿Necesitas ayuda?</strong>
              <small className="block text-xs font-medium text-slate-500">Estamos para apoyarte</small>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MOBILE DRAWER (secundario)                                     */}
      {/* ────────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col motion-fade-in-up"
            aria-label="Menú secundario"
          >
            <div className="flex items-center justify-between h-14 px-4" style={{ borderBottom: '0.5px solid var(--border-default)' }}>
              <p className="text-sm font-bold text-gray-900">Menú</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[color:var(--neutral-50)]"
              >
                <X className="h-5 w-5 text-[color:var(--text-secondary)]" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {[...MAIN_NAV, ...SECONDARY_NAV].map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={withPreviewHref(item.href)}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-[color:var(--text-primary)] hover:bg-[color:var(--neutral-50)]'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        active ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-[color:var(--text-secondary)] hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT                                                   */}
      {/* ────────────────────────────────────────────────────────────── */}
      <main
        className="c360-worker-main px-4 py-5 lg:ml-72 lg:px-7 lg:pb-8 lg:pt-28"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)' /* bottom nav space on mobile */ }}
      >
        <div className="c360-worker-main-inner mx-auto w-full max-w-[1420px]">
          {/* ConsentGate obliga al trabajador a autorizar tratamiento de datos (Ley 29733 Art. 14) */}
          <div className="c360-worker-route-shell">
            {isWorkerPreview ? children : <ConsentGate scope="worker">{children}</ConsentGate>}
          </div>
        </div>
      </main>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* BOTTOM TAB NAV (mobile only)                                   */}
      {/* ────────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación inferior"
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '0.5px solid var(--border-default)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid grid-cols-5 h-16">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={withPreviewHref(item.href)}
                className="flex flex-col items-center justify-center gap-0.5 relative"
                aria-current={active ? 'page' : undefined}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                    style={{ background: 'var(--emerald-600)' }}
                  />
                ) : null}
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? 'text-emerald-700' : 'text-[color:var(--text-tertiary)]'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold transition-colors ${
                    active ? 'text-emerald-700' : 'text-[color:var(--text-tertiary)]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function WorkerPortalBrand({
  href,
  size = 'mobile',
}: {
  href: string
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'

  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <span
        className={`grid flex-shrink-0 place-items-center rounded-2xl text-white ${
          isDesktop ? 'h-12 w-12' : 'h-11 w-11'
        }`}
        style={{
          background: 'linear-gradient(155deg, #2b6dff 0%, #14b8a6 54%, #0f766e 100%)',
          boxShadow: '0 10px 24px -16px rgba(37,99,235,0.9), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <ShieldCheck className={isDesktop ? 'h-7 w-7' : 'h-6 w-6'} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className={`${isDesktop ? 'text-[22px]' : 'text-[21px]'} block font-black text-slate-950`}>
          Comply<span className="text-emerald-600">360</span>
        </span>
        <span className={`${isDesktop ? 'text-[11px]' : 'text-[10px]'} block font-black uppercase text-teal-700`}>
          Portal Trabajador
        </span>
      </span>
    </Link>
  )
}

function WorkerTopAvatar() {
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-full bg-cyan-50">
      <Image
        src="/worker-portal/worker-avatar-ronald-reference.png"
        alt=""
        width={108}
        height={108}
        className="h-full w-full object-cover"
        draggable={false}
      />
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
    </span>
  )
}

function WorkerPortalLoading() {
  return (
    <div className="c360-worker-portal flex min-h-screen items-center justify-center bg-[color:var(--bg-canvas)] px-4 text-[color:var(--text-primary)]">
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white px-6 py-5 text-center shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-900">Preparando tu portal</p>
        <p className="mt-1 text-xs text-slate-500">Validando tu cuenta de trabajador...</p>
      </div>
    </div>
  )
}

function WorkerAccountMismatch({
  role,
  onWorkerLogin,
}: {
  role: string | null
  onWorkerLogin: () => void
}) {
  const dashboardHref = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'

  return (
    <div className="c360-worker-portal min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <section className="w-full rounded-2xl border border-amber-200 bg-white p-6 shadow-xl shadow-amber-100/50">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-amber-700">
                Cuenta empresarial activa
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Este navegador está usando el panel de la empresa.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                El portal del trabajador necesita una cuenta de trabajador. Para probar la invitación,
                entra por el acceso trabajador con el correo del trabajador invitado. Si este mismo
                correo tiene ficha laboral, Comply360 lo vinculará automáticamente.
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onWorkerLogin}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Cerrar sesión e ingresar como trabajador
                </button>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Volver al panel empresa
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
