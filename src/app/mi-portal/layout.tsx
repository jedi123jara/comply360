'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  FileSignature,
  Clock,
} from 'lucide-react'
import { ConsentGate } from '@/components/legal/consent-modal'

/**
 * Layout del Portal del Trabajador — Mobile-first Emerald Light.
 *
 * Arquitectura visual:
 *  - Mobile (<lg): top bar con brand + notif bell + menu. Bottom nav de 5 tabs.
 *  - Desktop (>=lg): sidebar izquierda con nav completa + topbar fixed.
 *
 * 5 secciones principales (bottom nav mobile):
 *   Inicio · Documentos · Boletas · Solicitudes · Perfil
 *
 * Otras secciones (accesibles desde "Más" o sidebar desktop):
 *   Capacitaciones · RIT y Políticas · Canal denuncias · Notificaciones
 */

/** Nav principal — los 5 tabs del bottom nav (mobile) + sidebar core (desktop).
 *  "Asistencia" reemplaza a "Documentos" en el bottom nav porque es uso DIARIO.
 *  Documentos queda en la nav secundaria (drawer). */
const MAIN_NAV = [
  { href: '/mi-portal', label: 'Inicio', icon: Home },
  { href: '/mi-portal/asistencia', label: 'Asistencia', icon: Clock },
  { href: '/mi-portal/boletas', label: 'Boletas', icon: Receipt },
  { href: '/mi-portal/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { href: '/mi-portal/perfil', label: 'Perfil', icon: UserCircle },
] as const

/** Nav secundaria — visible en drawer mobile + sidebar desktop (sección "Más"). */
const SECONDARY_NAV = [
  { href: '/mi-portal/documentos', label: 'Documentos', icon: FileText },
  { href: '/mi-portal/contratos', label: 'Contratos', icon: FileSignature },
  { href: '/mi-portal/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { href: '/mi-portal/reglamento', label: 'RIT y Políticas', icon: BookOpen },
  { href: '/mi-portal/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/mi-portal/denuncias', label: 'Canal de Denuncias', icon: Shield },
] as const

export default function MiPortalLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname() ?? '/mi-portal'
  const { signOut } = useClerk()

  function isActive(href: string): boolean {
    if (href === '/mi-portal') return pathname === '/mi-portal'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    try {
      await signOut({ redirectUrl: '/sign-in' })
    } catch {
      window.location.assign('/sign-in')
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg-canvas,#ffffff)] text-[color:var(--text-primary)]">
      {/* ────────────────────────────────────────────────────────────── */}
      {/* TOP BAR (visible siempre, sticky)                              */}
      {/* ────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 lg:px-6 bg-white"
        style={{
          borderBottom: '0.5px solid var(--border-default)',
          backdropFilter: 'blur(8px)',
          background: 'rgba(255,255,255,0.92)',
        }}
      >
        {/* Mobile: brand compacto + toggle drawer secundario */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{
              background: 'linear-gradient(165deg, #059669 0%, #047857 55%, #065f46 100%)',
              boxShadow: '0 1px 2px rgba(4,120,87,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-gray-900">
              Comply<span className="text-emerald-700">360</span>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-700">
              Portal Trabajador
            </div>
          </div>
        </div>

        {/* Right: notif bell + más (drawer) */}
        <div className="flex items-center gap-1">
          <Link
            href="/mi-portal/notificaciones"
            aria-label="Notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[color:var(--neutral-50)] transition-colors"
          >
            <Bell className="h-4 w-4 text-[color:var(--text-secondary)]" />
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
        className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 bg-white overflow-y-auto"
        style={{ borderRight: '0.5px solid var(--border-default)' }}
      >
        <nav aria-label="Navegación principal" className="px-3 py-4 space-y-0.5">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          <div className="h-px bg-[color:var(--border-subtle)] my-3" />

          <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Más opciones
          </p>
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-red-50 hover:text-red-700 transition-colors"
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
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
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
        className="lg:pl-64 px-4 py-5 lg:px-8 lg:py-8 max-w-4xl mx-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)' /* bottom nav space on mobile */ }}
      >
        {/* ConsentGate obliga al trabajador a autorizar tratamiento de datos (Ley 29733 Art. 14) */}
        <ConsentGate scope="worker">{children}</ConsentGate>
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
                href={item.href}
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
