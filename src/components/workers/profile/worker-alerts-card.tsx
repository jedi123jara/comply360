'use client'

import Link from 'next/link'
import { Bell, ShieldCheck, ArrowRight, Building2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatSoles } from '@/lib/format/peruvian'
import { daysUntil } from '@/lib/compliance/action-plan'
import {
  alertSeverityLabel,
  cleanAlertDescription,
  describeDaysLeft,
  getWorkerAlertConfig,
  resolveWorkerAlertActionInProfile,
  type InProfileAlertAction,
} from '@/lib/alerts/alert-actions'
import { PROFILE_TAB_LABELS, isProfileTab, type ProfileTab } from './profile-tabs'

/**
 * WorkerAlertsCard — alertas activas (no resueltas) del trabajador.
 *
 * Vive arriba de la pestaña Información: es el destino de "Ver alertas" en la
 * lista de trabajadores (`?tab=alertas` se redirige a `info`).
 *
 * El destino de cada alerta sale del mapeo compartido
 * (`@/lib/alerts/alert-actions`), el mismo que usan Alertas, Calendario y
 * Pendientes. Como esta tarjeta ya está DENTRO de la ficha:
 *  - si la alerta se corrige en una pestaña de esta ficha → se cambia de
 *    pestaña sin navegar;
 *  - si se corrige en otra pantalla (calculadora, módulo SST…) → se navega
 *    allí, igual que desde Alertas.
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

const SEVERITY_VARIANT: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const ACTION_BUTTON_CLASS =
  'inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--text-primary)] transition-colors hover:border-emerald-500/60 sm:self-auto'

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

/** "Vence en 3 días (12 oct. 2026)" o "Venció hace 2 días (…)". */
function deadlineLabel(dueDate: string): string {
  return `${describeDaysLeft(daysUntil(dueDate))} (${fmtDate(dueDate)})`
}

function AlertActionButton({
  action,
  onGoToTab,
}: {
  action: InProfileAlertAction | null
  onGoToTab?: (tab: ProfileTab) => void
}) {
  if (!action) return null

  if (action.kind === 'tab') {
    const tab = action.tab
    // La tarjeta vive en la pestaña Información: si la alerta se corrige ahí
    // mismo (p. ej. T-Registro), no hay a dónde ir; lo indicamos con texto.
    if (tab === 'info') {
      return (
        <span className="shrink-0 self-start text-[11px] font-medium text-[color:var(--text-tertiary)] sm:self-auto">
          Se corrige más abajo, en esta pestaña
        </span>
      )
    }
    if (!onGoToTab || !isProfileTab(tab)) return null
    return (
      <button
        type="button"
        onClick={() => onGoToTab(tab)}
        title={`Te lleva a: ${action.destination}`}
        className={ACTION_BUTTON_CLASS}
      >
        Resolver en {PROFILE_TAB_LABELS[tab]}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    )
  }

  if (action.kind === 'link') {
    return (
      <Link href={action.href} title={`Te lleva a: ${action.destination}`} className={ACTION_BUTTON_CLASS}>
        Resolver en {action.destination}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    )
  }

  // Las alertas de trabajador no generan acciones externas ni del asistente.
  return null
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
            Lo que debes resolver con este trabajador. Cada alerta te lleva a donde se corrige.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="!p-0">
        <ul className="divide-y divide-[color:var(--border-subtle)]">
          {sorted.map((alert) => {
            const ref = { type: alert.type, title: alert.title }
            const config = getWorkerAlertConfig(ref)
            const action = resolveWorkerAlertActionInProfile(ref)
            const description = cleanAlertDescription(alert.description)
            const isOrgWide = config?.scope === 'org'
            return (
              <li key={alert.id} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[alert.severity] ?? 'medium'} size="xs">
                      {alertSeverityLabel(alert.severity)}
                    </Badge>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{alert.title}</p>
                    {isOrgWide ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-default)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-secondary)]">
                        <Building2 className="h-3 w-3" aria-hidden="true" />
                        De toda la empresa
                      </span>
                    ) : null}
                  </div>
                  {description ? (
                    <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{description}</p>
                  ) : null}
                  {config?.whyItMatters ? (
                    <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                      <span className="font-semibold">Por qué importa:</span> {config.whyItMatters}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">
                    {alert.dueDate ? deadlineLabel(alert.dueDate) : null}
                    {alert.dueDate && alert.multaEstimada ? ' · ' : null}
                    {alert.multaEstimada ? `Multa si no se corrige: ${formatSoles(alert.multaEstimada)}` : null}
                  </p>
                </div>
                <AlertActionButton action={action} onGoToTab={onGoToTab} />
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
