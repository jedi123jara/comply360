'use client'

import { Bell, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatSoles } from '@/lib/format/peruvian'
import { PROFILE_TAB_LABELS, type ProfileTab } from './profile-tabs'

/**
 * WorkerAlertsCard — alertas activas (no resueltas) del trabajador.
 *
 * Vive arriba de la pestaña Información: es el destino de "Ver alertas" en la
 * lista de trabajadores (`?tab=alertas` se redirige a `info`). Cada alerta
 * ofrece un botón a la pestaña donde se resuelve.
 */

export interface WorkerAlertSummary {
  id: string
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string
  title: string
  description?: string | null
  dueDate?: string | null
  multaEstimada?: number | null
}

const SEVERITY_META: Record<string, { label: string; variant: 'critical' | 'high' | 'medium' | 'low' }> = {
  CRITICAL: { label: 'Crítica', variant: 'critical' },
  HIGH: { label: 'Alta', variant: 'high' },
  MEDIUM: { label: 'Media', variant: 'medium' },
  LOW: { label: 'Baja', variant: 'low' },
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

/** Pestaña del perfil donde se resuelve cada tipo de alerta. */
const ALERT_TAB: Record<string, ProfileTab> = {
  CONTRATO_POR_VENCER: 'contratos',
  CONTRATO_VENCIDO: 'contratos',
  CAMBIO_REGIMEN_SIN_ADENDA: 'contratos',
  CTS_PENDIENTE: 'beneficios',
  GRATIFICACION_PENDIENTE: 'beneficios',
  VACACIONES_ACUMULADAS: 'vacaciones',
  VACACIONES_DOBLE_PERIODO: 'vacaciones',
  DOCUMENTO_FALTANTE: 'legajo',
  DOCUMENTO_VENCIDO: 'legajo',
  DOCUMENTO_SOSPECHOSO: 'legajo',
  REGISTRO_INCOMPLETO: 'legajo',
  EXAMEN_MEDICO_VENCIDO: 'sst',
  EMO_PROXIMO: 'sst',
  EMO_VENCIDO: 'sst',
  IPERC_VENCIDO: 'sst',
  SCTR_VENCIDO: 'sst',
  SAT_PLAZO_PROXIMO: 'sst',
  SAT_PLAZO_VENCIDO: 'sst',
  COMITE_REUNION_PENDIENTE: 'sst',
  COMITE_MANDATO_VENCE: 'sst',
  SIMULACRO_PENDIENTE: 'sst',
  CAPACITACION_PENDIENTE: 'capacitaciones',
  AFP_EN_MORA: 'remuneraciones',
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function WorkerAlertsCard({
  alerts,
  onGoToTab,
}: {
  alerts: WorkerAlertSummary[]
  onGoToTab?: (tab: ProfileTab) => void
}) {
  if (alerts.length === 0) {
    return (
      <div
        id="alertas"
        className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        <p className="text-sm text-emerald-900">
          <span className="font-semibold">Sin alertas activas.</span> Este trabajador está al día con lo que
          revisamos automáticamente.
        </p>
      </div>
    )
  }

  const sorted = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  )

  return (
    <Card id="alertas" padding="none">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-crimson-600" aria-hidden="true" />
            Alertas activas ({alerts.length})
          </CardTitle>
          <CardDescription>
            Lo que debes resolver con este trabajador. Cada alerta te lleva a la pestaña donde se corrige.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="!p-0">
        <ul className="divide-y divide-[color:var(--border-subtle)]">
          {sorted.map((alert) => {
            const meta = SEVERITY_META[alert.severity] ?? SEVERITY_META.MEDIUM
            const targetTab = ALERT_TAB[alert.type]
            return (
              <li key={alert.id} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={meta.variant} size="xs">
                      {meta.label}
                    </Badge>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{alert.title}</p>
                  </div>
                  {alert.description ? (
                    <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{alert.description}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">
                    {alert.dueDate ? `Vence el ${fmtDate(alert.dueDate)}` : null}
                    {alert.dueDate && alert.multaEstimada ? ' · ' : null}
                    {alert.multaEstimada ? `Multa estimada: ${formatSoles(alert.multaEstimada)}` : null}
                  </p>
                </div>
                {targetTab && targetTab !== 'info' && onGoToTab ? (
                  <button
                    type="button"
                    onClick={() => onGoToTab(targetTab)}
                    className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--text-primary)] transition-colors hover:border-emerald-500/60 sm:self-auto"
                  >
                    Resolver en {PROFILE_TAB_LABELS[targetTab]}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
