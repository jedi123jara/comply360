'use client'

import { Suspense, useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  FolderOpen,
  FileText,
  Banknote,
  CalendarRange,
  HardHat,
  Calculator,
  History,
  GraduationCap,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WorkerProfileHeader, type WorkerSummary } from './worker-profile-header'
import { WorkerAlertsCard, type WorkerAlertSummary } from './worker-alerts-card'
import {
  DEFAULT_PROFILE_TAB,
  isProfileTab,
  resolveProfileTab,
  type ProfileTab,
} from './profile-tabs'
import { TabInfo } from './tabs/tab-info'
import { TabLegajo, type LegajoDoc } from './tabs/tab-legajo'
import { TabBeneficios } from './tabs/tab-beneficios'
import { TabHistorial } from './tabs/tab-historial'
import { TabContratos } from './tabs/tab-contratos'
import { TabRemuneraciones } from './tabs/tab-remuneraciones'
import { TabVacaciones } from './tabs/tab-vacaciones'
import { TabSST } from './tabs/tab-sst'
import { TabCapacitaciones } from './tabs/tab-capacitaciones'

/**
 * WorkerProfile — Super-Perfil v2.
 *
 * Header fijo + 9 tabs horizontales tipo Notion:
 *  - Información | Legajo | Contratos | Remuneraciones | Vacaciones
 *  - SST | Capacitaciones | Beneficios | Historial
 *
 * La pestaña activa vive en la URL (`?tab=legajo`) para que los enlaces de
 * otras pantallas abran directo la pestaña correcta y el botón "atrás" del
 * navegador funcione. Al cambiar de pestaña se hace `router.replace` sin
 * scroll.
 */

export interface WorkerProfileProps {
  worker: WorkerSummary
  legajoDocs?: LegajoDoc[]
  /** Alertas activas (no resueltas) del trabajador. */
  alerts?: WorkerAlertSummary[]
  /**
   * Vuelve a cargar trabajador + documentos. La página carga los datos en el
   * cliente, así que `router.refresh()` no sirve para refrescarlos.
   */
  onReload?: () => Promise<void> | void
  /**
   * Resumen agregado de VacationRecord para el tab Beneficios (Ola 2).
   * La página padre (server component) lo computa con prisma.vacationRecord.aggregate.
   */
  vacationsSummary?: {
    diasGozados: number
    periodosNoGozados?: number
  }
}

/**
 * `useSearchParams` exige un `<Suspense>` si algún consumidor se prerenderiza
 * de forma estática; lo ponemos aquí para no depender de cada página.
 */
export function WorkerProfile(props: WorkerProfileProps) {
  return (
    <Suspense fallback={null}>
      <WorkerProfileContent {...props} />
    </Suspense>
  )
}

function WorkerProfileContent({
  worker,
  legajoDocs = [],
  alerts = [],
  onReload,
  vacationsSummary,
}: WorkerProfileProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlTab = resolveProfileTab(searchParams?.get('tab'))
  const [activeTab, setActiveTab] = useState<ProfileTab>(urlTab)
  const [syncedUrlTab, setSyncedUrlTab] = useState<ProfileTab>(urlTab)
  // Si la URL cambia desde fuera (un enlace `?tab=` dentro del perfil o el
  // botón atrás del navegador), la pestaña activa la sigue.
  if (urlTab !== syncedUrlTab) {
    setSyncedUrlTab(urlTab)
    setActiveTab(urlTab)
  }

  const goToTab = useCallback(
    (next: ProfileTab) => {
      setActiveTab(next)
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (next === DEFAULT_PROFILE_TAB) params.delete('tab')
      else params.set('tab', next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="space-y-5">
      <WorkerProfileHeader worker={worker} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isProfileTab(value)) goToTab(value)
        }}
      >
        <TabsList variant="underline" fullWidth className="overflow-x-auto">
          <TabsTrigger variant="underline" value="info">
            <User className="h-3.5 w-3.5" />
            Información
            {alerts.length > 0 ? (
              <>
                <span
                  className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-crimson-600 px-1 text-[10px] font-bold leading-[18px] text-white"
                  aria-hidden="true"
                >
                  {alerts.length}
                </span>
                <span className="sr-only">
                  , {alerts.length} {alerts.length === 1 ? 'alerta activa' : 'alertas activas'}
                </span>
              </>
            ) : null}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="legajo">
            <FolderOpen className="h-3.5 w-3.5" />
            Legajo
          </TabsTrigger>
          <TabsTrigger variant="underline" value="contratos">
            <FileText className="h-3.5 w-3.5" />
            Contratos
          </TabsTrigger>
          <TabsTrigger variant="underline" value="remuneraciones">
            <Banknote className="h-3.5 w-3.5" />
            Remuneraciones
          </TabsTrigger>
          <TabsTrigger variant="underline" value="vacaciones">
            <CalendarRange className="h-3.5 w-3.5" />
            Vacaciones
          </TabsTrigger>
          <TabsTrigger variant="underline" value="sst">
            <HardHat className="h-3.5 w-3.5" />
            SST
          </TabsTrigger>
          <TabsTrigger variant="underline" value="capacitaciones">
            <GraduationCap className="h-3.5 w-3.5" />
            Capacitaciones
          </TabsTrigger>
          <TabsTrigger variant="underline" value="beneficios">
            <Calculator className="h-3.5 w-3.5" />
            Beneficios
          </TabsTrigger>
          <TabsTrigger variant="underline" value="historial">
            <History className="h-3.5 w-3.5" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="space-y-4">
            <WorkerAlertsCard alerts={alerts} onGoToTab={goToTab} />
            <TabInfo worker={worker} onReload={onReload} />
          </div>
        </TabsContent>

        <TabsContent value="legajo">
          <TabLegajo
            workerId={worker.id}
            docs={legajoDocs}
            onReload={onReload}
            onGoToTab={goToTab}
          />
        </TabsContent>

        <TabsContent value="contratos">
          <TabContratos workerId={worker.id} workerFirstName={worker.firstName} />
        </TabsContent>

        <TabsContent value="remuneraciones">
          <TabRemuneraciones workerId={worker.id} workerFirstName={worker.firstName} />
        </TabsContent>

        <TabsContent value="vacaciones">
          <TabVacaciones workerId={worker.id} workerFirstName={worker.firstName} />
        </TabsContent>

        <TabsContent value="sst">
          <TabSST
            workerId={worker.id}
            workerFirstName={worker.firstName}
            legajoDocs={legajoDocs}
          />
        </TabsContent>

        <TabsContent value="capacitaciones">
          <TabCapacitaciones workerId={worker.id} workerFirstName={worker.firstName} />
        </TabsContent>

        <TabsContent value="beneficios">
          <TabBeneficios worker={worker} vacationsSummary={vacationsSummary} />
        </TabsContent>

        <TabsContent value="historial">
          <TabHistorial workerId={worker.id} workerFirstName={worker.firstName} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
