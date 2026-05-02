'use client'

/**
 * ContractValidationsPanel — Generador de Contratos / Chunk 1
 *
 * Muestra el resultado del motor de validación legal sobre un contrato:
 *   - Resumen agregado (BLOCKER / WARNING / INFO).
 *   - Lista detallada con base legal verbatim y evidencia.
 *   - Acción "Re-validar" (re-corre el motor).
 *   - Acknowledge para WARNING (BLOCKER no se puede ackear — hay que editar).
 *
 * El gate de firma se activa cuando hay BLOCKERs no acknowledged: el botón
 * de avanzar workflow (lo decide la página padre) puede leer este estado
 * vía el callback `onSummaryChange`.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  CheckCircle,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

type Severity = 'BLOCKER' | 'WARNING' | 'INFO'

interface ValidationItem {
  id: string
  ruleCode: string
  ruleVersion: string
  severity: Severity
  passed: boolean
  message: string
  evidence: unknown
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  acknowledgedReason: string | null
  createdAt: string
  rule: {
    code: string
    title: string
    legalBasis: string
    category: string
  }
}

interface ValidationSummary {
  contractId: string
  totalRules: number
  passed: number
  failed: number
  blockers: number
  warnings: number
  infos: number
  validations: ValidationItem[]
}

const SEVERITY_CONFIG: Record<Severity, {
  label: string
  bg: string
  border: string
  text: string
  Icon: typeof ShieldAlert
}> = {
  BLOCKER: {
    label: 'Bloqueante',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    Icon: ShieldAlert,
  },
  WARNING: {
    label: 'Advertencia',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    Icon: AlertTriangle,
  },
  INFO: {
    label: 'Sugerencia',
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    text: 'text-sky-800',
    Icon: Info,
  },
}

export interface ContractValidationsPanelProps {
  contractId: string
  /** Callback opcional para que la página padre conozca el estado y bloquee acciones (ej. firma). */
  onSummaryChange?: (summary: { hasBlockers: boolean; hasUnackedBlockers: boolean }) => void
}

export function ContractValidationsPanel({ contractId, onSummaryChange }: ContractValidationsPanelProps) {
  const { toast } = useToast()
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [revalidating, setRevalidating] = useState(false)
  const [ackingId, setAckingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [ackReason, setAckReason] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/validate`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSummary(data.data)
    } catch {
      toast({ title: 'No se pudieron cargar las validaciones', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [contractId, toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (summary && onSummaryChange) {
      const blockers = summary.validations.filter(
        (v) => !v.passed && v.severity === 'BLOCKER',
      )
      onSummaryChange({
        hasBlockers: blockers.length > 0,
        hasUnackedBlockers: blockers.some((b) => !b.acknowledged),
      })
    }
  }, [summary, onSummaryChange])

  async function revalidate() {
    setRevalidating(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/validate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      await load()
      toast({ title: 'Validación re-ejecutada', type: 'success' })
    } catch {
      toast({ title: 'Error re-validando', type: 'error' })
    } finally {
      setRevalidating(false)
    }
  }

  async function acknowledge(validationId: string) {
    const reason = (ackReason[validationId] ?? '').trim()
    if (reason.length < 10) {
      toast({ title: 'La justificación debe tener al menos 10 caracteres', type: 'error' })
      return
    }
    setAckingId(validationId)
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/validations/${validationId}/ack`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error')
      }
      toast({ title: 'Advertencia reconocida', type: 'success' })
      setAckReason((prev) => ({ ...prev, [validationId]: '' }))
      await load()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Error al reconocer',
        type: 'error',
      })
    } finally {
      setAckingId(null)
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-800">
        Aún no se han ejecutado validaciones para este contrato.
        <button
          onClick={revalidate}
          className="ml-3 underline font-semibold"
          disabled={revalidating}
        >
          Ejecutar ahora
        </button>
      </div>
    )
  }

  const failed = summary.validations.filter((v) => !v.passed)
  const blockers = failed.filter((v) => v.severity === 'BLOCKER')
  const warnings = failed.filter((v) => v.severity === 'WARNING')
  const infos = failed.filter((v) => v.severity === 'INFO')
  const allClear = failed.length === 0

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div
        className={cn(
          'rounded-2xl border p-6 flex items-start gap-4',
          allClear
            ? 'border-emerald-300 bg-emerald-50'
            : blockers.length > 0
              ? 'border-red-300 bg-red-50'
              : 'border-amber-300 bg-amber-50',
        )}
      >
        <div className="flex-shrink-0">
          {allClear ? (
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          ) : blockers.length > 0 ? (
            <ShieldAlert className="w-10 h-10 text-red-600" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-base font-bold',
            allClear ? 'text-emerald-900' : blockers.length > 0 ? 'text-red-900' : 'text-amber-900',
          )}>
            {allClear
              ? '¡Contrato sin observaciones legales!'
              : blockers.length > 0
                ? `${blockers.length} bloqueo${blockers.length === 1 ? '' : 's'} legal${blockers.length === 1 ? '' : 'es'} detectado${blockers.length === 1 ? '' : 's'}`
                : `${warnings.length} advertencia${warnings.length === 1 ? '' : 's'}`}
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            Se evaluaron <strong>{summary.totalRules}</strong> reglas legales.{' '}
            {failed.length > 0 ? (
              <>
                {blockers.length > 0 && <span className="text-red-700">{blockers.length} bloqueante{blockers.length === 1 ? '' : 's'}</span>}
                {blockers.length > 0 && warnings.length > 0 && ' · '}
                {warnings.length > 0 && <span className="text-amber-700">{warnings.length} advertencia{warnings.length === 1 ? '' : 's'}</span>}
                {(blockers.length + warnings.length > 0) && infos.length > 0 && ' · '}
                {infos.length > 0 && <span className="text-sky-700">{infos.length} sugerencia{infos.length === 1 ? '' : 's'}</span>}
              </>
            ) : (
              <span className="text-emerald-700 font-medium">Todas las reglas pasan ✓</span>
            )}
          </p>
        </div>
        <button
          onClick={revalidate}
          disabled={revalidating}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 transition-colors disabled:opacity-50"
        >
          {revalidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Re-validar
        </button>
      </div>

      {/* Lista de fallidas */}
      {failed.length > 0 && (
        <div className="space-y-3">
          {failed.map((v) => {
            const cfg = SEVERITY_CONFIG[v.severity]
            const Icon = cfg.Icon
            const isExpanded = expanded.has(v.id)
            return (
              <div
                key={v.id}
                className={cn(
                  'rounded-xl border bg-white shadow-sm overflow-hidden',
                  v.acknowledged ? 'border-slate-200 opacity-70' : cfg.border,
                )}
              >
                <button
                  onClick={() => toggleExpand(v.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <Icon className={cn('w-5 h-5', cfg.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.text)}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{v.rule.code}</span>
                      {v.acknowledged && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Reconocido
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">{v.rule.title}</h4>
                    <p className="mt-1 text-sm text-slate-700">{v.message}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Scale className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                      <p className="leading-relaxed">{v.rule.legalBasis}</p>
                    </div>

                    {v.evidence !== null && v.evidence !== undefined && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-slate-600 hover:text-slate-800">
                          Ver evidencia técnica
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 overflow-x-auto">
                          {JSON.stringify(v.evidence, null, 2)}
                        </pre>
                      </details>
                    )}

                    {v.acknowledged && v.acknowledgedReason && (
                      <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="font-semibold text-slate-700 mb-1">Justificación de reconocimiento:</p>
                        <p className="text-slate-600">{v.acknowledgedReason}</p>
                      </div>
                    )}

                    {/* Ack solo para WARNING y solo si no está ya acked */}
                    {v.severity === 'WARNING' && !v.acknowledged && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Justificación para reconocer esta advertencia (mínimo 10 caracteres):
                        </label>
                        <textarea
                          value={ackReason[v.id] ?? ''}
                          onChange={(e) => setAckReason((prev) => ({ ...prev, [v.id]: e.target.value }))}
                          rows={2}
                          className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="Ej: La causa objetiva está sustentada por anexo adjunto..."
                        />
                        <button
                          onClick={() => acknowledge(v.id)}
                          disabled={ackingId === v.id}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {ackingId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Reconocer y continuar
                        </button>
                      </div>
                    )}

                    {v.severity === 'BLOCKER' && (
                      <div className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                        <strong>Bloqueante:</strong> debes editar el contrato para que esta regla pase. Los bloqueos no pueden reconocerse manualmente.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {summary.totalRules === 0 && (
        <div className="text-sm text-slate-500 italic text-center py-6">
          No hay reglas activas que apliquen a este tipo de contrato.
        </div>
      )}
    </div>
  )
}
