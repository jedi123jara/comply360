'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Users,
  FileText,
  Calculator,
  ShieldAlert,
  Bot,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import Sidebar from '@/app/dashboard/_components/sidebar'
import Topbar from '@/app/dashboard/_components/topbar'
import { CommandPalette } from '@/components/ui/command-palette'
import { CopilotProvider, useCopilot } from '@/providers/copilot-provider'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import {
  ScoreNarrative,
  MomentCard,
  ActivityHeatmap,
  SectorRadar,
  UpcomingDeadlines,
  RiskLeaderboard,
  QuickActions,
  mockHeatmapData,
} from '@/components/cockpit'
import type { DeadlineItem, WorkerRiskItem, RadarAxisDatum, QuickAction } from '@/components/cockpit'

/**
 * /dev/cockpit — Fase C showcase del Cockpit narrativo completo.
 *
 * Monta el shell (sidebar + topbar + palette + copilot) y el nuevo
 * `/dashboard/page.tsx` con datos mock representativos. Sirve como
 * espejo visual antes de migrar la página real.
 */
export default function DevCockpit() {
  return (
    <CopilotProvider>
      <CockpitShell />
    </CopilotProvider>
  )
}

function CockpitShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const copilot = useCopilot()

  const openCommand = useCallback(() => setCommandOpen(true), [])

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
            <CockpitContent
              onAskCopilot={() => copilot.open()}
              onOpenActionPlan={() => window.location.assign('/dashboard/diagnostico')}
            />
          </div>
        </main>
      </div>

      <CommandPalette openState={commandOpen} setOpenState={setCommandOpen} />
      <CopilotDrawer />
    </div>
  )
}

/* ── Cockpit content (same shape that will live in /dashboard/page.tsx) ─── */

function CockpitContent({
  onAskCopilot,
  onOpenActionPlan,
}: {
  onAskCopilot: () => void
  onOpenActionPlan: () => void
}) {
  const quickActions: QuickAction[] = [
    {
      id: 'new-worker',
      label: 'Nuevo trabajador',
      hint: 'Wizard + validación DNI',
      icon: Users,
      href: '/dashboard/trabajadores/nuevo',
      accent: 'emerald',
    },
    {
      id: 'new-contract',
      label: 'Generar contrato',
      hint: 'Plantilla · régimen · IA',
      icon: FileText,
      href: '/dashboard/contratos/nuevo',
      accent: 'emerald',
    },
    {
      id: 'calc-cts',
      label: 'Calcular CTS',
      hint: 'Con pre-fill por worker',
      icon: Calculator,
      href: '/dashboard/calculadoras/cts',
      accent: 'cyan',
    },
    {
      id: 'simulacro',
      label: 'Simulacro SUNAFIL',
      hint: 'Inspector virtual IA',
      icon: ShieldAlert,
      href: '/dashboard/simulacro',
      accent: 'amber',
    },
    {
      id: 'asistente',
      label: 'Asistente IA',
      hint: 'Consultas con RAG legal',
      icon: Bot,
      href: '/dashboard/asistente-ia',
      accent: 'gold',
    },
    {
      id: 'reportes',
      label: 'Reporte ejecutivo',
      hint: 'PDF mensual',
      icon: BarChart3,
      href: '/dashboard/reportes',
      accent: 'emerald',
    },
  ]

  const deadlines: DeadlineItem[] = [
    { id: 'd1', label: 'Contrato plazo fijo — Juan García', dueIn: 2, category: 'contract' },
    { id: 'd2', label: 'Examen médico anual — Ana Pérez', dueIn: 5, category: 'sst' },
    { id: 'd3', label: 'Depósito CTS mayo', dueIn: 14, category: 'cts', amount: 24500 },
    { id: 'd4', label: 'Capacitación SST obligatoria', dueIn: 7, category: 'sst' },
    { id: 'd5', label: 'Renovación AFP — 3 trabajadores', dueIn: 10, category: 'afp' },
  ]

  const riskWorkers: WorkerRiskItem[] = [
    {
      id: 'w1',
      fullName: 'Juan García López',
      role: 'Analista de Operaciones',
      regimen: 'MYPE Pequeña',
      score: 48,
      openAlerts: 3,
    },
    {
      id: 'w2',
      fullName: 'Ana Pérez Quispe',
      role: 'Supervisora SST',
      regimen: 'General',
      score: 55,
      openAlerts: 2,
    },
    {
      id: 'w3',
      fullName: 'Roberto Mamani Flores',
      role: 'Conductor',
      regimen: 'Construcción civil',
      score: 62,
      openAlerts: 1,
    },
    {
      id: 'w4',
      fullName: 'Luisa Condori Ramos',
      role: 'Contadora',
      regimen: 'General',
      score: 68,
      openAlerts: 1,
    },
    {
      id: 'w5',
      fullName: 'Carlos Huamán Torres',
      role: 'Operario',
      regimen: 'Agrario',
      score: 71,
      openAlerts: 0,
    },
  ]

  const radarData: RadarAxisDatum[] = [
    { area: 'Contratos', org: 92, sector: 78 },
    { area: 'Legajo', org: 86, sector: 72 },
    { area: 'CTS', org: 95, sector: 80 },
    { area: 'Vacaciones', org: 88, sector: 75 },
    { area: 'SST', org: 58, sector: 70 },
    { area: 'Documentos', org: 82, sector: 68 },
    { area: 'Planilla', org: 90, sector: 82 },
  ]

  return (
    <>
      <ScoreNarrative
        score={87}
        delta={5}
        topRisk="SST incompleto"
        topRiskImpact={6}
        multaEvitada={24500}
        onOpenActionPlan={onOpenActionPlan}
        onAskCopilot={onAskCopilot}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MomentCard
          variant="closed"
          label="Lo que cerraste"
          title="3 alertas críticas esta semana"
          description="Contratos renovados a tiempo, CTS abril depositada al 100%, 1 denuncia resuelta."
          icon={ShieldCheck}
          href="/dashboard/alertas"
          cta="Ver alertas cerradas"
        />
        <MomentCard
          variant="upcoming"
          label="Lo que se viene"
          title="5 vencimientos · 7 días"
          description="2 contratos de plazo fijo, 1 examen médico, 2 capacitaciones SST."
          icon={Calendar}
          href="/dashboard/calendario"
          cta="Ver calendario"
        />
        <MomentCard
          variant="risk"
          label="Tu mayor riesgo"
          title="SST incompleto"
          description="4 pendientes de IPERC. Multa estimada S/ 24,500 si hay inspección en las próximas semanas."
          icon={AlertTriangle}
          href="/dashboard/sst"
          cta="Resolver ahora"
        />
      </section>

      <QuickActions actions={quickActions} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlines items={deadlines} />
        <RiskLeaderboard workers={riskWorkers} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        <ActivityHeatmap data={mockHeatmapData(12)} />
        <SectorRadar data={radarData} sectorLabel="Promedio sector" />
      </section>

      {/* Footer hint */}
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 flex items-start gap-3">
        <Sparkles className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-200/80">
          <p className="font-semibold text-emerald-700">Esto es el Cockpit v2 (Fase C).</p>
          <p className="mt-0.5">
            Lo que ves aquí reemplazará a <code className="font-mono text-[11px]">/dashboard/page.tsx</code> una vez
            conectados los datos reales vía <code className="font-mono text-[11px]">useApiQuery</code>. Los datos
            mostrados ahora son mock deterministas para visualizar la identidad narrativa.
          </p>
        </div>
      </section>
    </>
  )
}
