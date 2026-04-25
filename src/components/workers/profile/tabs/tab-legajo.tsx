'use client'

import { CheckCircle2, AlertTriangle, Upload, FileText, Sparkles, ShieldAlert, CalendarCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface LegajoDoc {
  id: string
  category: 'INGRESO' | 'VIGENTE' | 'SST' | 'PREVISIONAL' | 'CESE' | string
  title: string
  required: boolean
  status: 'VERIFIED' | 'UPLOADED' | 'PENDING' | 'EXPIRED' | 'MISSING' | string
  expiresAt?: string | null
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

const CATEGORY_LABELS: Record<string, string> = {
  INGRESO: 'Ingreso',
  VIGENTE: 'Vigente',
  SST: 'SST',
  PREVISIONAL: 'Previsional',
  CESE: 'Cese',
}

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  VERIFIED: { label: 'Verificado', variant: 'success' },
  UPLOADED: { label: 'Subido', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  EXPIRED: { label: 'Vencido', variant: 'danger' },
  MISSING: { label: 'Falta', variant: 'danger' },
}

export function TabLegajo({
  docs,
  legajoScore,
}: {
  docs: LegajoDoc[]
  legajoScore: number
}) {
  const total = docs.length || 1
  const uploaded = docs.filter((d) =>
    ['UPLOADED', 'VERIFIED'].includes(d.status)
  ).length
  const missing = docs.filter((d) => ['MISSING', 'EXPIRED'].includes(d.status))
  const pending = docs.filter((d) => d.status === 'PENDING')

  const byCategory = docs.reduce<Record<string, LegajoDoc[]>>((acc, d) => {
    const k = d.category
    if (!acc[k]) acc[k] = []
    acc[k].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card padding="md" variant="emerald" className="flex items-center gap-5">
        <ProgressRing value={legajoScore} size={100} stroke={8}>
          <div className="text-center leading-none">
            <div className="text-xl font-bold text-emerald-700">{legajoScore}</div>
            <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)] mt-0.5">
              score
            </div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Legajo digital
          </p>
          <p className="text-xl font-bold tracking-tight mt-0.5">
            {uploaded} / {total} documentos
          </p>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            {missing.length > 0
              ? `${missing.length} documentos faltantes o vencidos. Resolverlos sube el score +${Math.round((missing.length / total) * 40)} pts.`
              : pending.length > 0
                ? `${pending.length} documentos pendientes de verificar.`
                : 'Legajo completo y verificado.'}
          </p>
        </div>
        <Button icon={<Upload className="h-3.5 w-3.5" />}>Subir documento</Button>
      </Card>

      {/* Docs by category */}
      {Object.entries(byCategory).map(([cat, items]) => (
        <Card key={cat} padding="none">
          <CardHeader>
            <div>
              <CardTitle>{CATEGORY_LABELS[cat] ?? cat}</CardTitle>
              <CardDescription>
                {items.filter((i) => ['UPLOADED', 'VERIFIED'].includes(i.status)).length} de{' '}
                {items.length} cubiertos
              </CardDescription>
            </div>
            <Badge
              variant={
                items.some((i) => ['MISSING', 'EXPIRED'].includes(i.status))
                  ? 'critical'
                  : items.some((i) => i.status === 'PENDING')
                    ? 'warning'
                    : 'success'
              }
              size="sm"
            >
              {items.filter((i) => ['MISSING', 'EXPIRED'].includes(i.status)).length > 0
                ? 'Faltantes'
                : 'OK'}
            </Badge>
          </CardHeader>
          <CardContent className="!p-0">
            <ul className="divide-y divide-[color:var(--border-subtle)]">
              {items.map((d) => {
                const meta = STATUS_META[d.status] ?? STATUS_META.PENDING
                const isAIVerified = d.verifiedBy === 'ai-v1'
                const aiIssues = d.aiVerification?.issues ?? []
                const aiSummary = d.aiVerification?.summary
                const aiConfidencePct = d.aiVerification?.confidence
                  ? Math.round(d.aiVerification.confidence * 100)
                  : null
                const hasAIFlag = aiIssues.length > 0 || (aiConfidencePct !== null && aiConfidencePct < 85)
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-[color:var(--neutral-50)]"
                  >
                    <span
                      className={cn(
                        'shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                        meta.variant === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : meta.variant === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : meta.variant === 'danger'
                              ? 'bg-crimson-50 border-crimson-200 text-crimson-700'
                              : 'bg-[color:var(--neutral-100)] border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)]'
                      )}
                    >
                      {meta.variant === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : meta.variant === 'danger' ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium truncate">
                        {d.title}
                        {isAIVerified ? (
                          <Tooltip
                            content={
                              <div className="max-w-xs space-y-1 text-left">
                                <p className="font-semibold">Verificado por IA</p>
                                {aiSummary ? <p className="text-[11px]">{aiSummary}</p> : null}
                                {aiConfidencePct !== null ? (
                                  <p className="text-[11px] opacity-80">
                                    Confianza: {aiConfidencePct}%
                                  </p>
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
                              <Sparkles className="h-2.5 w-2.5" />
                              IA
                            </span>
                          </Tooltip>
                        ) : null}
                        {hasAIFlag && !isAIVerified ? (
                          <Tooltip
                            content={
                              <div className="max-w-xs space-y-1 text-left">
                                <p className="font-semibold">IA detectó issues</p>
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
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Revisar
                            </span>
                          </Tooltip>
                        ) : null}
                        {(d.aiVerification?.suspicionScore ?? 0) >= 0.6 ? (
                          <Tooltip
                            content={
                              <div className="max-w-xs space-y-1 text-left">
                                <p className="font-semibold">Posible manipulación digital</p>
                                <p className="text-[11px] opacity-80">
                                  Sospecha IA: {Math.round((d.aiVerification?.suspicionScore ?? 0) * 100)}%
                                </p>
                                {d.aiVerification?.suspicionFlags && d.aiVerification.suspicionFlags.length > 0 ? (
                                  <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11px]">
                                    {d.aiVerification.suspicionFlags.slice(0, 4).map((flag, i) => (
                                      <li key={i}>{flag}</li>
                                    ))}
                                  </ul>
                                ) : null}
                                <p className="text-[10px] opacity-70 mt-1">
                                  Revisión manual recomendada antes de aprobar.
                                </p>
                              </div>
                            }
                          >
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              Sospechoso
                            </span>
                          </Tooltip>
                        ) : null}
                      </p>
                      {d.expiresAt ? (
                        <p className="text-[11px] text-[color:var(--text-tertiary)] flex items-center gap-1">
                          Vence{' '}
                          {new Intl.DateTimeFormat('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          }).format(new Date(d.expiresAt))}
                          {d.aiVerification?.expiresAtAppliedByAI ? (
                            <Tooltip content={<span className="text-[11px]">Fecha auto-detectada por IA</span>}>
                              <CalendarCheck className="h-3 w-3 text-emerald-600" />
                            </Tooltip>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={meta.variant} size="xs">
                      {meta.label}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
