'use client'

import {
  User,
  FolderOpen,
  FileText,
  Banknote,
  CalendarRange,
  HardHat,
  Calculator,
  History,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WorkerProfileHeader, type WorkerSummary } from './worker-profile-header'
import { TabInfo } from './tabs/tab-info'
import { TabLegajo, type LegajoDoc } from './tabs/tab-legajo'
import { TabBeneficios } from './tabs/tab-beneficios'
import { TabHistorial } from './tabs/tab-historial'
import { TabContratos } from './tabs/tab-contratos'
import { TabRemuneraciones } from './tabs/tab-remuneraciones'
import { TabVacaciones } from './tabs/tab-vacaciones'
import { TabSST } from './tabs/tab-sst'

/**
 * WorkerProfile — Super-Perfil v2.
 *
 * Header fijo + 8 tabs horizontales tipo Notion:
 *  - Información | Legajo | Contratos | Remuneraciones
 *  - Vacaciones | SST | Beneficios | Historial
 *
 * Las tabs aún sin implementación profunda usan `<TabPlaceholder>` apuntando
 * al módulo existente para no interrumpir el flujo.
 */

export interface WorkerProfileProps {
  worker: WorkerSummary
  legajoDocs?: LegajoDoc[]
  /**
   * Resumen agregado de VacationRecord para el tab Beneficios (Ola 2).
   * La página padre (server component) lo computa con prisma.vacationRecord.aggregate.
   */
  vacationsSummary?: {
    diasGozados: number
    periodosNoGozados?: number
  }
}

export function WorkerProfile({ worker, legajoDocs = [], vacationsSummary }: WorkerProfileProps) {
  return (
    <div className="space-y-5">
      <WorkerProfileHeader worker={worker} />

      <Tabs defaultValue="info">
        <TabsList variant="underline" fullWidth className="overflow-x-auto">
          <TabsTrigger variant="underline" value="info">
            <User className="h-3.5 w-3.5" />
            Información
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
          <TabInfo worker={worker} />
        </TabsContent>

        <TabsContent value="legajo">
          <TabLegajo workerId={worker.id} docs={legajoDocs} legajoScore={worker.legajoScore ?? 0} />
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
