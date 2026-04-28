'use client'

/**
 * DashboardShell — wrapper client del dashboard con interactividad global.
 *
 * Extraído del layout para:
 *   - Mantener providers anidados (Upgrade/Copilot/Calculator) en orden estable
 *   - Permitir que el layout futuro sea Server Component (Sprint 5+)
 *   - Aislar shortcuts globales (Cmd+I, sidebar Esc) a un solo componente
 *
 * Mantiene client-side:
 *   - Sidebar toggle (drawer mobile)
 *   - Command palette open state
 *   - Copilot drawer toggle
 *   - Verificación de onboarding completado (fetch /api/onboarding/progress)
 *
 * Mejora futura (Sprint 5+): mover el check de onboarding a Server Component
 * via query Prisma directa con `redirect()` de next/navigation. Pendiente de
 * tests E2E para no romper el flow de redirect.
 */

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './sidebar'
import Topbar from './topbar'
import { CommandPalette } from '@/components/ui/command-palette'
import { useCopilot } from '@/providers/copilot-provider'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import { EnableNotifications } from '@/components/pwa/enable-notifications'
import { TrialBanner } from '@/components/billing/trial-banner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NpsModal } from '@/components/feedback/nps-modal'
import { cn } from '@/lib/utils'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const copilot = useCopilot()
  const router = useRouter()
  const pathname = usePathname() ?? '/dashboard'

  // Onboarding + plan-gate redirect — verifica que la org haya:
  //  1. Completado el wizard de datos de empresa → /dashboard/onboarding
  //  2. Elegido un plan (trial o paid o FREE explícito) → /onboarding/elegir-plan
  //
  // Sin esto, el revenue leak: usuarios entraban directo al dashboard como
  // STARTER "regalado" sin que les pidiéramos elegir/pagar nunca.
  //
  // Mejora futura: mover este check a Server Component con redirect() server-side.
  useEffect(() => {
    // Whitelist de rutas que SIEMPRE deben ser accesibles incluso si
    // hasOrg=false o needsPlan=true. Sin esto, /dashboard/configuracion/
    // diagnostico (donde está el card de Cambiar plan + diagnostico de
    // bugs) queda bloqueado en chicken-and-egg cuando algo del onboarding
    // está mal — el founder NO puede acceder a la herramienta para resolverlo.
    const ALWAYS_ALLOWED = [
      '/dashboard/onboarding',
      '/dashboard/configuracion/diagnostico',
    ]
    if (ALWAYS_ALLOWED.some((path) => pathname.startsWith(path))) return

    fetch('/api/onboarding/progress')
      .then((r) => r.json())
      .then((data) => {
        if (!data) return
        if (data.hasOrg === false) {
          router.replace('/dashboard/onboarding')
          return
        }
        if (data.needsPlan === true) {
          router.replace('/onboarding/elegir-plan')
        }
      })
      .catch(() => {
        /* silent */
      })
  }, [pathname, router])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const openCommand = useCallback(() => setCommandOpen(true), [])

  // Global shortcuts: Cmd+I toggles copilot (Cmd+K is handled by CommandPalette)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        copilot.toggle()
      }
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copilot, sidebarOpen, closeSidebar])

  return (
    <div
      className={cn(
        'min-h-screen bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)]',
        'relative'
      )}
    >
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} onCommandK={openCommand} />

      {/* Content area — offset by sidebar width on desktop */}
      <div className="lg:pl-[var(--sidebar-width)] flex min-h-screen flex-col">
        <TrialBanner />
        <Topbar onMenuToggle={toggleSidebar} onCommandK={openCommand} />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <ErrorBoundary>
            <div className="mx-auto w-full max-w-[var(--content-max)]">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global overlays */}
      <CommandPalette openState={commandOpen} setOpenState={setCommandOpen} />
      <CopilotDrawer />
      <EnableNotifications variant="floating" />
      <NpsModal source="dashboard" />
    </div>
  )
}
