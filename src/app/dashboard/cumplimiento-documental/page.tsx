'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  Upload,
  Loader2,
  ExternalLink,
  Sparkles,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'

/**
 * /dashboard/cumplimiento-documental — Grid de constancias obligatorias
 * que la empresa debe mantener subidas + vigentes.
 *
 * Para cada DocumentRequirement, muestra:
 *   - Estado: VIGENTE | POR_VENCER | VENCIDO | FALTANTE
 *   - Última versión subida (si existe)
 *   - Días hasta próxima renovación
 *   - Botón para subir/actualizar
 *
 * Las constancias subidas se procesan con IA verifier especializado
 * (src/lib/ai/org-constancy-verifier.ts) que extrae fechas de vigencia,
 * datos clave y valida cross-match con la empresa.
 */

type DocStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'FALTANTE'

interface StatusEntry {
  requirement: {
    documentType: string
    isRequired: boolean
    renewalFrequencyDays: number | null
    criticality: string
    helpText: string | null
    baseLegal: string | null
  }
  currentDoc: {
    id: string
    type: string
    title: string
    fileUrl: string | null
    publishedAt: string | null
    validUntil: string | null
    createdAt: string
  } | null
  status: DocStatus
  daysUntilExpiry: number | null
  nextRenewalAt: string | null
}

interface Summary {
  total: number
  vigente: number
  porVencer: number
  vencido: number
  faltante: number
}

const DOC_TYPE_LABEL: Record<string, string> = {
  SCTR_POLIZA: 'Póliza SCTR',
  REMYPE_CONSTANCIA: 'Constancia REMYPE',
  CTS_DEPOSITO_CONSTANCIA: 'Depósito CTS',
  AFP_PAGO_CONSTANCIA: 'Pago AFP',
  ONP_PAGO_CONSTANCIA: 'Pago ONP',
  ESSALUD_PAGO_CONSTANCIA: 'Pago EsSalud',
  PLAME_CONFIRMACION: 'PLAME (envío SUNAT)',
  DJ_UTILIDADES: 'DJ Anual Utilidades',
  INFORME_LAB_FISICO: 'Monitoreo agentes físicos',
  INFORME_LAB_QUIMICO: 'Monitoreo agentes químicos',
  INFORME_LAB_BIOLOGICO: 'Monitoreo agentes biológicos',
  INFORME_LAB_ERGONOMICO: 'Evaluación ergonómica',
  INFORME_LAB_PSICOSOCIAL: 'Evaluación psicosocial',
  ACTA_SIMULACRO_EVACUACION: 'Acta simulacro evacuación',
  ACTA_COMITE_SST_MENSUAL: 'Acta mensual Comité SST',
  INFORME_ANUAL_HOSTIGAMIENTO_MTPE: 'Informe anual hostigamiento MTPE',
  CONVENIO_PRACTICAS_REGISTRADO_MTPE: 'Convenio prácticas MTPE',
  AUTORIZACION_MTPE_EXTRANJERO: 'Autorización MTPE extranjero',
  REGISTRO_SUNAFIL_TERCERIZADORA: 'Registro SUNAFIL tercerizadora',
  CONSTANCIA_SEGURO_VIDA_LEY: 'Seguro Vida Ley',
  CUADRO_CATEGORIAS_LEY_30709: 'Cuadro categorías (Ley 30709)',
  MAPA_RIESGOS_ACTUALIZADO: 'Mapa de riesgos',
  POLITICA_SST: 'Política SST escrita',
  POLITICA_HOSTIGAMIENTO: 'Política hostigamiento',
  RIT: 'Reglamento Interno de Trabajo',
  T_REGISTRO_CONSTANCIA_ALTA: 'Constancia alta T-REGISTRO',
  T_REGISTRO_CONSTANCIA_BAJA: 'Constancia baja T-REGISTRO',
  SINTESIS_LEGISLACION_LABORAL: 'Síntesis legislación laboral',
  REPORTE_HIGIENE_INSTALACIONES: 'Reporte higiene instalaciones',
}

export default function CumplimientoDocumentalPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [filter, setFilter] = useState<DocStatus | 'ALL'>('ALL')
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/document-requirements', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = (await r.json()) as { summary: Summary; statuses: StatusEntry[] }
      setSummary(data.summary)
      setStatuses(data.statuses)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function seedDefaults() {
    setSeeding(true)
    try {
      const r = await fetch('/api/document-requirements', { method: 'PATCH' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSeeding(false)
    }
  }

  const filtered =
    filter === 'ALL' ? statuses : statuses.filter((s) => s.status === filter)

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Cumplimiento documental"
          title="Constancias <em>obligatorias SUNAFIL</em> de tu empresa"
          subtitle="Mantén subidas y vigentes las constancias que SUNAFIL puede pedirte en cualquier inspección. La IA valida cada documento, extrae fechas de vencimiento y te alerta antes de que vencen."
        />

        {/* Summary tiles */}
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile
              label="Vigentes"
              count={summary.vigente}
              total={summary.total}
              icon={CheckCircle2}
              tone="emerald"
              active={filter === 'VIGENTE'}
              onClick={() => setFilter(filter === 'VIGENTE' ? 'ALL' : 'VIGENTE')}
            />
            <SummaryTile
              label="Por vencer"
              count={summary.porVencer}
              total={summary.total}
              icon={Clock}
              tone="amber"
              active={filter === 'POR_VENCER'}
              onClick={() => setFilter(filter === 'POR_VENCER' ? 'ALL' : 'POR_VENCER')}
            />
            <SummaryTile
              label="Vencidos"
              count={summary.vencido}
              total={summary.total}
              icon={XCircle}
              tone="crimson"
              active={filter === 'VENCIDO'}
              onClick={() => setFilter(filter === 'VENCIDO' ? 'ALL' : 'VENCIDO')}
            />
            <SummaryTile
              label="Faltantes"
              count={summary.faltante}
              total={summary.total}
              icon={AlertTriangle}
              tone="crimson"
              active={filter === 'FALTANTE'}
              onClick={() => setFilter(filter === 'FALTANTE' ? 'ALL' : 'FALTANTE')}
            />
          </div>
        ) : null}

        {/* Body */}
        {loading ? (
          <LoadingPanel />
        ) : error ? (
          <ErrorPanel error={error} onRetry={load} />
        ) : statuses.length === 0 ? (
          <EmptyPanel onSeed={seedDefaults} seeding={seeding} />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((s) => (
              <RequirementCard key={s.requirement.documentType} entry={s} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

/* ── Components ─────────────────────────────────────────────────────── */

function SummaryTile({
  label,
  count,
  total,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string
  count: number
  total: number
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'amber' | 'crimson'
  active: boolean
  onClick: () => void
}) {
  const toneClasses = {
    emerald: active
      ? 'border-emerald-400 bg-emerald-50'
      : 'border-emerald-200 bg-white hover:border-emerald-300',
    amber: active
      ? 'border-amber-400 bg-amber-50'
      : 'border-amber-200 bg-white hover:border-amber-300',
    crimson: active
      ? 'border-crimson-400 bg-crimson-50'
      : 'border-crimson-200 bg-white hover:border-crimson-300',
  }[tone]
  const iconColor =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'amber'
        ? 'text-amber-600'
        : 'text-crimson-600'
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'rounded-xl border p-4 text-left transition-all',
        toneClasses,
        active && 'shadow-sm'
      )}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between">
        <Icon className={cn('h-5 w-5', iconColor)} />
        <span className="text-3xl font-bold tabular-nums">{count}</span>
      </div>
      <div className="mt-2 text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
        {label}
      </div>
      <div className="text-xs text-[color:var(--text-tertiary)]">de {total}</div>
    </button>
  )
}

function RequirementCard({ entry }: { entry: StatusEntry }) {
  const label = DOC_TYPE_LABEL[entry.requirement.documentType] ?? entry.requirement.documentType
  const statusTone = {
    VIGENTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POR_VENCER: 'bg-amber-50 text-amber-700 border-amber-200',
    VENCIDO: 'bg-crimson-50 text-crimson-700 border-crimson-200',
    FALTANTE: 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)] border-[color:var(--border-default)]',
  }[entry.status]
  const StatusIcon = {
    VIGENTE: CheckCircle2,
    POR_VENCER: Clock,
    VENCIDO: XCircle,
    FALTANTE: AlertTriangle,
  }[entry.status]
  const statusLabel = {
    VIGENTE: 'Vigente',
    POR_VENCER: `Por vencer en ${entry.daysUntilExpiry} días`,
    VENCIDO: `Vencido hace ${Math.abs(entry.daysUntilExpiry ?? 0)} días`,
    FALTANTE: 'No subido',
  }[entry.status]

  return (
    <li>
      <Card padding="md" className="h-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                  statusTone
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {statusLabel}
              </span>
              {entry.requirement.criticality === 'CRITICAL' ? (
                <Badge variant="critical" size="sm">
                  Crítica
                </Badge>
              ) : entry.requirement.criticality === 'HIGH' ? (
                <Badge variant="high" size="sm">
                  Alta
                </Badge>
              ) : null}
            </div>
            <h3 className="text-base font-bold">{label}</h3>
            {entry.requirement.baseLegal ? (
              <p className="text-[10px] font-mono text-[color:var(--text-tertiary)]">
                {entry.requirement.baseLegal}
              </p>
            ) : null}
          </div>
          <FileText className="h-5 w-5 text-[color:var(--text-tertiary)] shrink-0 mt-1" />
        </div>

        {entry.requirement.helpText ? (
          <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed mb-3">
            {entry.requirement.helpText}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[color:var(--border-subtle)]">
          <div className="text-xs text-[color:var(--text-tertiary)]">
            {entry.currentDoc ? (
              <a
                href={entry.currentDoc.fileUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Ver último ({new Date(entry.currentDoc.createdAt).toLocaleDateString('es-PE')})
              </a>
            ) : (
              <span>Sin documentos subidos</span>
            )}
          </div>
          <Button
            size="sm"
            variant={entry.status === 'FALTANTE' || entry.status === 'VENCIDO' ? 'primary' : 'ghost'}
            icon={<Upload className="h-3 w-3" />}
          >
            {entry.currentDoc ? 'Actualizar' : 'Subir'}
          </Button>
        </div>
      </Card>
    </li>
  )
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--text-tertiary)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      Cargando constancias…
    </div>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card padding="lg" className="text-center">
      <AlertTriangle className="h-8 w-8 text-crimson-700 mx-auto mb-3" />
      <p className="text-base font-bold">No pudimos cargar las constancias</p>
      <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{error}</p>
      <Button size="sm" onClick={onRetry} className="mt-4">
        Reintentar
      </Button>
    </Card>
  )
}

function EmptyPanel({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <Card padding="lg" className="text-center">
      <Sparkles className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
      <h3 className="text-lg font-bold">Aún no tienes requirements configurados</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-[color:var(--text-tertiary)]">
        Inicia con la matriz de constancias obligatorias por defecto: SCTR, CTS, AFP, EsSalud,
        PLAME, simulacros, actas del Comité SST y más. Después puedes personalizar la lista
        según tu sector y régimen.
      </p>
      <Button
        size="lg"
        onClick={onSeed}
        disabled={seeding}
        icon={
          seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />
        }
        className="mt-4"
      >
        {seeding ? 'Configurando…' : 'Cargar matriz por defecto'}
      </Button>
    </Card>
  )
}
