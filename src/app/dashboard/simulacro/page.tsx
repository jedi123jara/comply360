'use client'

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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/comply360/editorial-title'
import { cn } from '@/lib/utils'
import { INFRAC_META } from '@/lib/legal-engine/infracciones-sunafil'
import type {
  InspeccionTipo,
  ResultadoSimulacro,
  HallazgoInspeccion,
} from '@/lib/compliance/simulacro-engine'

/**
 * /dashboard/simulacro — Simulacro SUNAFIL contra legajo real.
 *
 * Flow:
 *  1. Cover — elige tipo de inspección (PREVENTIVA | PROGRAMA_SECTORIAL).
 *  2. POST /api/simulacro — el server lee workers + documents del orgId, corre
 *     `evaluarSolicitud()` contra cada uno de los 28 documentos SUNAFIL y genera
 *     `ResultadoSimulacro` con multas reales (escala D.S. 019-2006-TR por tamaño).
 *     El diagnostic se persiste en `ComplianceDiagnostic(type=SIMULATION)`.
 *  3. InspectionChat — reproduce las solicitudes en UI tipo chat mostrando
 *     los hallazgos reales uno a uno.
 *  4. ResultCover — resumen con multa total, subsanación −90% y CTA al Acta.
 */
interface OrgProfile {
  name: string
  ruc: string | null
  razonSocial: string | null
}

export default function SimulacroPage() {
  const [phase, setPhase] = useState<'cover' | 'running' | 'inspection' | 'result' | 'error'>('cover')
  const [tipo, setTipo] = useState<InspeccionTipo>('PREVENTIVA')
  const [resultado, setResultado] = useState<ResultadoSimulacro | null>(null)
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null)
  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSimulacro = useCallback(async () => {
    setPhase('running')
    setError(null)
    try {
      // Fire both requests in parallel — org profile is needed for the Acta PDF.
      const [simResp, orgResp] = await Promise.all([
        fetch('/api/simulacro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo }),
        }),
        fetch('/api/org/profile', { cache: 'no-store' }),
      ])
      if (!simResp.ok) throw new Error(`Simulacro HTTP ${simResp.status}`)
      const simData = (await simResp.json()) as ResultadoSimulacro & { diagnosticId: string }
      setResultado(simData)
      setDiagnosticId(simData.diagnosticId)

      // Org profile is nice-to-have — a failure shouldn't block the simulacro.
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
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setPhase('error')
    }
  }, [tipo])

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
        <PageHeader
          eyebrow="Simulacro"
          title="Vive una inspección SUNAFIL <em>simulada</em>."
          subtitle="El inspector virtual revisa los 28 documentos que pediría SUNAFIL contra tu legajo real y te entrega un Acta con multa estimada."
        />
        {phase === 'cover' ? (
          <Cover tipo={tipo} setTipo={setTipo} onStart={runSimulacro} />
        ) : null}
        {phase === 'running' ? <RunningPanel /> : null}
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
            org={org}
            onRestart={() => {
              setResultado(null)
              setDiagnosticId(null)
              setError(null)
              setPhase('cover')
            }}
          />
        ) : null}
      </div>
    </main>
  )
}

/* ── Cover ──────────────────────────────────────────────────────────── */

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
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-crimson-50 border border-crimson-200">
            <Siren className="h-5 w-5 text-crimson-700" />
          </span>
          <Badge variant="danger" size="sm" dot>
            Simulacro SUNAFIL
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Enfrentá una inspección sin riesgo
        </h1>
        <p className="text-lg text-[color:var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          El inspector virtual revisa los mismos 28 documentos que pediría SUNAFIL,
          contrastándolos con tu legajo real. Descubrimos las brechas antes que te
          multen — con descuento del 90% por subsanación voluntaria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pillar
          icon={Shield}
          title={`${INFRAC_META.total} infracciones`}
          description={`Cruzamos con el D.S. 019-2006-TR — ${INFRAC_META.countByGravity.LEVE} leves · ${INFRAC_META.countByGravity.GRAVE} graves · ${INFRAC_META.countByGravity.MUY_GRAVE} muy graves.`}
        />
        <Pillar
          icon={FileCheck}
          title="Legajo real"
          description="Leemos los documentos cargados por cada trabajador. Verde si está, rojo si falta, naranja si venció."
        />
        <Pillar
          icon={FileText}
          title="Acta real"
          description="Al final descargás un Acta de Requerimiento formato R.M. 199-2016-TR con multa granular."
        />
      </div>

      {/* Tipo selector */}
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
              description="Revisa los 28 documentos completos (todas las áreas)."
            />
            <TipoButton
              active={tipo === 'PROGRAMA_SECTORIAL'}
              onClick={() => setTipo('PROGRAMA_SECTORIAL')}
              label="Programa sectorial"
              description="Focalizada en SST + contratos + registros (sector alto-riesgo)."
            />
          </div>
        </div>
      </Card>

      <Card padding="md" variant="outline">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-[color:var(--text-tertiary)] shrink-0" />
          <span className="text-sm text-[color:var(--text-secondary)]">
            Duración estimada: <strong className="text-[color:var(--text-primary)]">10–15 minutos</strong>.
            La evaluación corre contra tu legajo real y queda guardada como diagnóstico.
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
          : 'border-[color:var(--border-default)] bg-white hover:border-crimson-200 hover:bg-crimson-50/30'
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
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
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

/* ── Running + error panels ────────────────────────────────────────── */

function RunningPanel() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center motion-fade-in-up">
      <Loader2 className="h-8 w-8 text-crimson-700 animate-spin" />
      <p className="text-base font-bold">Ejecutando simulacro…</p>
      <p className="max-w-md text-sm text-[color:var(--text-tertiary)]">
        Revisando legajo digital, cruzando 28 documentos obligatorios contra
        el D.S. 019-2006-TR y calculando multa por tamaño empresarial.
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
    <section className="flex flex-col items-center justify-center gap-4 py-24 text-center motion-fade-in-up">
      <AlertTriangle className="h-8 w-8 text-crimson-700" />
      <div>
        <p className="text-base font-bold">No pudimos correr el simulacro</p>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
          {error ?? 'Error desconocido del servidor'}
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

/* ── Inspection chat ────────────────────────────────────────────────── */

function InspectionChat({
  resultado,
  onFinish,
}: {
  resultado: ResultadoSimulacro
  onFinish: () => void
}) {
  const [step, setStep] = useState(0)
  // Flatten to alternating (inspector message, system verdict) entries
  type Entry =
    | { kind: 'inspector'; text: string }
    | { kind: 'verdict'; hallazgo: HallazgoInspeccion }
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = []
    // Limit to top 8 findings for a comfortable pace — prioritize NO_CUMPLE then PARCIAL
    const ordered = [...resultado.hallazgos].sort((a, b) => {
      const score: Record<HallazgoInspeccion['estado'], number> = {
        NO_CUMPLE: 0,
        PARCIAL: 1,
        CUMPLE: 2,
        NO_APLICA: 3,
      }
      return score[a.estado] - score[b.estado]
    })
    for (const h of ordered.slice(0, 8)) {
      list.push({ kind: 'inspector', text: `Requerimiento: ${h.documentoLabel}` })
      list.push({ kind: 'verdict', hallazgo: h })
    }
    return list
  }, [resultado])

  const visible = entries.slice(0, step + 1)
  const done = step >= entries.length - 1

  return (
    <section className="space-y-4 motion-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
            <Building2 className="h-3.5 w-3.5 text-crimson-700" />
          </span>
          <div>
            <p className="text-sm font-bold">Inspector virtual · Sesión 001</p>
            <p className="text-[11px] text-[color:var(--text-tertiary)]">
              {resultado.tipo === 'PROGRAMA_SECTORIAL'
                ? 'Programa sectorial · SST + contratos + registros'
                : 'Inspección preventiva · 28 documentos'}
            </p>
          </div>
        </div>
        <Badge variant="critical" size="sm" dot>
          EN CURSO
        </Badge>
      </div>

      <Card padding="none" className="min-h-[420px] flex flex-col">
        <CardContent className="flex-1 space-y-3 !py-5">
          {visible.map((e, idx) =>
            e.kind === 'inspector' ? (
              <InspectorMessage key={idx} text={e.text} />
            ) : (
              <VerdictMessage key={idx} hallazgo={e.hallazgo} />
            )
          )}
        </CardContent>
        <div className="px-6 py-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/40 flex items-center justify-between">
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Paso {Math.min(step + 1, entries.length)} de {entries.length}
            {' · '}
            <strong className="text-[color:var(--text-secondary)]">
              {resultado.totalSolicitudes}
            </strong>{' '}
            solicitudes totales
          </p>
          {done ? (
            <Button onClick={onFinish} iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              Ver informe completo
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

function InspectorMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-50 border border-crimson-200">
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
      label: 'ENCONTRADO',
      textClass: 'text-emerald-600',
    },
    PARCIAL: {
      tone: 'amber' as const,
      icon: AlertTriangle,
      label: 'PARCIAL / VENCIDO',
      textClass: 'text-amber-600',
    },
    NO_CUMPLE: {
      tone: 'crimson' as const,
      icon: XCircle,
      label: 'FALTANTE',
      textClass: 'text-crimson-700',
    },
    NO_APLICA: {
      tone: 'neutral' as const,
      icon: CheckCircle2,
      label: 'NO APLICA',
      textClass: 'text-[color:var(--text-tertiary)]',
    },
  } as const
  const v = map[hallazgo.estado]
  const VIcon = v.icon
  const multa = hallazgo.multaPEN > 0
    ? `S/ ${hallazgo.multaPEN.toLocaleString('es-PE')}`
    : null

  return (
    <div className="flex gap-3 justify-end">
      <Card
        variant={v.tone === 'emerald' ? 'emerald' : v.tone === 'crimson' ? 'crimson' : 'default'}
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
          {hallazgo.baseLegal} · {hallazgo.gravedad.replace('_', ' ')}
        </p>
      </Card>
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
      </span>
    </div>
  )
}

/* ── Result cover ───────────────────────────────────────────────────── */

function ResultCover({
  resultado,
  diagnosticId,
  org,
  onRestart,
}: {
  resultado: ResultadoSimulacro
  diagnosticId: string | null
  org: OrgProfile | null
  onRestart: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const fmt = (n: number) =>
    n > 0 ? `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}` : '—'

  const sumMultaByGravity = (g: 'LEVE' | 'GRAVE' | 'MUY_GRAVE') =>
    resultado.hallazgos
      .filter((h) => h.gravedad === g && (h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL'))
      .reduce((s, h) => s + h.multaPEN, 0)

  async function downloadActa() {
    if (!diagnosticId) {
      setDownloadError('No se encontró el ID del simulacro.')
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
        const body = await r.json().catch(() => ({}) as Record<string, unknown>)
        throw new Error((body as { error?: string }).error ?? `HTTP ${r.status}`)
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
      // Allow browser a tick to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Error al generar PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="space-y-6 motion-fade-in-up">
      <div className="text-center space-y-2">
        <FileCheck className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Acta de Requerimiento generada
        </h1>
        <p className="text-[color:var(--text-secondary)] max-w-xl mx-auto">
          <strong>
            {resultado.noCumple + resultado.parcial}
          </strong>{' '}
          {resultado.noCumple + resultado.parcial === 1 ? 'observación' : 'observaciones'} · multa potencial{' '}
          <strong className="text-crimson-700">{fmt(resultado.multaTotal)}</strong>.
          Subsanando antes de una inspección real:{' '}
          <strong className="text-emerald-700">
            {fmt(resultado.multaConSubsanacion)}
          </strong>{' '}
          (−90%).
        </p>
      </div>

      {/* Score pill */}
      <div className="flex justify-center">
        <Card padding="md" className="inline-flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Score simulacro
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
          total={fmt(sumMultaByGravity('LEVE'))}
          color="amber"
        />
        <FindingCard
          label="Infracciones graves"
          count={resultado.infraccionesGraves}
          total={fmt(sumMultaByGravity('GRAVE'))}
          color="crimson"
        />
        <FindingCard
          label="Infracciones muy graves"
          count={resultado.infraccionesMuyGraves}
          total={fmt(sumMultaByGravity('MUY_GRAVE'))}
          color="neutral"
        />
      </div>

      {/* Vista previa del acta — top findings */}
      <Card padding="lg">
        <CardHeader className="!p-0 !pb-4 !border-none">
          <div>
            <CardTitle>Hallazgos principales</CardTitle>
            <CardDescription>
              Top de observaciones ordenadas por gravedad — base para el Acta R.M. 199-2016-TR
            </CardDescription>
          </div>
          <Badge variant="emerald" size="sm">
            {resultado.hallazgos.filter((h) => h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA').length}{' '}
            observados
          </Badge>
        </CardHeader>
        <CardContent className="!p-0">
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {resultado.hallazgos
              .filter((h) => h.estado !== 'CUMPLE' && h.estado !== 'NO_APLICA')
              .slice(0, 6)
              .map((h, i) => (
                <li key={i} className="py-3 flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold shrink-0',
                      h.gravedad === 'MUY_GRAVE'
                        ? 'bg-crimson-50 text-crimson-700'
                        : h.gravedad === 'GRAVE'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{h.documentoLabel}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)] truncate">
                      {h.baseLegal} · {h.gravedad.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-crimson-700 shrink-0">
                    S/ {h.multaPEN.toLocaleString('es-PE')}
                  </span>
                </li>
              ))}
          </ul>
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
          <Button variant="secondary">Generar plan de subsanación</Button>
          <Button variant="ghost" onClick={onRestart}>
            Rehacer simulacro
          </Button>
        </div>
        {downloadError ? (
          <p className="text-xs text-crimson-700">{downloadError}</p>
        ) : null}
        {!diagnosticId ? (
          <p className="text-xs text-[color:var(--text-tertiary)]">
            El Acta está disponible tras correr el simulacro.
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
  color,
}: {
  label: string
  count: number
  total: string
  color: 'amber' | 'crimson' | 'neutral'
}) {
  const BG = {
    amber: 'bg-amber-50 border-amber-200',
    crimson: 'bg-crimson-50 border-crimson-200',
    neutral: 'bg-[color:var(--neutral-50)] border-[color:var(--border-default)]',
  }[color]
  const TEXT = {
    amber: 'text-amber-600',
    crimson: 'text-crimson-700',
    neutral: 'text-[color:var(--text-tertiary)]',
  }[color]
  return (
    <div className={cn('rounded-xl border p-4', BG)}>
      <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', TEXT)}>{count}</p>
      <p className="mt-1 text-xs text-[color:var(--text-secondary)] font-mono">{total}</p>
    </div>
  )
}
