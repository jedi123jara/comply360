'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { WorkerSummary } from '../worker-profile-header'
import { OnboardingCascadeCard } from '../onboarding-cascade-card'
import { ScheduleCard } from '../schedule-card'

function DataRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--border-subtle)] last:border-0">
      <dt className="text-xs uppercase tracking-wider text-[color:var(--text-tertiary)] shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-[color:var(--text-primary)] text-right font-medium">
        {value ?? <span className="text-[color:var(--text-tertiary)]">—</span>}
      </dd>
    </div>
  )
}

export function TabInfo({ worker }: { worker: WorkerSummary }) {
  return (
    <div className="space-y-4">
      <OnboardingCascadeCard
        workerId={worker.id}
        workerFirstName={worker.firstName}
        hasEmail={Boolean(worker.email)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card padding="none">
        <CardHeader>
          <div>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>Información que identifica al trabajador.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <DataRow label="Nombres" value={worker.firstName} />
            <DataRow label="Apellidos" value={worker.lastName} />
            <DataRow label="DNI" value={worker.dni} />
            <DataRow label="Correo" value={worker.email} />
            <DataRow label="Teléfono" value={worker.phone} />
          </dl>
        </CardContent>
      </Card>

      <Card padding="none">
        <CardHeader>
          <div>
            <CardTitle>Datos laborales</CardTitle>
            <CardDescription>Vínculo con la empresa y régimen aplicable.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <DataRow label="Cargo" value={worker.position} />
            <DataRow label="Departamento" value={worker.department} />
            <DataRow label="Régimen" value={worker.regimenLaboral} />
            <DataRow label="Tipo contrato" value={worker.tipoContrato} />
            <DataRow
              label="Fecha ingreso"
              value={
                worker.fechaIngreso
                  ? new Intl.DateTimeFormat('es-PE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(worker.fechaIngreso))
                  : null
              }
            />
            <DataRow
              label="Sueldo bruto"
              value={
                typeof worker.sueldoBruto === 'number'
                  ? new Intl.NumberFormat('es-PE', {
                      style: 'currency',
                      currency: 'PEN',
                    }).format(worker.sueldoBruto)
                  : null
              }
            />
          </dl>
        </CardContent>
      </Card>
      </div>
      <ScheduleCard workerId={worker.id} />
    </div>
  )
}
