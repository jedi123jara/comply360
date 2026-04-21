'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './_components/sidebar'
import Topbar from './_components/topbar'
import { CommandPalette } from '@/components/ui/command-palette'
import { CopilotProvider, useCopilot } from '@/providers/copilot-provider'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import { EnableNotifications } from '@/components/pwa/enable-notifications'
import { UpgradeGateProvider } from '@/providers/upgrade-gate-provider'
import { TrialBanner } from '@/components/billing/trial-banner'
import { CalculatorDrawerProvider } from '@/components/ui/calculator-drawer'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ConsentGate } from '@/components/legal/consent-modal'
import { cn } from '@/lib/utils'

/**
 * Dashboard shell — Obsidian + Esmeralda, 3-pane layout.
 *
 * [sidebar 260px] | [main content] | [copilot drawer 380px, overlay]
 *
 * - Cmd/Ctrl+K → command palette
 * - Cmd/Ctrl+I → toggle AI copilot
 * - Mobile sidebar collapses to drawer
 * - Copilot is overlay-drawer (not permanent column) to preserve content width
 *
 * We wrap children in <CopilotProvider> here so every dashboard page can
 * `useCopilot()` without re-mounting.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UpgradeGateProvider>
      <CopilotProvider>
        <CalculatorDrawerProvider>
          {/* ConsentGate bloquea el dashboard hasta que el admin acepte T&C + privacidad + DPA */}
          <ConsentGate scope="org">
            <DashboardShell>{children}</DashboardShell>
          </ConsentGate>
        </CalculatorDrawerProvider>
      </CopilotProvider>
    </UpgradeGateProvider>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
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
    </div>
  )
}
