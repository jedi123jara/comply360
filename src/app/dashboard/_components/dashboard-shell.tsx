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

  // Onboarding redirect — check if org has completed onboarding
  useEffect(() => {
    if (pathname === '/dashboard/onboarding') return
    fetch('/api/onboarding/progress')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.hasOrg === false) {
          router.replace('/dashboard/onboarding')
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
