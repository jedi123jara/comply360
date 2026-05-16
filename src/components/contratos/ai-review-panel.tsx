'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  FileCheck,
} from 'lucide-react'
import type { ContractReviewResult, ContractRisk, ComplianceCheck } from '@/lib/ai/contract-review'

interface AIReviewPanelProps {
  contractHtml: string
  contractType: string
  onComplete?: (result: ContractReviewResult) => void
}

export function AIReviewPanel({ contractHtml, contractType, onComplete }: AIReviewPanelProps) {
  const [result, setResult] = useState<ContractReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)
  const [expandedCompliance, setExpandedCompliance] = useState(false)

  const runReview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractHtml, contractType }),
      })

      if (!response.ok) throw new Error('Error al analizar el contrato')

      const data = await response.json()
      setResult(data.data)
      onComplete?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [contractHtml, contractType, onComplete])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (contractHtml) {
        runReview()
      }
    })
    return () => {
      cancelled = true
    }
  }, [contractHtml, runReview])

  if (loading) {
    return (
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-pulse-soft" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Analizando contrato con IA...
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
          Nuestro motor de IA está revisando el contrato contra la normativa laboral
          peruana vigente. Esto puede tomar unos segundos.
        </p>
        <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Verificando cumplimiento normativo</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#141824] rounded-2xl border border-red-200 p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Error en el análisis</h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={runReview}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    )
  }

  if (!result) return null

  const scoreColor = result.overallScore >= 80 ? 'text-green-600' :
    result.overallScore >= 60 ? 'text-amber-600' : 'text-red-600'

  const scoreRingColor = result.overallScore >= 80 ? 'stroke-green-500' :
    result.overallScore >= 60 ? 'stroke-amber-500' : 'stroke-red-500'

  const riskBadgeColor = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-amber-100 text-amber-700',
    CRITICAL: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score Card */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] p-6">
        <div className="flex items-center gap-6">
          {/* Circular Score */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                className={scoreRingColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${result.overallScore * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{result.overallScore}</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-white">Análisis de IA</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskBadgeColor[result.riskLevel]}`}>
                Riesgo {result.riskLevel === 'LOW' ? 'Bajo' : result.riskLevel === 'MEDIUM' ? 'Medio' : result.riskLevel === 'HIGH' ? 'Alto' : 'Crítico'}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
          </div>

          <button
            onClick={runReview}
            className="p-2 hover:bg-[color:var(--neutral-100)] rounded-xl transition-colors flex-shrink-0"
            title="Reanalizar"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Risks */}
      {result.risks.length > 0 && (
        <div className="bg-[#141824] rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-white">Riesgos Detectados</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              {result.risks.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {result.risks.map((risk: ContractRisk) => (
              <div key={risk.id} className="px-6 py-4">
                <button
                  onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskBadgeColor[risk.severity]}`}>
                      {risk.severity}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-white">{risk.title}</span>
                      <span className="text-xs text-gray-500 ml-2">({risk.category})</span>
                    </div>
                  </div>
                  {expandedRisk === risk.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {expandedRisk === risk.id && (
                  <div className="mt-3 ml-20 space-y-3 animate-fade-in">
                    <p className="text-sm text-gray-600">{risk.description}</p>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Recomendación:</p>
                      <p className="text-sm text-blue-600">{risk.recommendation}</p>
                    </div>
                    {risk.legalBasis && (
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Base legal:</span> {risk.legalBasis}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="bg-[#141824] rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-white">Sugerencias de Mejora</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {result.suggestions.map((suggestion, idx) => (
              <div key={idx} className="px-6 py-4 flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                  suggestion.type === 'ADD' ? 'bg-green-100 text-green-700' :
                  suggestion.type === 'MODIFY' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {suggestion.type === 'ADD' ? 'Agregar' : suggestion.type === 'MODIFY' ? 'Modificar' : 'Eliminar'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{suggestion.clause}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{suggestion.suggestion}</p>
                  <p className="text-xs text-gray-400 mt-1">{suggestion.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance */}
      <div className="bg-[#141824] rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          onClick={() => setExpandedCompliance(!expandedCompliance)}
          className="w-full px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-white">Verificación de Cumplimiento</h3>
            <span className="text-xs text-gray-500">
              {result.compliance.filter((c: ComplianceCheck) => c.status === 'PASS').length}/{result.compliance.length} aprobados
            </span>
          </div>
          {expandedCompliance ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedCompliance && (
          <div className="border-t border-white/[0.06] divide-y divide-gray-50">
            {result.compliance.map((check: ComplianceCheck, idx: number) => (
              <div key={idx} className="px-6 py-3 flex items-start gap-3">
                {check.status === 'PASS' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : check.status === 'WARNING' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{check.rule}</span>
                    <span className="text-xs text-gray-400">{check.legalBasis}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-400 px-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Análisis basado en normativa laboral peruana vigente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>Esta revisión es orientativa y no reemplaza el criterio profesional</span>
        </div>
      </div>
    </div>
  )
}
