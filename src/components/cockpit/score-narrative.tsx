'use client'

import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { complianceScoreColor } from '@/lib/brand'

/**
 * ScoreNarrative — the hero of the Cockpit.
 *
 * Tells a story with the compliance score rather than listing widgets:
 *   - Giant ProgressRing (left)
 *   - Narrative headline with delta + one concrete next action (right)
 *   - Two CTAs: open plan of action / ask copilot
 */
export interface ScoreNarrativeProps {
  score: number
  /** Delta vs previous period (positive means improved). */
  delta?: number
  /** Estimated multa evitada en soles. */
  multaEvitada?: number
  /** Top risk area (e.g. "SST incompleto"). */
  topRisk?: string
  /** Impact of resolving the top risk (points). */
  topRiskImpact?: number
  onOpenActionPlan?: () => void
  onAskCopilot?: () => void
}

export function ScoreNarrative({
  score,
  delta = 0,
  multaEvitada = 0,
  topRisk,
  topRiskImpact,
  onOpenActionPlan,
  onAskCopilot,
}: ScoreNarrativeProps) {
  const color = complianceScoreColor(score)
  const mood: 'critical' | 'warning' | 'good' | 'great' =
    score >= 90 ? 'great' : score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical'
  const deltaLabel =
    delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : 'sin cambio'

  const formatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  })

  const today = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date())

  return (
    <section className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center rounded-2xl border border-[color:var(--border-default)] bg-white p-6 lg:p-8 shadow-[var(--elevation-3)] motion-fade-in-up overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:bg-[image:var(--accent-bar-emerald)]">
      <div className="flex items-center justify-center">
        <ProgressRing value={score} size={220} stroke={14}>
          <div className="text-center">
            <div
              className="text-[64px] leading-none font-bold tracking-tight"
              style={{ color }}
            >
              {score}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
              Score compliance
            </div>
          </div>
        </ProgressRing>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm" dot>
            Hoy {today}
          </Badge>
          {delta !== 0 ? (
            <Badge variant={delta > 0 ? 'success' : 'danger'} size="sm">
              {delta > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {deltaLabel}
            </Badge>
          ) : null}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
          {mood === 'great' ? (
            <>
              Tu compliance está{' '}
              <span style={{ color }}>en rango élite</span>.
            </>
          ) : mood === 'good' ? (
            <>
              Semana <span style={{ color }}>saludable</span>. Puedes subir al
              siguiente nivel.
            </>
          ) : mood === 'warning' ? (
            <>
              Compliance <span style={{ color }}>mejorable</span>. Hay margen
              para acelerar.
            </>
          ) : (
            <>
              Tu compliance tiene{' '}
              <span style={{ color }}>brechas importantes</span>.
              Vamos a resolverlas paso a paso.
            </>
          )}
        </h1>

        <p className="text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
          {topRisk ? (
            <>
              Tu mayor riesgo es <strong className="text-[color:var(--text-primary)]">{topRisk}</strong>.
              {topRiskImpact ? (
                <>
                  {' '}Resolverlo subiría tu score{' '}
                  <strong className="text-emerald-700">+{topRiskImpact} puntos</strong>
                </>
              ) : null}
              {multaEvitada > 0 ? (
                <>
                  {' '}y evitaría una multa estimada de{' '}
                  <strong className="text-crimson-700">{formatter.format(multaEvitada)}</strong>
                  .
                </>
              ) : (
                '.'
              )}
            </>
          ) : (
            <>
              No detectamos brechas críticas activas. Mantén el ritmo y
              revisamos tu cockpit cada mañana.
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onOpenActionPlan}>Ver plan de acción</Button>
          <Button
            variant="secondary"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={onAskCopilot}
          >
            Preguntar al Asistente IA
          </Button>
        </div>
      </div>
    </section>
  )
}
