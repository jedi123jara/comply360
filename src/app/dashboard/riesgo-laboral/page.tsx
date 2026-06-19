'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  FileSearch,
  FileWarning,
  Gauge,
  History,
  type LucideIcon,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Target,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles } from '@/lib/format/peruvian'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type EvidenceStatus = 'PARCIAL' | 'FALTANTE' | 'VENCIDO'
type Area =
  | 'SST'
  | 'CONTRATOS'
  | 'PLANILLA'
  | 'BENEFICIOS'
  | 'JORNADA'
  | 'SEGURIDAD_SOCIAL'
  | 'IGUALDAD'
  | 'HSL'
  | 'TERCEROS'
  | 'DOCUMENTOS'

interface RiskAction {
  id: string
  title: string
  area: Area
  severity: Severity
  impactSoles: number
  dueDate: string
  ownerRole: string
  route: string
  evidenceGoal: string
}

interface LaborRiskSnapshot {
  calculatedAt: string
  score: {
    overall: number
    sunafilReady: number
    sst: number
    evidenceConfidence: number
    avoidableClosure: number
  }
  exposure: {
    potentialFineSoles: number
    potentialFineUit: number
    estimatedAfterSubsanationSoles: number
    avoidableAmountSoles: number
    avoidableReductionPercent: number
  }
  defense: {
    openTasks: number
    completedTasks: number
    completedWithEvidence: number
    unresolvedAlerts: number
    overdueTrainings: number
    blockers: string[]
  }
  evidenceRequirements: Array<{
    id: string
    title: string
    categoryLabel: string
    area: Area
    status: EvidenceStatus
    severity: Severity
    baseLegal: string
    coverage: { present: number; total: number }
    missingCount: number
    potentialFineSoles: number
    avoidableAmountSoles: number
    actionHint: string
    route: string
  }>
  findings: Array<{
    id: string
    area: Area
    title: string
    severity: Severity
    baseLegal: string
    potentialFineSoles: number
    avoidableAmountSoles: number
    action: string
    suggestedOwnerRole: string
    suggestedDueDate: string
    route: string
  }>
  nextActions: RiskAction[]
  byArea: Array<{
    area: Area
    label: string
    findings: number
    exposureSoles: number
    avoidableSoles: number
    maxSeverity: Severity
  }>
  sst: {
    score: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    exposureSoles: number
    topRecommendations: Array<{
      prioridad: Severity
      area: string
      titulo: string
      detalle: string
      impactoSoles: number
    }>
  }
  inspectionPack: {
    readinessScore: number
    totalDocs: number
    applicableDocs: number
    incompleteDocs: number
    missingCriticalDocs: number
    potentialFineSoles: number
    estimatedAfterSubsanationSoles: number
    avoidableAmountSoles: number
    urgentDocs: LaborRiskSnapshot['evidenceRequirements']
  }
  legalConstants: {
    uit: number
    rmv: number
    versionDate: string
    sources: string[]
  }
}

interface LaborRiskResponse {
  ok: boolean
  snapshot?: LaborRiskSnapshot
  trend?: LaborRiskTrend | null
  error?: string
}

interface LaborRiskHistoryPoint {
  id: string
  calculatedAt: string
  scoreOverall: number
  scoreSunafilReady: number
  scoreSst: number
  scoreEvidence: number
  potentialFineSoles: number
  estimatedAfterSubsanationSoles: number
  avoidableAmountSoles: number
  totalFindings: number
  evidenceOpenDocs: number
}

interface LaborRiskTrend {
  points: LaborRiskHistoryPoint[]
  deltaScore: number | null
  deltaExposureSoles: number | null
  deltaAvoidableSoles: number | null
  bestScore: number | null
  worstExposureSoles: number | null
}

const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critico',
  HIGH: 'Alto',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
}

const SEVERITY_STYLE: Record<Severity, string> = {
  CRITICAL: 'border-red-400/35 bg-red-500/10 text-red-100',
  HIGH: 'border-orange-400/35 bg-orange-500/10 text-orange-100',
  MEDIUM: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  LOW: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100',
}

const STATUS_STYLE = {
  CRITICO: 'border-red-400/40 bg-red-500/10 text-red-100',
  ALTO: 'border-orange-400/40 bg-orange-500/10 text-orange-100',
  MEDIO: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  CONTROLADO: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
}

export default function RiesgoLaboralPage() {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<LaborRiskSnapshot | null>(null)
  const [trend, setTrend] = useState<LaborRiskTrend | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingPlan, setCreatingPlan] = useState(false)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/labor-risk?mode=full', { cache: 'no-store' })
      const data = (await res.json()) as LaborRiskResponse
      if (!res.ok || !data.ok || !data.snapshot) {
        throw new Error(data.error || 'No se pudo calcular Riesgo Laboral.')
      }
      setSnapshot(data.snapshot)
      setTrend(data.trend ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular Riesgo Laboral.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  async function createRemediationPlan() {
    setCreatingPlan(true)
    setError(null)
    try {
      const res = await fetch('/api/labor-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'top' }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo crear el plan de subsanacion.')
      }
      router.push('/dashboard/plan-accion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el plan de subsanacion.')
    } finally {
      setCreatingPlan(false)
    }
  }

  const status = useMemo(() => {
    if (!snapshot) return 'MEDIO'
    if (snapshot.score.overall < 45 || snapshot.findings.some((finding) => finding.severity === 'CRITICAL')) return 'CRITICO'
    if (snapshot.score.overall < 70 || snapshot.findings.some((finding) => finding.severity === 'HIGH')) return 'ALTO'
    if (snapshot.score.overall < 85) return 'MEDIO'
    return 'CONTROLADO'
  }, [snapshot])

  return (
    <div className="space-y-5">
      <section className="border border-white/10 bg-[#07111f] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-black uppercase text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              Riesgo Cero Evitable
            </div>
            <h1 className="mt-3 text-2xl font-black text-white">Riesgo Laboral</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Una lectura canonica de multas evitables, evidencia, SST y acciones que reducen exposicion antes de una inspeccion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            <button
              type="button"
              onClick={createRemediationPlan}
              disabled={creatingPlan || loading || !snapshot || snapshot.nextActions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
            >
              {creatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Crear plan
            </button>
            <button
              type="button"
              onClick={() => void loadSnapshot()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recalcular
            </button>
            <Link
              href="/dashboard/plan-accion"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              Plan anti-multas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={ShieldAlert}
            label="Exposicion potencial"
            value={snapshot ? formatSoles(snapshot.exposure.potentialFineSoles) : '...'}
            detail={snapshot ? `${snapshot.exposure.potentialFineUit} UIT estimadas` : 'Calculando'}
            tone="red"
          />
          <MetricCard
            icon={TrendingDown}
            label="Ahorro evitable"
            value={snapshot ? formatSoles(snapshot.exposure.avoidableAmountSoles) : '...'}
            detail={snapshot ? `${snapshot.exposure.avoidableReductionPercent}% reducible si se subsana` : 'Calculando'}
            tone="emerald"
          />
          <MetricCard
            icon={FileSearch}
            label="Confianza de evidencia"
            value={snapshot ? `${snapshot.score.evidenceConfidence}%` : '...'}
            detail={snapshot ? `${snapshot.defense.completedWithEvidence} cierres con evidencia` : 'Calculando'}
            tone="cyan"
          />
          <MetricCard
            icon={Gauge}
            label="Score laboral"
            value={snapshot ? `${snapshot.score.overall}/100` : '...'}
            detail={snapshot ? `SST ${snapshot.score.sst}/100 · SUNAFIL ${snapshot.score.sunafilReady}/100` : 'Calculando'}
            tone="amber"
          />
        </div>
      </section>

      {loading && !snapshot ? <LoadingState /> : null}

      {snapshot ? (
        <>
          <TrendPanel trend={trend} snapshot={snapshot} />

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <TopActions actions={snapshot.nextActions} />
            <DefensePanel snapshot={snapshot} status={status} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <AreaMap snapshot={snapshot} />
            <PlanWindow snapshot={snapshot} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <SstPanel snapshot={snapshot} />
            <EvidencePackPanel snapshot={snapshot} />
          </div>

          <InspectionPanel snapshot={snapshot} />
        </>
      ) : null}
    </div>
  )
}

function StatusPill({ status }: { status: 'CRITICO' | 'ALTO' | 'MEDIO' | 'CONTROLADO' }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black', STATUS_STYLE[status])}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status}
    </span>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: 'red' | 'emerald' | 'cyan' | 'amber'
}) {
  const toneClass = {
    red: 'text-red-200 border-red-400/20 bg-red-500/10',
    emerald: 'text-emerald-200 border-emerald-400/20 bg-emerald-500/10',
    cyan: 'text-cyan-200 border-cyan-400/20 bg-cyan-500/10',
    amber: 'text-amber-200 border-amber-400/20 bg-amber-500/10',
  }[tone]
  return (
    <div className={cn('rounded-lg border p-4', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-black leading-tight text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  )
}

function TrendPanel({
  trend,
  snapshot,
}: {
  trend: LaborRiskTrend | null
  snapshot: LaborRiskSnapshot
}) {
  const points = trend?.points ?? []
  const maxExposure = Math.max(1, ...points.map((point) => point.potentialFineSoles), snapshot.exposure.potentialFineSoles)
  const latestLabel = points.length > 0
    ? formatDateTimeShort(points[points.length - 1].calculatedAt)
    : formatDateTimeShort(snapshot.calculatedAt)

  return (
    <section className="rounded-lg border border-white/10 bg-[#091321] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-black text-white">
            <History className="h-5 w-5 text-cyan-300" />
            Tendencia anti-multas
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Ultimo snapshot {latestLabel}. El sistema guarda historial para demostrar reduccion de exposicion con el tiempo.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:w-[560px]">
          <MiniStat label="Delta score" value={formatDeltaScore(trend?.deltaScore)} />
          <MiniStat label="Delta exposicion" value={formatDeltaMoney(trend?.deltaExposureSoles)} />
          <MiniStat label="Mejor score" value={trend?.bestScore !== null && trend?.bestScore !== undefined ? `${trend.bestScore}/100` : `${snapshot.score.overall}/100`} />
        </div>
      </div>
      <div className="mt-4 grid h-28 grid-cols-6 items-end gap-2 sm:grid-cols-10 lg:[grid-template-columns:repeat(14,minmax(0,1fr))]">
        {(points.length > 0 ? points : [{
          id: 'current',
          calculatedAt: snapshot.calculatedAt,
          scoreOverall: snapshot.score.overall,
          potentialFineSoles: snapshot.exposure.potentialFineSoles,
          avoidableAmountSoles: snapshot.exposure.avoidableAmountSoles,
        }]).slice(-14).map((point) => {
          const height = Math.max(8, Math.round((point.potentialFineSoles / maxExposure) * 100))
          return (
            <div key={point.id} className="flex min-w-0 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end rounded-md bg-black/20 px-1">
                <div
                  className="w-full rounded-t-md bg-cyan-300/80"
                  style={{ height: `${height}%` }}
                  title={`${formatDateTimeShort(point.calculatedAt)} · ${formatSoles(point.potentialFineSoles)}`}
                />
              </div>
              <span className="truncate text-[10px] font-bold text-slate-500">{point.scoreOverall}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TopActions({ actions }: { actions: RiskAction[] }) {
  return (
    <SectionShell icon={Target} title="Top acciones que bajan multa" actionHref="/dashboard/plan-accion" actionLabel="Gestionar plan">
      {actions.length === 0 ? (
        <EmptyState title="Sin acciones criticas" body="No hay brechas evitables detectadas por el motor canonico." />
      ) : (
        <div className="space-y-3">
          {actions.slice(0, 4).map((action) => (
            <Link
              key={action.id}
              href={action.route}
              className="block rounded-lg border border-white/10 bg-slate-950/35 p-3 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', SEVERITY_STYLE[action.severity])}>
                      {SEVERITY_LABEL[action.severity]}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">{areaLabel(action.area)}</span>
                  </div>
                  <p className="mt-2 text-sm font-black leading-5 text-white">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{action.evidenceGoal}</p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-sm font-black text-emerald-200">{formatSoles(action.impactSoles)}</p>
                  <p className="text-[11px] text-slate-500">Responsable: {action.ownerRole}</p>
                  <p className="text-[11px] text-slate-500">{formatDue(action.dueDate)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

function DefensePanel({
  snapshot,
  status,
}: {
  snapshot: LaborRiskSnapshot
  status: 'CRITICO' | 'ALTO' | 'MEDIO' | 'CONTROLADO'
}) {
  return (
    <SectionShell icon={ShieldCheck} title="Estado de defensa" actionHref="/dashboard/centro-sunafil" actionLabel="Centro SUNAFIL">
      <div className={cn('rounded-lg border p-4', STATUS_STYLE[status])}>
        <p className="text-[11px] font-black uppercase opacity-70">Preparacion ante inspeccion</p>
        <p className="mt-2 text-3xl font-black text-white">{snapshot.score.avoidableClosure}%</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          Riesgo evitable cerrado con evidencia frente a tareas, alertas y capacitaciones pendientes.
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat label="Tareas abiertas" value={snapshot.defense.openTasks} />
        <MiniStat label="Cierres con evidencia" value={snapshot.defense.completedWithEvidence} />
        <MiniStat label="Alertas vivas" value={snapshot.defense.unresolvedAlerts} />
        <MiniStat label="Docs incompletos" value={snapshot.inspectionPack.incompleteDocs} />
      </div>
      <div className="mt-3 space-y-2">
        {snapshot.defense.blockers.length > 0 ? (
          snapshot.defense.blockers.map((blocker) => (
            <div key={blocker} className="flex gap-2 rounded-lg border border-amber-300/20 bg-amber-500/10 p-2 text-xs leading-5 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {blocker}
            </div>
          ))
        ) : (
          <EmptyState title="Defensa sin bloqueos criticos" body="Mantener el radar semanal y los vencimientos bajo control." />
        )}
      </div>
    </SectionShell>
  )
}

function AreaMap({ snapshot }: { snapshot: LaborRiskSnapshot }) {
  const max = Math.max(1, ...snapshot.byArea.map((area) => area.exposureSoles))
  return (
    <SectionShell icon={BarChart3} title="Mapa de riesgo por area">
      {snapshot.byArea.length === 0 ? (
        <EmptyState title="Sin exposicion por area" body="El motor no detecto multas evitables activas." />
      ) : (
        <div className="space-y-3">
          {snapshot.byArea.map((area) => (
            <div key={area.area} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{area.label}</p>
                  <p className="text-[11px] text-slate-500">{area.findings} brecha(s) · evitable {formatSoles(area.avoidableSoles)}</p>
                </div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', SEVERITY_STYLE[area.maxSeverity])}>
                  {SEVERITY_LABEL[area.maxSeverity]}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(8, (area.exposureSoles / max) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-300">{formatSoles(area.exposureSoles)}</p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

function PlanWindow({ snapshot }: { snapshot: LaborRiskSnapshot }) {
  const windows = [
    {
      title: '7 dias',
      body: 'Cerrar criticos, alertas y vencidos con evidencia.',
      count: snapshot.nextActions.filter((action) => action.severity === 'CRITICAL' || action.severity === 'HIGH').length,
      href: '/dashboard/plan-accion',
      icon: CalendarClock,
    },
    {
      title: '30 dias',
      body: 'Completar evidencias documentales y SST recurrente.',
      count: snapshot.nextActions.filter((action) => action.severity === 'MEDIUM').length + snapshot.defense.openTasks,
      href: '/dashboard/centro-sunafil?tab=plan',
      icon: ClipboardList,
    },
    {
      title: '90 dias',
      body: 'Dejar expediente vivo, simulacro y gobierno mensual.',
      count: snapshot.byArea.length,
      href: '/dashboard/centro-sunafil?tab=inspecciones',
      icon: Siren,
    },
  ]

  return (
    <SectionShell icon={ClipboardList} title="Plan de blindaje 7/30/90">
      <div className="grid gap-3 md:grid-cols-3">
        {windows.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-lg border border-white/10 bg-slate-950/35 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
            >
              <Icon className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 text-lg font-black text-white">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p>
              <p className="mt-3 text-sm font-black text-cyan-100">{item.count} frente(s)</p>
            </Link>
          )
        })}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-3 text-xs leading-5 text-slate-400">
        Meta: que ninguna multa ocurra por olvido, vencimiento, falta de documento, falta de evidencia o falta de reaccion.
      </div>
    </SectionShell>
  )
}

function SstPanel({ snapshot }: { snapshot: LaborRiskSnapshot }) {
  return (
    <SectionShell icon={ShieldAlert} title="SST preventivo" actionHref="/dashboard/sst" actionLabel="Abrir SST">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Score SST" value={`${snapshot.sst.score}/100`} />
        <MiniStat label="Semaforo" value={snapshot.sst.semaforo} />
        <MiniStat label="Exposicion SST" value={formatSoles(snapshot.sst.exposureSoles)} />
      </div>
      <div className="mt-3 space-y-2">
        {snapshot.sst.topRecommendations.length > 0 ? (
          snapshot.sst.topRecommendations.map((rec) => (
            <div key={`${rec.area}-${rec.titulo}`} className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
              <p className="text-sm font-black text-white">{rec.titulo}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{rec.detalle}</p>
              {rec.impactoSoles > 0 ? <p className="mt-2 text-xs font-black text-emerald-200">{formatSoles(rec.impactoSoles)} de impacto</p> : null}
            </div>
          ))
        ) : (
          <EmptyState title="SST sin recomendaciones urgentes" body="Mantener IPERC, EMO, comite, EPP y visitas al dia." />
        )}
      </div>
    </SectionShell>
  )
}

function EvidencePackPanel({ snapshot }: { snapshot: LaborRiskSnapshot }) {
  const urgent = snapshot.inspectionPack.urgentDocs.length > 0
    ? snapshot.inspectionPack.urgentDocs
    : snapshot.evidenceRequirements.slice(0, 5)

  return (
    <SectionShell icon={FileWarning} title="Evidencia SUNAFIL faltante" actionHref="/dashboard/sunafil-ready" actionLabel="Ver 28 docs">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="SUNAFIL-Ready" value={`${snapshot.inspectionPack.readinessScore}/100`} />
        <MiniStat label="Aplicables" value={`${snapshot.inspectionPack.applicableDocs}/${snapshot.inspectionPack.totalDocs}`} />
        <MiniStat label="Multa documental" value={formatSoles(snapshot.inspectionPack.potentialFineSoles)} />
      </div>
      <div className="mt-3 space-y-2">
        {urgent.length > 0 ? (
          urgent.map((item) => (
            <Link
              key={item.id}
              href={item.route}
              className="block rounded-lg border border-white/10 bg-slate-950/35 p-3 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', evidenceStatusStyle(item.status))}>
                      {evidenceStatusLabel(item.status)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">{item.categoryLabel}</span>
                  </div>
                  <p className="mt-2 text-sm font-black leading-5 text-white">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.actionHint}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.baseLegal}</p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-sm font-black text-emerald-200">{formatSoles(item.avoidableAmountSoles)}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.coverage.total > 0 ? `${item.coverage.present}/${item.coverage.total} cubierto` : 'Documento empresa'}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState title="Expediente documental limpio" body="Los documentos SUNAFIL aplicables estan completos segun la evidencia disponible." />
        )}
      </div>
    </SectionShell>
  )
}

function InspectionPanel({ snapshot }: { snapshot: LaborRiskSnapshot }) {
  return (
    <SectionShell icon={Siren} title="Preparacion SUNAFIL" actionHref="/dashboard/inspeccion-en-vivo" actionLabel="Modo inspeccion">
      <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
        <p className="text-sm font-black text-white">Expediente vivo</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          SUNAFIL-Ready <span className="font-black text-white">{snapshot.inspectionPack.readinessScore}/100</span> · documentos incompletos <span className="font-black text-white">{snapshot.inspectionPack.incompleteDocs}</span> · exposicion post-subsanacion estimada <span className="font-black text-white">{formatSoles(snapshot.exposure.estimatedAfterSubsanationSoles + snapshot.inspectionPack.estimatedAfterSubsanationSoles)}</span>.
          Usa el expediente cuando haya carta, requerimiento o visita inspectiva.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <InspectionLink href="/api/sunafil/expediente?format=pdf" icon={FileSearch} label="PDF de defensa" />
          <InspectionLink href="/api/sunafil/expediente?format=zip" icon={ClipboardList} label="ZIP de evidencias" />
          <InspectionLink href="/dashboard/simulacro" icon={Target} label="Simulacro preventivo" />
          <InspectionLink href="/dashboard/centro-sunafil" icon={ShieldCheck} label="Centro SUNAFIL" />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="text-xs font-black uppercase text-slate-400">Constantes del motor</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          UIT {formatSoles(snapshot.legalConstants.uit)} · RMV {formatSoles(snapshot.legalConstants.rmv)} · version {snapshot.legalConstants.versionDate}
        </p>
      </div>
    </SectionShell>
  )
}

function SectionShell({
  icon: Icon,
  title,
  children,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#091321] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-white">
          <Icon className="h-5 w-5 text-cyan-300" />
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-200 transition hover:text-cyan-100">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-white">{value}</p>
    </div>
  )
}

function InspectionLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/10">
      <Icon className="h-4 w-4 text-cyan-300" />
      {label}
    </Link>
  )
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4 text-sm font-bold text-slate-300">
      <span className="inline-flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        Calculando multas evitables, evidencia y SST...
      </span>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3">
      <p className="text-sm font-black text-emerald-100">{title}</p>
      <p className="mt-1 text-xs leading-5 text-emerald-100/75">{body}</p>
    </div>
  )
}

function areaLabel(area: Area) {
  const labels: Record<Area, string> = {
    SST: 'SST',
    CONTRATOS: 'Contratos',
    PLANILLA: 'Planilla',
    BENEFICIOS: 'Beneficios',
    JORNADA: 'Jornada',
    SEGURIDAD_SOCIAL: 'Seguridad social',
    IGUALDAD: 'Igualdad',
    HSL: 'Hostigamiento',
    TERCEROS: 'Terceros',
    DOCUMENTOS: 'Documentos',
  }
  return labels[area]
}

function formatDue(value: string) {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function formatDateTimeShort(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDeltaScore(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Primer dato'
  if (value === 0) return 'Sin cambio'
  return `${value > 0 ? '+' : ''}${value} pts`
}

function formatDeltaMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Primer dato'
  if (value === 0) return 'Sin cambio'
  const formatted = formatSoles(Math.abs(value))
  return value < 0 ? `-${formatted}` : `+${formatted}`
}

function evidenceStatusLabel(status: EvidenceStatus) {
  if (status === 'VENCIDO') return 'Vencido'
  if (status === 'PARCIAL') return 'Parcial'
  return 'Faltante'
}

function evidenceStatusStyle(status: EvidenceStatus) {
  if (status === 'VENCIDO') return 'border-red-400/35 bg-red-500/10 text-red-100'
  if (status === 'PARCIAL') return 'border-amber-400/35 bg-amber-500/10 text-amber-100'
  return 'border-orange-400/35 bg-orange-500/10 text-orange-100'
}
