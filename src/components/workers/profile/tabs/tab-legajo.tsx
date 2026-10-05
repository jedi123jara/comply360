'use client'

import { Fragment, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  Sparkles,
  ShieldAlert,
  CalendarCheck,
  Clock,
  XCircle,
  ChevronDown,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Tooltip } from '@/components/ui/tooltip'
import { Term, TermHint } from '@/components/ui/term'
import { cn } from '@/lib/utils'
import { formatSolesMarketing } from '@/lib/format/peruvian'
import { toast } from 'sonner'
import { compressImageIfNeeded } from '@/lib/storage/compress-image'
import {
  LEGAJO_DOCS,
  LEGAJO_CATEGORY_LABELS,
  LEGAJO_CATEGORY_ORDER,
  LEGAJO_CATEGORY_TERMS,
  GRAVITY_LABELS,
  getMultaReferencial,
  isRowComplete,
  legajoDocSegments,
  pickDocsByType,
  resolveDocStatus,
  summarizeLegajo,
  type LegajoDocDefinition,
  type LegajoRowStatus,
  type TextSegment,
} from '../../legajo-docs'
import type { ProfileTab } from '../profile-tabs'

/**
 * TabLegajo — checklist del legajo digital.
 *
 * Una fila por documento obligatorio (catálogo `legajo-docs.ts`) con su estado
 * (falta / subido / verificado / vencido), una explicación de por qué lo pide
 * la ley, la multa referencial si falta y un botón "Subir" que guarda el
 * archivo con la categoría y el tipo correctos (así cuenta para el score).
 */

export interface LegajoDoc {
  id: string
  category: 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE' | string
  /** Tipo canónico (`contrato_trabajo`, `dni_copia`, …). */
  documentType?: string | null
  title: string
  required: boolean
  status: 'VERIFIED' | 'UPLOADED' | 'PENDING' | 'EXPIRED' | 'MISSING' | string
  expiresAt?: string | null
  createdAt?: string | null
  /** Quién verificó el documento. 'ai-v1' = auto-verificación por IA. */
  verifiedBy?: string | null
  /** Resumen de verificación IA — opcional, se muestra como tooltip. */
  aiVerification?: {
    decision?: string | null
    confidence?: number | null
    summary?: string | null
    issues?: string[]
    /** Banderas de posible manipulación detectadas por la IA. */
    suspicionFlags?: string[]
    /** Score 0-1 de sospecha. ≥0.6 muestra badge rojo. */
    suspicionScore?: number
    /** true si la IA auto-seteó la fecha de vencimiento del documento. */
    expiresAtAppliedByAI?: boolean
  } | null
}

type UploadTarget = { kind: 'def'; def: LegajoDocDefinition } | { kind: 'otro' }

type RowMeta = { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }

const STATUS_META: Record<LegajoRowStatus, RowMeta> = {
  falta: { label: 'Falta', variant: 'danger' },
  vencido: { label: 'Vencido', variant: 'danger' },
  pendiente: { label: 'Por revisar', variant: 'warning' },
  subido: { label: 'Subido', variant: 'info' },
  verificado: { label: 'Verificado', variant: 'success' },
}

const RAW_STATUS_LABELS: Record<string, string> = {
  VERIFIED: 'Verificado',
  UPLOADED: 'Subido',
  PENDING: 'Por revisar',
  EXPIRED: 'Vencido',
  MISSING: 'Rechazado',
}

const KNOWN_TYPES = new Set(LEGAJO_DOCS.map((d) => d.type))

/** "Copia del DNI" → "copia del DNI"; respeta siglas como "IPERC del puesto". */
function lowerFirst(text: string): string {
  if (text.length < 2) return text.toLowerCase()
  const second = text.charAt(1)
  return second === second.toLowerCase() ? text.charAt(0).toLowerCase() + text.slice(1) : text
}

/** Texto con los términos del glosario enlazados (subrayado punteado + tarjeta "¿Qué es?"). */
function WithTerms({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.termId ? (
          <Term key={i} id={segment.termId}>
            {segment.text}
          </Term>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  )
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

/**
 * El contrato de trabajo admite un solo registro por trabajador (índice único
 * en BD). Si ya existe, se gestiona desde la pestaña Contratos.
 */
function canUploadDef(def: LegajoDocDefinition, existing: LegajoDoc | undefined): boolean {
  return !(def.type === 'contrato_trabajo' && existing)
}

export function TabLegajo({
  workerId,
  docs,
  onReload,
  onGoToTab,
}: {
  workerId: string
  docs: LegajoDoc[]
  /** Recarga los datos del perfil tras subir o verificar. */
  onReload?: () => Promise<void> | void
  onGoToTab?: (tab: ProfileTab) => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingTargetRef = useRef<UploadTarget | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const reload = async () => {
    if (onReload) await onReload()
    else router.refresh()
  }

  const startUpload = (target: UploadTarget) => {
    if (busyKey) return
    pendingTargetRef.current = target
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0]
    const target = pendingTargetRef.current
    // Reset input para que el mismo archivo se pueda re-seleccionar después
    e.target.value = ''
    if (!original || !target) return

    const key = target.kind === 'def' ? target.def.type : 'otro'
    const label = target.kind === 'def' ? target.def.title : original.name
    setBusyKey(key)
    const tid = `upload-${key}`

    // Comprimir si es imagen grande — Vercel limita body a ~4.5MB y los
    // celulares modernos toman fotos de 5-20MB. Sin compresión = HTTP 413.
    let fileToUpload = original
    try {
      toast.loading(`Preparando ${label}...`, { id: tid })
      const result = await compressImageIfNeeded(original)
      fileToUpload = result.file
      if (result.compressed) {
        const ratio = Math.round((1 - result.finalSize / result.originalSize) * 100)
        toast.loading(
          `Foto comprimida ${ratio}% (${(result.originalSize / 1024 / 1024).toFixed(1)} MB → ${(result.finalSize / 1024 / 1024).toFixed(1)} MB). Subiendo...`,
          { id: tid },
        )
      } else {
        toast.loading(`Subiendo ${label}...`, { id: tid })
      }
    } catch (err) {
      // El helper ya tira mensajes accionables ("comprime con una herramienta", "toma con menor resolución")
      toast.error(err instanceof Error ? err.message : 'El archivo es demasiado grande', { id: tid })
      setBusyKey(null)
      return
    }

    try {
      const fd = new FormData()
      fd.append('file', fileToUpload)
      if (target.kind === 'def') {
        // Categoría y tipo canónicos: así el documento cuenta para el score.
        fd.append('category', target.def.category)
        fd.append('documentType', target.def.type)
        fd.append('title', target.def.title)
        fd.append('isRequired', String(target.def.required))
      } else {
        fd.append('category', 'VIGENTE')
        fd.append('documentType', 'OTRO')
        fd.append('title', fileToUpload.name)
      }
      const res = await fetch(`/api/workers/${workerId}/documents`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('El archivo es demasiado grande para subir. Comprímelo o reduce su resolución.')
        }
        throw new Error(data.error || `No se pudo subir (HTTP ${res.status})`)
      }
      toast.success(`${label}: subido al legajo`, { id: tid })
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir el archivo', { id: tid })
    } finally {
      setBusyKey(null)
    }
  }

  const handleVerify = async (doc: LegajoDoc, label: string) => {
    if (busyKey) return
    setBusyKey(`verify-${doc.id}`)
    const tid = `verify-${doc.id}`
    try {
      const res = await fetch(`/api/workers/${workerId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id, action: 'verify' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `No se pudo verificar (HTTP ${res.status})`)
      toast.success(`${label}: marcado como verificado`, { id: tid })
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo verificar el documento', { id: tid })
    } finally {
      setBusyKey(null)
    }
  }

  const byType = pickDocsByType(docs)
  const summary = summarizeLegajo(docs)
  const percent = summary.total > 0 ? Math.round((summary.completeCount / summary.total) * 100) : 0
  const pendingVerification = summary.completeCount - summary.verifiedCount
  const nextToUpload = summary.missing.find((def) => canUploadDef(def, byType.get(def.type)))
  const optionalDefs = LEGAJO_DOCS.filter((d) => !d.required)
  const optionalUploaded = optionalDefs.filter((d) => byType.has(d.type)).length
  const otherDocs = docs.filter((d) => !d.documentType || !KNOWN_TYPES.has(d.documentType))
  const isBusy = busyKey !== null

  // Desglose de lo que falta para un mensaje preciso.
  const pendingStatuses = summary.missing.map((def) => resolveDocStatus(byType.get(def.type)))
  const faltanCount = pendingStatuses.filter((st) => st === 'falta').length
  const vencidosCount = pendingStatuses.filter((st) => st === 'vencido').length
  const porRevisarCount = pendingStatuses.filter((st) => st === 'pendiente').length
  const missingParts = [
    faltanCount > 0 ? `${faltanCount} ${faltanCount === 1 ? 'falta' : 'faltan'}` : null,
    vencidosCount > 0 ? `${vencidosCount} ${vencidosCount === 1 ? 'está vencido' : 'están vencidos'}` : null,
    porRevisarCount > 0 ? `${porRevisarCount} por revisar` : null,
  ].filter(Boolean)

  const rowProps = (def: LegajoDocDefinition) => {
    const doc = byType.get(def.type)
    return {
      def,
      doc,
      status: resolveDocStatus(doc),
      canUpload: canUploadDef(def, doc),
      uploading: busyKey === def.type,
      verifying: doc ? busyKey === `verify-${doc.id}` : false,
      disabled: isBusy,
      onUpload: () => startUpload({ kind: 'def', def }),
      onVerify: doc ? () => handleVerify(doc, def.title) : undefined,
      onGoToTab,
    }
  }

  return (
    <div className="space-y-4">
      {/* Input file oculto compartido por todos los botones "Subir" */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Resumen */}
      <Card
        padding="md"
        variant={summary.isComplete ? 'emerald' : docs.length === 0 ? 'amber' : 'default'}
        className="flex flex-col gap-5 sm:flex-row sm:items-center"
      >
        <ProgressRing value={percent} size={100} stroke={8}>
          <div className="text-center leading-none">
            <div className="text-xl font-bold text-emerald-700">{percent}%</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
              completo
            </div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Legajo digital
            <TermHint id="legajo" />
          </p>
          <p className="mt-0.5 text-xl font-bold tracking-tight">
            {summary.completeCount} de {summary.total} documentos obligatorios
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]" aria-live="polite">
            {summary.isComplete
              ? pendingVerification > 0
                ? `Legajo completo: tienes todos los documentos obligatorios. ${pendingVerification} ${pendingVerification === 1 ? 'está subido pero falta verificarlo' : 'están subidos pero falta verificarlos'}.`
                : 'Legajo completo y verificado. Tienes todos los documentos obligatorios.'
              : docs.length === 0
                ? 'Aún no hay documentos. Empieza por el contrato y el DNI: es lo primero que pide un inspector de SUNAFIL.'
                : `${summary.missing.length} ${summary.missing.length === 1 ? 'documento obligatorio necesita' : 'documentos obligatorios necesitan'} tu atención: ${missingParts.join(', ')}.`}
          </p>
          {!summary.isComplete && summary.multaReferencialTotal > 0 ? (
            <p className="mt-1 text-xs font-medium text-crimson-700">
              Si SUNAFIL inspecciona hoy, las multas referenciales por lo que falta suman{' '}
              {formatSolesMarketing(summary.multaReferencialTotal)}.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {nextToUpload ? (
            <Button
              size="sm"
              loading={busyKey === nextToUpload.type}
              disabled={isBusy}
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => startUpload({ kind: 'def', def: nextToUpload })}
            >
              Subir {lowerFirst(nextToUpload.title)}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            loading={busyKey === 'otro'}
            disabled={isBusy}
            icon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => startUpload({ kind: 'otro' })}
          >
            Subir otro documento
          </Button>
        </div>
      </Card>

      {/* Checklist de obligatorios por categoría */}
      {LEGAJO_CATEGORY_ORDER.map((cat) => {
        const defs = LEGAJO_DOCS.filter((d) => d.category === cat && d.required)
        if (defs.length === 0) return null
        const ready = defs.filter((d) => isRowComplete(resolveDocStatus(byType.get(d.type)))).length
        const pendingCount = defs.length - ready
        const categoryTerm = LEGAJO_CATEGORY_TERMS[cat]
        return (
          <Card key={cat} padding="none">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  {LEGAJO_CATEGORY_LABELS[cat]}
                  {categoryTerm ? <TermHint id={categoryTerm} /> : null}
                </CardTitle>
                <CardDescription>
                  {ready} de {defs.length} listos
                </CardDescription>
              </div>
              <Badge variant={pendingCount > 0 ? 'critical' : 'success'} size="sm">
                {pendingCount > 0 ? `${pendingCount} por resolver` : 'Completo'}
              </Badge>
            </CardHeader>
            <CardContent className="!p-0">
              <ul className="divide-y divide-[color:var(--border-subtle)]">
                {defs.map((def) => (
                  <ChecklistRow key={def.type} {...rowProps(def)} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}

      <p className="px-1 text-[11px] text-[color:var(--text-tertiary)]">
        Las <Term id="multa-sunafil">multas</Term> son referenciales: valor base del D.S. 019-2006-TR para una
        empresa de hasta 10 trabajadores. El monto real depende del tamaño y del régimen de tu empresa.
      </p>

      {/* Opcionales y de cese */}
      <details className="group rounded-xl border border-[color:var(--border-default)] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Documentos opcionales y de cese
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              No cuentan para el avance del legajo. Súbelos solo si aplican a este trabajador
              {optionalUploaded > 0 ? ` (${optionalUploaded} subidos)` : ''}.
            </p>
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="divide-y divide-[color:var(--border-subtle)] border-t border-[color:var(--border-subtle)]">
          {optionalDefs.map((def) => (
            <ChecklistRow key={def.type} {...rowProps(def)} />
          ))}
        </ul>
      </details>

      {/* Documentos que no corresponden a ningún tipo del checklist */}
      {otherDocs.length > 0 ? (
        <Card padding="none">
          <CardHeader>
            <div>
              <CardTitle>Otros documentos subidos</CardTitle>
              <CardDescription>
                No están asociados a un documento del checklist, por eso no suman al avance. Si alguno es
                obligatorio, súbelo de nuevo desde su fila.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="!p-0">
            <ul className="divide-y divide-[color:var(--border-subtle)]">
              {otherDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-6 py-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{d.title}</span>
                      <AiBadges doc={d} />
                    </p>
                    {d.expiresAt ? (
                      <p className="text-[11px] text-[color:var(--text-tertiary)]">Vence el {fmtDate(d.expiresAt)}</p>
                    ) : null}
                  </div>
                  <Badge variant="neutral" size="xs">
                    {RAW_STATUS_LABELS[d.status] ?? d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila del checklist
// ─────────────────────────────────────────────────────────────────────────────

function ChecklistRow({
  def,
  doc,
  status,
  canUpload,
  uploading,
  verifying,
  disabled,
  onUpload,
  onVerify,
  onGoToTab,
}: {
  def: LegajoDocDefinition
  doc: LegajoDoc | undefined
  status: LegajoRowStatus
  canUpload: boolean
  uploading: boolean
  verifying: boolean
  disabled: boolean
  onUpload: () => void
  onVerify?: () => void
  onGoToTab?: (tab: ProfileTab) => void
}) {
  const rejected = doc?.status === 'MISSING'
  const optionalMissing = !def.required && status === 'falta'
  const actionLabel = status === 'vencido' ? 'Subir nuevo' : doc && !rejected ? 'Reemplazar' : 'Subir'
  const meta: RowMeta = optionalMissing ? { label: 'No subido', variant: 'neutral' } : STATUS_META[status]
  const multa = !isRowComplete(status) && def.required ? getMultaReferencial(def.type) : null
  const segments = legajoDocSegments(def)

  return (
    <li className="flex flex-col gap-3 px-6 py-4 hover:bg-[color:var(--neutral-50)] sm:flex-row sm:items-start">
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          meta.variant === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : meta.variant === 'info'
              ? 'border-emerald-200 bg-white text-emerald-600'
              : meta.variant === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : def.required
                  ? 'border-crimson-200 bg-crimson-50 text-crimson-700'
                  : 'border-[color:var(--border-subtle)] bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]',
        )}
        aria-hidden="true"
      >
        {status === 'verificado' ? (
          <BadgeCheck className="h-3.5 w-3.5" />
        ) : status === 'subido' ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : status === 'vencido' ? (
          <Clock className="h-3.5 w-3.5" />
        ) : status === 'pendiente' ? (
          <FileText className="h-3.5 w-3.5" />
        ) : def.required ? (
          <XCircle className="h-3.5 w-3.5" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[color:var(--text-primary)]">
          <span>
            <WithTerms segments={segments.title} />
          </span>
          {doc ? <AiBadges doc={doc} /> : null}
        </p>
        <p className="text-xs text-[color:var(--text-secondary)]">
          <span className="font-semibold">¿Por qué lo pide la ley?</span> <WithTerms segments={segments.why} />
          {def.baseLegal ? (
            <span className="text-[color:var(--text-tertiary)]"> ({def.baseLegal})</span>
          ) : null}
        </p>
        {multa ? (
          <p className="text-[11px] font-medium text-crimson-700">
            Si falta: multa referencial de {formatSolesMarketing(multa.soles)} (infracción{' '}
            {GRAVITY_LABELS[multa.gravity]}).
          </p>
        ) : null}
        {rejected ? (
          <p className="text-[11px] text-crimson-700">El documento anterior fue rechazado. Vuelve a subirlo.</p>
        ) : null}
        {doc?.expiresAt ? (
          <p className="flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
            {status === 'vencido' ? 'Venció el' : 'Vence el'} {fmtDate(doc.expiresAt)}
            {doc.aiVerification?.expiresAtAppliedByAI ? (
              <Tooltip content={<span className="text-[11px]">Fecha detectada automáticamente por la IA</span>}>
                <CalendarCheck className="h-3 w-3 text-emerald-600" aria-label="Fecha detectada por IA" />
              </Tooltip>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant={meta.variant} size="xs">
          {meta.label}
        </Badge>
        {status === 'subido' && onVerify ? (
          <Button
            size="xs"
            variant="ghost"
            loading={verifying}
            disabled={disabled}
            icon={<BadgeCheck className="h-3.5 w-3.5" />}
            onClick={onVerify}
          >
            Marcar verificado
          </Button>
        ) : null}
        {canUpload ? (
          <Button
            size="xs"
            variant={isRowComplete(status) || status === 'pendiente' || optionalMissing ? 'secondary' : 'primary'}
            loading={uploading}
            disabled={disabled}
            icon={<Upload className="h-3.5 w-3.5" />}
            onClick={onUpload}
            aria-label={`${actionLabel}: ${def.title}`}
          >
            {actionLabel}
          </Button>
        ) : onGoToTab ? (
          <Button
            size="xs"
            variant="secondary"
            iconRight={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={() => onGoToTab('contratos')}
          >
            Ver contratos
          </Button>
        ) : null}
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges de verificación IA
// ─────────────────────────────────────────────────────────────────────────────

function AiBadges({ doc }: { doc: LegajoDoc }) {
  const isAIVerified = doc.verifiedBy === 'ai-v1'
  const aiIssues = doc.aiVerification?.issues ?? []
  const aiSummary = doc.aiVerification?.summary
  const aiConfidencePct = doc.aiVerification?.confidence
    ? Math.round(doc.aiVerification.confidence * 100)
    : null
  const hasAIFlag = aiIssues.length > 0 || (aiConfidencePct !== null && aiConfidencePct < 85)
  const suspicionScore = doc.aiVerification?.suspicionScore ?? 0

  return (
    <>
      {isAIVerified ? (
        <Tooltip
          content={
            <div className="max-w-xs space-y-1 text-left">
              <p className="font-semibold">Verificado por IA</p>
              {aiSummary ? <p className="text-[11px]">{aiSummary}</p> : null}
              {aiConfidencePct !== null ? (
                <p className="text-[11px] opacity-80">Confianza: {aiConfidencePct}%</p>
              ) : null}
              {aiIssues.length > 0 ? (
                <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11px]">
                  {aiIssues.slice(0, 3).map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          }
        >
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ boxShadow: '0 2px 4px rgba(4,120,87,0.25)' }}
          >
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
            IA
          </span>
        </Tooltip>
      ) : null}
      {hasAIFlag && !isAIVerified ? (
        <Tooltip
          content={
            <div className="max-w-xs space-y-1 text-left">
              <p className="font-semibold">La IA encontró observaciones</p>
              {aiSummary ? <p className="text-[11px]">{aiSummary}</p> : null}
              {aiIssues.length > 0 ? (
                <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11px]">
                  {aiIssues.slice(0, 3).map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          }
        >
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
            Revisar
          </span>
        </Tooltip>
      ) : null}
      {suspicionScore >= 0.6 ? (
        <Tooltip
          content={
            <div className="max-w-xs space-y-1 text-left">
              <p className="font-semibold">Posible manipulación digital</p>
              <p className="text-[11px] opacity-80">Sospecha según la IA: {Math.round(suspicionScore * 100)}%</p>
              {doc.aiVerification?.suspicionFlags && doc.aiVerification.suspicionFlags.length > 0 ? (
                <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11px]">
                  {doc.aiVerification.suspicionFlags.slice(0, 4).map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1 text-[10px] opacity-70">Revísalo manualmente antes de aprobarlo.</p>
            </div>
          }
        >
          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
            Sospechoso
          </span>
        </Tooltip>
      ) : null}
    </>
  )
}
