'use client'

import Link from 'next/link'
import { ArrowRight, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  complianceScoreColor,
  complianceScoreLabel,
  complianceScoreTextColor,
  complianceScoreTone,
  type ComplianceScoreTone,
} from '@/lib/brand'
import { cn } from '@/lib/utils'

/**
 * RiskLeaderboard — top N workers by risk.
 * Click a row to jump to the worker's profile.
 *
 * El score va con ícono + palabra ("Bien" / "A mejorar" / "En riesgo"): el
 * color solo refuerza (WCAG 1.4.1). El número usa la tinta de texto del score
 * (≥ 4,5:1); el color vivo queda para el borde y el fondo.
 */

const TONE_ICON: Record<ComplianceScoreTone, typeof AlertTriangle> = {
  good: CheckCircle2,
  fair: AlertTriangle,
  risk: AlertOctagon,
}

export interface WorkerRiskItem {
  id: string
  fullName: string
  role?: string
  regimen?: string
  score: number // legajoScore or riskScore 0-100
  openAlerts: number
  avatarInitials?: string
}

export function RiskLeaderboard({ workers }: { workers: WorkerRiskItem[] }) {
  return (
    <Card padding="none" className="motion-fade-in-up">
      <CardHeader>
        <div>
          <CardTitle>Trabajadores en riesgo</CardTitle>
          <CardDescription>Legajo incompleto o alertas críticas abiertas.</CardDescription>
        </div>
        <Link
          href="/dashboard/trabajadores"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="!p-0">
        {workers.length === 0 ? (
          <p className="px-6 py-6 text-sm text-[color:var(--text-tertiary)] text-center">
            Nadie está en riesgo en este momento.
          </p>
        ) : (
          <ol className="divide-y divide-[color:var(--border-subtle)]">
            {workers.slice(0, 5).map((w, idx) => {
              const color = complianceScoreColor(w.score)
              const ink = complianceScoreTextColor(w.score)
              const scoreLabel = complianceScoreLabel(w.score)
              const ToneIcon = TONE_ICON[complianceScoreTone(w.score)]
              const initials =
                w.avatarInitials ??
                w.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
              return (
                <li key={w.id}>
                  <Link
                    href={`/dashboard/trabajadores/${w.id}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-[color:var(--bg-surface-hover)] transition-colors"
                  >
                    <span className="shrink-0 w-5 text-center text-xs font-bold text-[color:var(--text-tertiary)]">
                      {idx + 1}
                    </span>
                    <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--neutral-100)] border border-[color:var(--border-subtle)] text-xs font-semibold text-[color:var(--text-secondary)]">
                      {initials || '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{w.fullName}</p>
                      <p className="text-[11px] text-[color:var(--text-tertiary)] truncate">
                        {[w.role, w.regimen].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {w.openAlerts > 0 ? (
                      <Badge
                        variant="critical"
                        size="xs"
                        title={`${w.openAlerts} alerta${w.openAlerts === 1 ? '' : 's'} abierta${w.openAlerts === 1 ? '' : 's'}`}
                      >
                        <AlertTriangle className="h-3 w-3" /> {w.openAlerts}
                        <span className="sr-only">
                          {' '}
                          alerta{w.openAlerts === 1 ? '' : 's'} abierta{w.openAlerts === 1 ? '' : 's'}
                        </span>
                      </Badge>
                    ) : null}
                    <span
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold'
                      )}
                      style={{
                        color: ink,
                        borderColor: `${color}66`,
                        backgroundColor: `${color}14`,
                      }}
                      title={`Score ${w.score}/100 · ${scoreLabel}`}
                    >
                      <ToneIcon className="h-3 w-3" />
                      <span className="font-mono">{w.score}</span>
                      <span className="sr-only"> de 100,</span>
                      {/* En celular la palabra queda para lector de pantalla (el ícono ya distingue el estado) */}
                      <span className="sr-only sm:not-sr-only">{scoreLabel}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
