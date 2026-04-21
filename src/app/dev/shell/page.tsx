'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Command,
  ArrowRight,
  Users,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileText,
  Calculator,
  Bot,
} from 'lucide-react'
import Sidebar from '@/app/dashboard/_components/sidebar'
import Topbar from '@/app/dashboard/_components/topbar'
import { CommandPalette } from '@/components/ui/command-palette'
import { CopilotProvider, useCopilot } from '@/providers/copilot-provider'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'

/**
 * /dev/shell — Fase B showcase.
 *
 * Renders the new dashboard shell (sidebar 7 hubs + topbar + Cmd+K palette +
 * Cmd+I copilot drawer) on top of a sample Cockpit-like page so we can
 * visually validate the shell without needing to sign in.
 *
 * NOT part of production — the `/dev/*` route is dev-only per proxy.ts.
 */
export default function DevShell() {
  return (
    <CopilotProvider>
      <ShellBody />
    </CopilotProvider>
  )
}

function ShellBody() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const copilot = useCopilot()

  const openCommand = useCallback(() => setCommandOpen(true), [])

  // Keyboard shortcut: Cmd/Ctrl+I toggles the copilot. CommandPalette registers
  // Cmd/Ctrl+K on its own.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        copilot.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copilot])

  return (
    <div className="min-h-screen bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)] relative">

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCommandK={openCommand}
      />

      <div className="lg:pl-[var(--sidebar-width)] flex min-h-screen flex-col">
        <Topbar
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onCommandK={openCommand}
        />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[var(--content-max)] space-y-8">
            {/* Dev banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-3">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Fase B — Shell showcase</p>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Esta es una página de desarrollo que monta el sidebar, topbar, command palette y copilot
                  drawer sobre contenido demo. Abrí <kbd className="rounded border border-emerald-200 bg-emerald-50 px-1 font-mono text-[10px]">Cmd/Ctrl+K</kbd> y
                  {' '}<kbd className="rounded border border-emerald-200 bg-emerald-50 px-1 font-mono text-[10px]">Cmd/Ctrl+I</kbd>{' '}
                  para probar navegación e IA.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={openCommand} icon={<Command className="h-3.5 w-3.5" />}>
                    Abrir Command Palette
                  </Button>
                  <Button
                    size="sm"
                    variant={copilot.isOpen ? 'emerald-soft' : 'secondary'}
                    onClick={copilot.toggle}
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    {copilot.isOpen ? 'Cerrar copilot' : 'Abrir AI copilot'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                    asChild
                  >
                    <Link href="/dev/ui">Ver Design System →</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Hero: compliance narrative */}
            <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
              <Card variant="elevated" padding="lg" className="lg:self-stretch flex items-center justify-center min-h-[260px]">
                <ProgressRing value={87} size={200} stroke={14}>
                  <div className="text-center">
                    <div className="text-[56px] leading-none font-bold tracking-tight text-[color:var(--text-primary)]">
                      87
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                      Score compliance
                    </div>
                  </div>
                </ProgressRing>
              </Card>
              <div className="space-y-3">
                <Badge variant="emerald" size="sm" dot>
                  Hoy 17 abr, tu compliance subió
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight">
                  Semana con <span className="text-emerald-600">+5 puntos</span> y 3 alertas cerradas
                </h1>
                <p className="text-[color:var(--text-secondary)] max-w-xl leading-relaxed">
                  Tu mayor riesgo sigue siendo SST. Resolver los 4 pendientes
                  de IPERC subiría tu score 6 puntos más y evitaría una multa
                  estimada de S/ 24,500.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button icon={<ShieldCheck className="h-4 w-4" />}>
                    Ver plan de acción
                  </Button>
                  <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={copilot.toggle}>
                    Preguntar al Copilot
                  </Button>
                </div>
              </div>
            </section>

            {/* Grid de momentos */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card padding="md" interactive>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                    Lo que cerraste
                  </p>
                </div>
                <h3 className="text-lg font-bold mb-1">3 alertas críticas</h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Contratos renovados a tiempo. CTS abril depositada al 100%.
                </p>
              </Card>
              <Card padding="md" interactive>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
                    <Calendar className="h-3.5 w-3.5 text-amber-700" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                    Lo que se viene
                  </p>
                </div>
                <h3 className="text-lg font-bold mb-1">5 vencimientos · 7 días</h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  2 contratos de plazo fijo, 1 examen médico, 2 capacitaciones SST.
                </p>
              </Card>
              <Card variant="crimson" padding="md" interactive>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-crimson-700" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                    Tu mayor riesgo
                  </p>
                </div>
                <h3 className="text-lg font-bold mb-1 text-crimson-700">SST incompleto</h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  4 pendientes de IPERC. Multa estimada S/ 24,500 si hay inspección.
                </p>
              </Card>
            </section>

            {/* Quick actions */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-3">
                Acciones rápidas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Nuevo trabajador', icon: Users, href: '/dashboard/trabajadores/nuevo' },
                  { label: 'Generar contrato', icon: FileText, href: '/dashboard/contratos/nuevo' },
                  { label: 'Calcular CTS', icon: Calculator, href: '/dashboard/calculadoras/cts' },
                  { label: 'Simulacro', icon: ShieldCheck, href: '/dashboard/simulacro' },
                  { label: 'Diagnóstico', icon: ShieldCheck, href: '/dashboard/diagnostico' },
                  { label: 'Asistente IA', icon: Bot, href: '/dashboard/asistente-ia' },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Card
                      key={action.href}
                      padding="md"
                      interactive
                      className="flex flex-col items-start gap-2"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--neutral-100)] border border-[color:var(--border-subtle)]">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </span>
                      <p className="text-sm font-semibold">{action.label}</p>
                    </Card>
                  )
                })}
              </div>
            </section>

            {/* Instrucciones */}
            <section>
              <Card padding="lg">
                <CardHeader className="!p-0 !border-none !pb-3">
                  <div>
                    <CardTitle>¿Qué probar aquí?</CardTitle>
                    <CardDescription className="mt-1">
                      Checklist de verificación para la revolución Fase B.
                    </CardDescription>
                  </div>
                  <Badge variant="emerald" size="sm">
                    Shell v2
                  </Badge>
                </CardHeader>
                <CardContent className="!p-0 !pt-4">
                  <ul className="space-y-2 text-sm text-[color:var(--text-secondary)]">
                    <Item>Sidebar muestra los 7 hubs (Cockpit, Equipo, Riesgo, Calendario, Contratos & Docs, IA Laboral, Config) con iconos coherentes.</Item>
                    <Item>Clic en un hub colapsable expande sus sub-items con transición suave.</Item>
                    <Item>Topbar muestra breadcrumbs; el avatar abre un DropdownMenu Radix.</Item>
                    <Item>Botón <kbd className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-1 font-mono text-[10px]">Buscar</kbd> abre el command palette (cmdk) con acciones, navegación y calculadoras.</Item>
                    <Item>Escribir ≥ 2 caracteres dispara búsqueda dinámica (/api/search) y muestra trabajadores/contratos/documentos.</Item>
                    <Item><kbd className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-1 font-mono text-[10px]">Cmd/Ctrl+I</kbd> abre/cierra el AI Copilot con sugerencias contextuales.</Item>
                    <Item>El Copilot persiste al navegar entre páginas (estado en localStorage).</Item>
                    <Item>Las tooltips de Radix aparecen en hover de botones iconográficos.</Item>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>

      <CommandPalette openState={commandOpen} setOpenState={setCommandOpen} />
      <CopilotDrawer />
    </div>
  )
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

