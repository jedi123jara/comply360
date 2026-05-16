'use client'

/**
 * ContractRiskBadge — Generador de Contratos / Chunk 5
 *
 * Pill compacta que se muestra en el header del contrato. Carga el
 * risk-profile en /api/contracts/[id]/risk-profile y muestra:
 *   - Score 0-100
 *   - Nivel: LOW / MEDIUM / HIGH / CRITICAL
 *   - Multa estimada en S/
 *   - Tooltip con desglose de penalizaciones
 *
 * Bloquea visualmente la firma si hay BLOCKERs sin acknowledge.
 */

import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, ShieldCheck, ShieldQuestion, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RiskProfile {
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  hasBlockingIssues: boolean
  estimatedFineUIT: number
  estimatedFinePEN: number
  penalties: Array<{ code: string; weight: number; reason: string }>
  validations: { blockers: number; warnings: number; infos: number }
  regime: { hasConflict: boolean; declared: string | null; detected: string }
  chain: { valid: boolean; versions: number }
}

interface Props {
  contractId: string
  /** Re-fetch token: cuando cambia, el badge re-consulta. */
  refreshKey?: number | string
}

const LEVEL_CONFIG = {
  LOW: {
    label: 'Bajo',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: 'Medio',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: ShieldQuestion,
  },
  HIGH: {
    label: 'Alto',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: ShieldAlert,
  },
  CRITICAL: {
    label: 'Crítico',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: ShieldAlert,
  },
} as const

function formatPEN(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ContractRiskBadge({ contractId, refreshKey }: Props) {
  const [profile, setProfile] = useState<RiskProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/risk-profile`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProfile(data.data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [load, refreshKey])

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        Calculando riesgo…
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const cfg = LEVEL_CONFIG[profile.level]
  const Icon = cfg.icon

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDetails((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
          cfg.bg,
          cfg.border,
          cfg.text,
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        Riesgo {cfg.label}
        <span className="font-bold">{profile.score}</span>
        {profile.hasBlockingIssues && (
          <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold">
            !
          </span>
        )}
      </button>

      {showDetails && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-30 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Risk profile · v1
              </p>
              <p className={cn('text-2xl font-bold', cfg.text)}>{profile.score}/100</p>
            </div>
            <div className={cn('px-2 py-1 rounded-lg text-xs font-semibold', cfg.bg, cfg.text)}>
              {cfg.label}
            </div>
          </div>

          {profile.estimatedFinePEN > 0 && (
            <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs">
              <p className="text-red-800">
                <strong>Multa SUNAFIL estimada:</strong>{' '}
                {formatPEN(profile.estimatedFinePEN)}{' '}
                <span className="text-red-600">({profile.estimatedFineUIT.toFixed(2)} UIT)</span>
              </p>
              <p className="text-[10px] text-red-700 mt-0.5">
                Estimación basada en DS 019-2006-TR (numerales 24.7 y 25.5).
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-lg font-bold text-red-700">{profile.validations.blockers}</p>
              <p className="text-[10px] uppercase tracking-wide text-red-600">Bloqueos</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-lg font-bold text-amber-700">{profile.validations.warnings}</p>
              <p className="text-[10px] uppercase tracking-wide text-amber-600">Avisos</p>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-200">
              <p className="text-lg font-bold text-sky-700">{profile.validations.infos}</p>
              <p className="text-[10px] uppercase tracking-wide text-sky-600">Sugerenc.</p>
            </div>
          </div>

          {profile.penalties.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Penalizaciones</p>
              {profile.penalties.map((p) => (
                <div key={p.code} className="flex items-start gap-2 text-slate-700">
                  <span className="text-red-600 font-mono text-[11px] flex-shrink-0">−{p.weight}</span>
                  <span className="text-[12px]">{p.reason}</span>
                </div>
              ))}
            </div>
          )}

          {profile.regime.hasConflict && (
            <p className="mt-2 text-[11px] text-amber-700">
              Régimen declarado <strong>{profile.regime.declared}</strong> ≠ detectado <strong>{profile.regime.detected}</strong>.
            </p>
          )}

          {!profile.chain.valid && (
            <p className="mt-2 text-[11px] text-red-700">
              ⚠ Cadena criptográfica de versiones rota — auditar.
            </p>
          )}

          {profile.score === 100 && (
            <p className="mt-2 text-[12px] text-emerald-700 font-medium">
              ✓ Sin observaciones — contrato listo para firma.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
