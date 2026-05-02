'use client'

/**
 * RegimeBadge — Generador de Contratos / Chunk 2
 *
 * Muestra la detección automática del régimen laboral aplicable a la
 * organización. Útil al inicio del wizard de creación de contratos para
 * orientar al usuario sobre qué tipo elegir.
 *
 * Estados:
 *   - loading: skeleton
 *   - sin datos: prompt para completar configuración
 *   - detected: pill con régimen + confianza + razonamiento expandible
 *   - conflict: aviso si el régimen declarado no coincide con el detectado
 */

import { useEffect, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldQuestion,
  Sparkles,
  AlertCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type RegimenLaboral =
  | 'GENERAL'
  | 'MYPE_MICRO'
  | 'MYPE_PEQUENA'
  | 'AGRARIO'
  | 'CONSTRUCCION_CIVIL'
  | 'MINERO'
  | 'PESQUERO'
  | 'TEXTIL_EXPORTACION'
  | 'DOMESTICO'
  | 'CAS'
  | 'MODALIDAD_FORMATIVA'
  | 'TELETRABAJO'

interface DetectionResponse {
  primaryRegime: RegimenLaboral
  applicableSpecialRegimes: RegimenLaboral[]
  confidence: number
  reasoning: string[]
  warnings: string[]
  flags: {
    isMype: boolean
    isPublic: boolean
    needsRemype: boolean
    hasSpecialModalAvailable: boolean
  }
  organization: { id: string; name: string; ruc: string | null; declaredRegimen: string | null }
  conflict: { declared: string; detected: string; message: string } | null
}

const REGIME_LABELS: Record<RegimenLaboral, string> = {
  GENERAL: 'Régimen General (D.Leg. 728)',
  MYPE_MICRO: 'Microempresa (Ley 32353)',
  MYPE_PEQUENA: 'Pequeña Empresa (Ley 32353)',
  AGRARIO: 'Régimen Agrario (Ley 31110)',
  CONSTRUCCION_CIVIL: 'Construcción Civil',
  MINERO: 'Minero',
  PESQUERO: 'Pesquero (Ley 30003 REP)',
  TEXTIL_EXPORTACION: 'Exportación No Tradicional (D.L. 22342)',
  DOMESTICO: 'Trabajo del Hogar (Ley 31047)',
  CAS: 'CAS (Servir)',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa (Ley 28518)',
  TELETRABAJO: 'Teletrabajo (Ley 31572)',
}

export function RegimeBadge() {
  const [data, setData] = useState<DetectionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/contracts/detect-regime')
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setData(json.data)
      } catch {
        if (!cancelled) setError('No se pudo detectar el régimen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Detectando régimen laboral aplicable…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 text-sm text-slate-600">
        <ShieldQuestion className="w-4 h-4" />
        {error ?? 'No se pudo determinar el régimen automáticamente.'}
      </div>
    )
  }

  const lowConfidence = data.confidence < 0.7
  const hasIssues = data.conflict || data.warnings.length > 0 || data.flags.needsRemype

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 space-y-3',
        data.conflict
          ? 'border-amber-300 bg-amber-50'
          : lowConfidence
            ? 'border-slate-200 bg-slate-50'
            : 'border-emerald-200 bg-emerald-50',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          data.conflict ? 'bg-amber-100' : lowConfidence ? 'bg-slate-100' : 'bg-emerald-100',
        )}>
          {data.conflict ? <AlertCircle className="w-5 h-5 text-amber-700" /> :
            lowConfidence ? <Info className="w-5 h-5 text-slate-600" /> :
            <Sparkles className="w-5 h-5 text-emerald-700" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Régimen detectado
            </span>
            <span className="text-xs text-slate-500">
              {Math.round(data.confidence * 100)}% confianza
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {REGIME_LABELS[data.primaryRegime]}
          </h3>

          {data.applicableSpecialRegimes.length > 0 && (
            <p className="mt-1 text-xs text-slate-600">
              <Building2 className="w-3 h-3 inline mr-1" />
              También disponibles: {data.applicableSpecialRegimes.map((r) => REGIME_LABELS[r]).join(' · ')}
            </p>
          )}

          {data.conflict && (
            <p className="mt-2 text-sm text-amber-800 bg-white border border-amber-200 rounded-lg p-2">
              {data.conflict.message}
            </p>
          )}

          {lowConfidence && (
            <p className="mt-2 text-sm text-slate-700">
              Para una detección más precisa,{' '}
              <Link href="/dashboard/configuracion/empresa" className="underline font-medium">
                completa los datos de la empresa
              </Link>{' '}
              (CIIU, ubigeo, ventas anuales, REMYPE).
            </p>
          )}
        </div>

        {(hasIssues || data.reasoning.length > 0) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'Ocultar' : 'Detalle'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/40 pt-3 space-y-2 text-sm">
          {data.reasoning.length > 0 && (
            <div>
              <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-1">
                Razonamiento
              </p>
              <ul className="space-y-1 text-slate-700">
                {data.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.warnings.length > 0 && (
            <div>
              <p className="font-semibold text-amber-800 text-xs uppercase tracking-wide mb-1">
                Avisos
              </p>
              <ul className="space-y-1 text-amber-800">
                {data.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500">⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.flags.needsRemype && (
            <div className="rounded-lg bg-amber-100 border border-amber-200 p-2 text-amber-800 text-xs">
              💡 Tu empresa califica como MYPE pero no está inscrita en REMYPE. Inscribirse habilita beneficios laborales reducidos legalmente.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
