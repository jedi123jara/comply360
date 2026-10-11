'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import {
  Siren,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileCheck,
  Building2,
  ArrowRight,
  Clock,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/comply360/editorial-title'
import { cn } from '@/lib/utils'
import { formatSoles } from '@/lib/format/peruvian'
import { INFRAC_META } from '@/lib/legal-engine/infracciones-sunafil'
import type {
  InspeccionTipo,
  ResultadoSimulacro,
  HallazgoInspeccion,
} from '@/lib/compliance/simulacro-engine'
import { SIMULACRO_ESTIMATE, simulacroDocCount } from './_lib/simulacro-meta'

/**
 * /dashboard/simulacro — Simulacro SUNAFIL contra legajo real.
 *
 * Flow:
 *  1. Cover — elige tipo de inspección (PREVENTIVA | PROGRAMA_SECTORIAL).
 *  2. POST /api/simulacro — el server lee workers + documents del orgId, corre
 *     `evaluarSolicitud()` contra cada documento que pide SUNAFIL y genera
 *     `ResultadoSimulacro` con multas reales (escala D.S. 019-2006-TR por tamaño).
 *     El diagnóstico se guarda en `ComplianceDiagnostic(type=SIMULATION)`.
 *  3. InspectionChat — reproduce los requerimientos en UI tipo chat, uno por
 *     clic, con opción de saltar directo al resumen.
 *  4. ResultCover — resumen con multa total, subsanación −90%, hallazgos con
 *     botón "Resolver" y descarga del Acta.
 */
interface OrgProfile {
  name: string
  ruc: string | null
  razonSocial: string | null
}

/** Ruta donde se resuelven los hallazgos: el simulacro crea tareas en el Centro de acción. */
const PLAN_ACCION_HREF = '/dashboard/plan-accion'

/** Hallazgos que se reproducen en el chat (los más graves primero). */
const CHAT_FINDINGS = 8

/** Hallazgos visibles en el resumen antes de "Ver todos". */
const SUMMARY_FINDINGS = 6

type Gravedad = HallazgoInspeccion['gravedad']

const GRAVEDAD_ORDER: Record<Gravedad, number> = { MUY_GRAVE: 0, GRAVE: 1, LEVE: 2 }

const GRAVEDAD_LABEL: Record<Gravedad, string> = {
  LEVE: 'Leve',
  GRAVE: 'Grave',
  MUY_GRAVE: 'Muy grave',
}

/** Escala de color por gravedad: ámbar → rojo → rojo intenso (muy grave es lo más alarmante). */
const GRAVEDAD_BADGE: Record<Gravedad, string> = {
  LEVE: 'bg-amber-50 text-amber-700 border border-amber-300',
  GRAVE: 'bg-crimson-50 text-crimson-600 border border-crimson-300',
  MUY_GRAVE: 'bg-crimson-600 text-white border border-crimson-600',
}

function describeSimulacroError(status: number | null): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión y presiona «Reintentar».'
  if (status === 403) {
    return 'Tu plan actual no incluye el simulacro. Revisa los planes disponibles o pide ayuda al administrador de tu cuenta.'
  }
  if (status === null) {
    return 'No pudimos conectarnos con el servidor. Revisa tu conexión a internet y presiona «Reintentar».'
  }
  return 'Tuvimos un problema al revisar tu legajo. Presiona «Reintentar» en unos segundos.'
}

class RequestError extends Error {
  readonly status: number | null
  constructor(status: number | null) {
    super(status === null ? 'network' : `status ${status}`)
    this.status = status
  }
}

export default function SimulacroPage() {
  const [phase, setPhase] = useState<'cover' | 'running' | 'inspection' | 'result' | 'error'>('cover')
  const [tipo, setTipo] = useState<InspeccionTipo>('PREVENTIVA')
  const [resultado, setResultado] = useState<ResultadoSimulacro | null>(null)
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null)
  const [tasksCreated, setTasksCreated] = useState<number | null>(null)
  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSimulacro = useCallback(async () => {
    setPhase('running')
    setError(null)
    try {
      // Ambas peticiones en paralelo: el perfil de la empresa se usa en el Acta PDF.
      const [simResp, orgResp] = await Promise.all([
        fetch('/api/simulacro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo }),
        }),
        fetch('/api/org/profile', { cache: 'no-store' }),
      ]).catch(() => {
        throw new RequestError(null)
      })
      if (!simResp.ok) throw new RequestError(simResp.status)
      const simData = (await simResp.json()) as ResultadoSimulacro & {
        diagnosticId: string
        tasksCreated?: number
      }
      setResultado(simData)
      setDiagnosticId(simData.diagnosticId)
      setTasksCreated(typeof simData.tasksCreated === 'number' ? simData.tasksCreated : null)

      // El perfil es opcional: si falla, no bloquea el simulacro.
      if (orgResp.ok) {
        const orgData = (await orgResp.json()) as {
          organization?: { name?: string; ruc?: string | null; razonSocial?: string | null }
        }
        if (orgData.organization) {
          setOrg({
            name: orgData.organization.name ?? 'Empresa',
            ruc: orgData.organization.ruc ?? null,
            razonSocial: orgData.organization.razonSocial ?? null,
          })
        }
      }
      setPhase('inspection')
    } catch (e) {
      setError(describeSimulacroError(e instanceof RequestError ? e.status : 500))
      setPhase('error')
    }
  }, [tipo])

  const showHeader = phase === 'cover' || phase === 'running' || phase === 'error'

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(239, 68, 68, 0.05), transparent 70%)',
        }}
      />

      <div className="mx-auto w-full max-w-4xl space-y-8">
        <Link
          href="/dashboard/centro-sunafil?tab=inspecciones"
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Centro SUNAFIL
        </Link>
        {showHeader ? (
          <PageHeader
            eyebrow="Simulacro SUNAFIL"
            title="Vive una inspección SUNAFIL <em>sin riesgo</em>."
            subtitle={`El inspector virtual revisa los ${simulacroDocCount('PREVENTIVA')} documentos que pediría SUNAFIL contra tu legajo real. Descubres las brechas antes de una inspección de verdad y te llevas un Acta con la multa estimada.`}
          />
        ) : null}
        {phase === 'cover' ? (
          <Cover tipo={tipo} setTipo={setTipo} onStart={runSimulacro} />
        ) : null}
        {phase === 'running' ? <RunningPanel tipo={tipo} /> : null}
        {phase === 'error' ? (
          <ErrorPanel
            error={error}
            onRetry={runSimulacro}
            onCancel={() => setPhase('cover')}
          />
        ) : null}
        {phase === 'inspection' && resultado ? (
          <InspectionChat resultado={resultado} onFinish={() => setPhase('result')} />
        ) : null}
        {phase === 'result' && resultado ? (
          <ResultCover
            resultado={resultado}
            diagnosticId={diagnosticId}
            tasksCreated={tasksCreated}
            org={org}
            onRestart={() => {
              setResultado(null)
              setDiagnosticId(null)
              setTasksCreated(null)
              setError(null)
              setPhase('cover')
            }}
          />
        ) : null}
      </div>
    </main>
  )
}

/* ── Portada ────────────────────────────────────────────────────────── */

function Cover({
  tipo,
  setTipo,
  onStart,
}: {
  tipo: InspeccionTipo
  setTipo: (t: InspeccionTipo) => void
  onStart: () => void
}) {
  return (
    <section className="space-y-8 motion-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pillar
          icon={Shield}
          title={`${INFRAC_META.total} infracciones`}
          description={`Cruzamos con el D.S. 019-2006-TR: ${INFRAC_META.countByGravity.LEVE} leves · ${INFRAC_META.countByGravity.GRAVE} graves · ${INFRAC_META.countByGravity.MUY_GRAVE} muy graves.`}
        />
        <Pillar
          icon={FileCheck}
          title="Legajo real"
          description="Leemos los documentos cargados de cada trabajador. Verde si está, rojo si falta, naranja si venció."
        />
        <Pillar
          icon={FileText}
          title="Acta de requerimiento"
          description="Al final descargas un Acta en formato R.M. 199-2016-TR con la multa detallada."
        />
      </div>

      {/* Tipo de inspección */}
      <Card padding="md">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Tipo de inspección
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TipoButton
              active={tipo === 'PREVENTIVA'}
              onClick={() => setTipo('PREVENTIVA')}
              label="Preventiva"
              description={`Revisa los ${simulacroDocCount('PREVENTIVA')} documentos (todas las áreas).`}
            />
            <TipoButton
              active={tipo === 'PROGRAMA_SECTORIAL'}
              onClick={() => setTipo('PROGRAMA_SECTORIAL')}
              label="Programa sectorial"
              description={`Se enfoca en SST, contratos y registros: ${simulacroDocCount('PROGRAMA_SECTORIAL')} documentos (sectores de alto riesgo).`}
            />
          </div>
        </div>
      </Card>

      <Card padding="md" variant="outline">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-[color:var(--text-tertiary)] shrink-0" />
          <span className="text-sm text-[color:var(--text-secondary)]">
            Duración estimada: <strong className="text-[color:var(--text-primary)]">{SIMULACRO_ESTIMATE}</strong>.
            La revisión corre sola contra tu legajo real y queda guardada como diagnóstico.
          </span>
        </div>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          variant="danger"
          icon={<Siren className="h-4 w-4" />}
          onClick={onStart}
        >
          Iniciar simulacro
        </Button>
      </div>
    </section>
  )
}

function TipoButton({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500/60',
        active
          ? 'border-crimson-300 bg-crimson-50 text-crimson-900'
          : 'border-[color:var(--border-default)] bg-white hover:border-crimson-300 hover:bg-crimson-50/30'
      )}
      aria-pressed={active}
    >
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-0.5 text-xs text-[color:var(--text-secondary)] leading-relaxed">
        {description}
      </p>
    </button>
  )
}

function Pillar({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-300">
          <Icon className="h-4 w-4 text-crimson-700" />
        </span>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  )
}

/* ── Paneles de carga y error ──────────────────────────────────────── */

function RunningPanel({ tipo }: { tipo: InspeccionTipo }) {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center motion-fade-in-up">
      <Loader2 className="h-8 w-8 text-crimson-700 animate-spin" />
      <p className="text-base font-bold">Revisando tu legajo…</p>
      <p className="max-w-md text-sm text-[color:var(--text-tertiary)]">
        Estamos cruzando {simulacroDocCount(tipo)} documentos obligatorios contra el
        D.S. 019-2006-TR y calculando la multa según el tamaño de tu empresa.
      </p>
    </section>
  )
}

function ErrorPanel({
  error,
  onRetry,
  onCancel,
}: {
  error: string | null
  onRetry: () => void
  onCancel: () => void
}) {
  return (
    <section
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center motion-fade-in-up"
    >
      <AlertTriangle className="h-8 w-8 text-crimson-700" />
      <div>
        <p className="text-base font-bold">No pudimos correr el simulacro</p>
        <p className="mt-1 max-w-md text-sm text-[color:var(--text-tertiary)]">
          {error ?? describeSimulacroError(500)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  )
}

/* ── Chat de inspección ─────────────────────────────────────────────── */

/** Observados primero (no cumple → parcial), y dentro de cada grupo los más graves. */
function sortHallazgos(hallazgos: HallazgoInspeccion[]): HallazgoInspeccion[] {
  const estadoOrder: Record<HallazgoInspeccion['estado'], number> = {
    NO_CUMPLE: 0,
    PARCIAL: 1,
    CUMPLE: 2,
    NO_APLICA: 3,
  }
  return [...hallazgos].sort(
    (a, b) =>
      estadoOrder[a.estado] - estadoOrder[b.estado] ||
      GRAVEDAD_ORDER[a.gravedad] - GRAVEDAD_ORDER[b.gravedad] ||
      b.multaPEN - a.multaPEN
  )
}

function InspectionChat({
  resultado,
  onFinish,
}: {
  resultado: ResultadoSimulacro
  onFinish: () => void
}) {
  // Cada paso muestra un requerimiento del inspector junto con su resultado.
  const findings = useMemo(
    () => sortHallazgos(resultado.hallazgos).slice(0, CHAT_FINDINGS),
    [resultado]
  )
  const [shown, setShown] = useState(1)
  const visible = findings.slice(0, shown)
  const done = shown >= findings.length

  return (
    <section className="space-y-4 motion-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-300">
            <Building2 className="h-3.5 w-3.5 text-crimson-700" />
          </span>
          <div>
            <p className="text-sm font-bold">Inspector virtual · Sesión 001</p>
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              {resultado.tipo === 'PROGRAMA_SECTORIAL'
                ? `Programa sectorial · SST, contratos y registros · ${resultado.totalSolicitudes} documentos`
                : `Inspección preventiva · ${resultado.totalSolicitudes} documentos`}
            </p>
          </div>
        </div>
        <Badge variant="critical" size="sm" dot>
          En curso
        </Badge>
      </div>

      <Card padding="none" className="min-h-[420px] flex flex-col">
        <CardContent className="flex-1 space-y-3 !py-5" aria-live="polite">
          {visible.map((h, idx) => (
            <div key={`${h.solicitudId}-${idx}`} className="space-y-3 motion-fade-in-up">
              <InspectorMessage text={`Requerimiento: ${h.documentoLabel}`} />
              <VerdictMessage hallazgo={h} />
            </div>
          ))}
        </CardContent>
        <div className="px-6 py-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/40 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Requerimiento {Math.min(shown, findings.length)} de {findings.length}
            {' · '}
            <strong className="text-[color:var(--text-secondary)]">
              {resultado.totalSolicitudes}
            </strong>{' '}
            documentos revisados en total
          </p>
          {done ? (
            <Button onClick={onFinish} iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              Ver informe completo
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onFinish}>
                Ver todos los hallazgos
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShown((s) => s + 1)}>
                Siguiente requerimiento
              </Button>
            </div>
          )}
        </div>
      </Card>
    </section>
  )
}

function InspectorMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-300">
        <Building2 className="h-3.5 w-3.5 text-crimson-700" />
      </span>
      <Card variant="outline" padding="md" className="max-w-[75%]">
        <p className="text-sm leading-relaxed">{text}</p>
      </Card>
    </div>
  )
}

function VerdictMessage({ hallazgo }: { hallazgo: HallazgoInspeccion }) {
  const map = {
    CUMPLE: {
      tone: 'emerald' as const,
      icon: CheckCircle2,
      label: 'Encontrado',
      textClass: 'text-emerald-600',
    },
    PARCIAL: {
      tone: 'amber' as const,
      icon: AlertTriangle,
      label: 'Incompleto o vencido',
      textClass: 'text-amber-600',
    },
    NO_CUMPLE: {
      tone: 'crimson' as const,
      icon: XCircle,
      label: 'Falta',
      textClass: 'text-crimson-700',
    },
    NO_APLICA: {
      tone: 'neutral' as const,
      icon: CheckCircle2,
      label: 'No aplica',
      textClass: 'text-[color:var(--text-tertiary)]',
    },
  } as const
  const v = map[hallazgo.estado]
  const VIcon = v.icon
  const multa = hallazgo.multaPEN > 0
    ? formatSoles(hallazgo.multaPEN)
    : null

  return (
    <div className="flex gap-3 justify-end">
      <Card
        variant={v.tone === 'emerald' ? 'emerald' : v.tone === 'crimson' ? 'crimson' : v.tone === 'amber' ? 'amber' : 'default'}
        padding="md"
        className="max-w-[75%]"
      >
        <div className="flex items-center gap-2 mb-2">
          <VIcon className={cn('h-3.5 w-3.5', v.textClass)} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{v.label}</span>
          {multa ? (
            <span className="ml-auto text-[10px] font-mono font-bold text-crimson-700">
              {multa}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-[color:var(--text-tertiary)]">{hallazgo.documentoLabel}</p>
        <p className="mt-1 text-sm font-semibold">{hallazgo.mensaje}</p>
        <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)] font-mono">
          {hallazgo.baseLegal} · Infracción {GRAVEDAD_LABEL[hallazgo.gravedad].toLowerCase()}
        </p>
      </Card>
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
      </span>
    </div>
  )
}

/* ── Resumen final ──────────────────────────────────────────────────── */

function ResultCover({
  resultado,
  diagnosticId,
  tasksCreated,
  org,
  onRestart,
}: {
  resultado: ResultadoSimulacro
  diagnosticId: string | null
  tasksCreated: number | null
  org: OrgProfile | null
  onRestart: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [showAllFindings, setShowAllFindings] = useState(false)

  const observados = useMemo(
    () =>
      sortHallazgos(resultado.hallazgos).filter(
        (h) => h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL'
      ),
    [resultado]
  )
  const visibleFindings = showAllFindings ? observados : observados.slice(0, SUMMARY_FINDINGS)

  const sumMultaByGravity = (g: Gravedad) =>
    observados.filter((h) => h.gravedad === g).reduce((s, h) => s + h.multaPEN, 0)

  async function downloadActa() {
    if (!diagnosticId) {
      setDownloadError('No encontramos este simulacro. Vuelve a correrlo para generar el Acta.')
      return
    }
    setDownloading(true)
    setDownloadError(null)
    try {
      const r = await fetch('/api/simulacro/acta/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosticId,
          orgName: org?.razonSocial ?? org?.name ?? 'Empresa',
          ruc: org?.ruc ?? '',
        }),
      })
      if (!r.ok) {
        throw new Error(
          r.status === 404
            ? 'No encontramos este simulacro. Vuelve a correrlo para generar el Acta.'
            : 'No pudimos generar el Acta en PDF. Inténtalo otra vez en unos segundos.'
        )
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const score = resultado.scoreSimulacro
      const dateStr = new Date().toISOString().slice(0, 10)
      link.download = `COMPLY360_Acta_Simulacro_${score}pts_${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Damos un momento al navegador para iniciar la descarga antes de liberar la URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setDownloadError(
        e instanceof Error && e.message
          ? e.message
          : 'No pudimos generar el Acta en PDF. Inténtalo otra vez en unos segundos.'
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="space-y-6 motion-fade-in-up">
      <div className="text-center space-y-2">
        <FileCheck className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Acta de requerimiento generada
        </h1>
        <p className="text-[color:var(--text-secondary)] max-w-xl mx-auto">
          <strong>{observados.length}</strong>{' '}
          {observados.length === 1 ? 'observación' : 'observaciones'} · multa potencial{' '}
          <strong className="text-crimson-700">{formatSoles(resultado.multaTotal)}</strong>.
          Si corriges antes de una inspección real:{' '}
          <strong className="text-emerald-700">
            {formatSoles(resultado.multaConSubsanacion)}
          </strong>{' '}
          (−90%).
        </p>
      </div>

      {/* Puntaje */}
      <div className="flex justify-center">
        <Card padding="md" className="inline-flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Puntaje del simulacro
          </span>
          <span
            className={cn(
              'text-4xl font-bold tabular-nums',
              resultado.scoreSimulacro >= 80
                ? 'text-emerald-700'
                : resultado.scoreSimulacro >= 60
                  ? 'text-amber-700'
                  : 'text-crimson-700'
            )}
          >
            {resultado.scoreSimulacro}
          </span>
          <span className="text-sm text-[color:var(--text-tertiary)]">/ 100</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FindingCard
          label="Infracciones leves"
          count={resultado.infraccionesLeves}
          total={formatSoles(sumMultaByGravity('LEVE'))}
          gravedad="LEVE"
        />
        <FindingCard
          label="Infracciones graves"
          count={resultado.infraccionesGraves}
          total={formatSoles(sumMultaByGravity('GRAVE'))}
          gravedad="GRAVE"
        />
        <FindingCard
          label="Infracciones muy graves"
          count={resultado.infraccionesMuyGraves}
          total={formatSoles(sumMultaByGravity('MUY_GRAVE'))}
          gravedad="MUY_GRAVE"
        />
      </div>

      {/* Hallazgos con acción */}
      <Card padding="lg">
        <CardHeader className="!p-0 !pb-4 !border-none">
          <div>
            <CardTitle>Hallazgos</CardTitle>
            <CardDescription>
              Ordenados por gravedad. Cada uno pasa a tu Centro de acción como tarea, para que lo
              resuelvas y adjuntes la evidencia.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-md border border-crimson-300 bg-crimson-50 px-2 py-0.5 text-[11px] font-semibold text-crimson-700">
            {observados.length} {observados.length === 1 ? 'observado' : 'observados'}
          </span>
        </CardHeader>
        <CardContent className="!p-0">
          {observados.length === 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              El inspector no encontró observaciones. ¡Buen trabajo! Mantén tu legajo al día.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--border-subtle)]">
              {visibleFindings.map((h, i) => (
                <li key={`${h.solicitudId}-${i}`} className="py-3 flex flex-wrap items-start gap-3 sm:flex-nowrap">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold shrink-0',
                      GRAVEDAD_BADGE[h.gravedad]
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{h.documentoLabel}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)]">
                      {h.estado === 'PARCIAL' ? 'Incompleto o vencido' : 'Falta'} · {h.baseLegal} ·{' '}
                      Infracción {GRAVEDAD_LABEL[h.gravedad].toLowerCase()}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-crimson-700 shrink-0 sm:pt-0.5">
                    {formatSoles(h.multaPEN)}
                  </span>
                  <Link
                    href={PLAN_ACCION_HREF}
                    aria-label={`Resolver: ${h.documentoLabel}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Resolver
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {observados.length > SUMMARY_FINDINGS ? (
            <button
              type="button"
              onClick={() => setShowAllFindings((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
            >
              {showAllFindings ? 'Ver menos' : `Ver los ${observados.length} hallazgos`}
              {showAllFindings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            icon={
              downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )
            }
            onClick={downloadActa}
            disabled={downloading || !diagnosticId}
          >
            {downloading ? 'Generando PDF…' : 'Descargar Acta (PDF)'}
          </Button>
          <Button asChild variant="secondary">
            <Link href={PLAN_ACCION_HREF} className="inline-flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              {tasksCreated && tasksCreated > 0
                ? `Ver mi plan de acción (${tasksCreated} ${tasksCreated === 1 ? 'nueva' : 'nuevas'})`
                : 'Ver mi plan de acción'}
            </Link>
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            Rehacer simulacro
          </Button>
        </div>
        {tasksCreated !== null ? (
          <p className="text-xs text-[color:var(--text-tertiary)]">
            {tasksCreated > 0
              ? `Ya dejamos ${tasksCreated} tarea${tasksCreated === 1 ? '' : 's'} en tu Centro de acción.`
              : 'Las tareas ya estaban creadas o no hubo nuevos incumplimientos.'}
          </p>
        ) : null}
        {downloadError ? (
          <p role="alert" className="text-xs text-crimson-700">{downloadError}</p>
        ) : null}
        {!diagnosticId ? (
          <p className="text-xs text-[color:var(--text-tertiary)]">
            El Acta está disponible después de correr el simulacro.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function FindingCard({
  label,
  count,
  total,
  gravedad,
}: {
  label: string
  count: number
  total: string
  gravedad: Gravedad
}) {
  // Escala creciente: leve (ámbar) → grave (rojo) → muy grave (rojo intenso, borde grueso).
  const BOX: Record<Gravedad, string> = {
    LEVE: 'bg-amber-50 border border-amber-300',
    GRAVE: 'bg-crimson-50 border border-crimson-300',
    MUY_GRAVE: 'bg-crimson-100 border-2 border-crimson-600 shadow-[0_0_0_3px_rgba(220,38,38,0.12)]',
  }
  const TEXT: Record<Gravedad, string> = {
    LEVE: 'text-amber-600',
    GRAVE: 'text-crimson-600',
    MUY_GRAVE: 'text-crimson-700',
  }
  return (
    <div className={cn('rounded-xl p-4', BOX[gravedad])}>
      <p
        className={cn(
          'flex items-center gap-1.5 text-[11px] uppercase tracking-widest',
          gravedad === 'MUY_GRAVE' ? 'font-bold text-crimson-700' : 'text-[color:var(--text-tertiary)]'
        )}
      >
        {gravedad === 'MUY_GRAVE' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {label}
      </p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', TEXT[gravedad])}>{count}</p>
      <p className="mt-1 text-xs text-[color:var(--text-secondary)] font-mono">{total}</p>
    </div>
  )
}
