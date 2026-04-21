'use client'

import { useCallback, useEffect, useState } from 'react'
import Sidebar from '@/app/dashboard/_components/sidebar'
import Topbar from '@/app/dashboard/_components/topbar'
import { CommandPalette } from '@/components/ui/command-palette'
import { CopilotProvider, useCopilot } from '@/providers/copilot-provider'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import { WorkerProfile } from '@/components/workers/profile'
import type { WorkerSummary } from '@/components/workers/profile/worker-profile-header'
import type { LegajoDoc } from '@/components/workers/profile/tabs/tab-legajo'

/**
 * /dev/worker — Fase C showcase del Worker Super-Perfil.
 * Datos mock para visualizar la identidad + las 8 tabs Notion-style.
 */
export default function DevWorker() {
  return (
    <CopilotProvider>
      <WorkerShell />
    </CopilotProvider>
  )
}

const MOCK_WORKER: WorkerSummary = {
  id: 'demo-1',
  firstName: 'Juan',
  lastName: 'García López',
  dni: '45612378',
  email: 'juan.garcia@ejemplo.pe',
  phone: '+51 987 654 321',
  position: 'Analista de Operaciones',
  department: 'Operaciones',
  regimenLaboral: 'MYPE Pequeña empresa',
  tipoContrato: 'Plazo fijo',
  fechaIngreso: '2023-03-15',
  status: 'ACTIVE',
  legajoScore: 72,
  sueldoBruto: 2800,
}

const MOCK_DOCS: LegajoDoc[] = [
  { id: 'd1', category: 'INGRESO', title: 'Contrato de trabajo firmado', required: true, status: 'VERIFIED' },
  { id: 'd2', category: 'INGRESO', title: 'DNI vigente', required: true, status: 'VERIFIED' },
  { id: 'd3', category: 'INGRESO', title: 'Certificado antecedentes policiales', required: true, status: 'MISSING' },
  { id: 'd4', category: 'INGRESO', title: 'CV firmado', required: false, status: 'UPLOADED' },
  { id: 'd5', category: 'VIGENTE', title: 'Última boleta de pago', required: true, status: 'VERIFIED' },
  { id: 'd6', category: 'VIGENTE', title: 'Capacitación anual obligatoria', required: true, status: 'PENDING' },
  {
    id: 'd7',
    category: 'SST',
    title: 'Examen médico ocupacional',
    required: true,
    status: 'EXPIRED',
    expiresAt: '2025-12-01',
  },
  { id: 'd8', category: 'SST', title: 'IPERC individual', required: true, status: 'MISSING' },
  { id: 'd9', category: 'SST', title: 'Entrega de EPP', required: true, status: 'VERIFIED' },
  { id: 'd10', category: 'PREVISIONAL', title: 'Afiliación AFP', required: true, status: 'VERIFIED' },
  { id: 'd11', category: 'PREVISIONAL', title: 'SCTR vigente', required: true, status: 'UPLOADED' },
  { id: 'd12', category: 'PREVISIONAL', title: 'EsSalud Vida', required: false, status: 'MISSING' },
]

function WorkerShell() {
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
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[var(--content-max)]">
            <WorkerProfile worker={MOCK_WORKER} legajoDocs={MOCK_DOCS} />
          </div>
        </main>
      </div>

      <CommandPalette openState={commandOpen} setOpenState={setCommandOpen} />
      <CopilotDrawer />
    </div>
  )
}
