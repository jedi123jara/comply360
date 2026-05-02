'use client'

/* -------------------------------------------------------------------------- */
/*  use-live-validation — hit a /api/contracts/validate-draft con debounce    */
/* -------------------------------------------------------------------------- */
/*
 * Postea el snapshot del borrador al endpoint stateless cada vez que cambia
 * algo relevante, con debounce 600ms y dedupe (un solo request en vuelo).
 * Devuelve hallazgos clasificados por severidad y un loading flag.
 *
 * Uso:
 *   const { blockers, warnings, infos, results, loading, error } =
 *     useLiveValidation({
 *       contractType: 'LABORAL_PLAZO_FIJO',
 *       formData,
 *       workerIds: selectedWorker ? [selectedWorker.id] : [],
 *     })
 */

import { useEffect, useRef, useState } from 'react'

export interface LiveValidationResult {
  ruleId: string
  ruleCode: string
  ruleVersion: string
  severity: 'BLOCKER' | 'WARNING' | 'INFO'
  title: string
  legalBasis: string
  passed: boolean
  message: string
}

export interface LiveValidationResponse {
  totalRules: number
  blockers: number
  warnings: number
  infos: number
  passed: number
  results: LiveValidationResult[]
}

export interface InlineWorkerInput {
  dni: string
  firstName: string
  lastName: string
  regimenLaboral: string
  fechaIngreso: string
  sueldoBruto: number
  nationality?: string | null
}

export interface UseLiveValidationOptions {
  contractType: string | null
  formData: Record<string, string | number | boolean> | null
  workerIds?: string[]
  inlineWorker?: InlineWorkerInput | null
  /** Tiempo de debounce en ms (default 600) */
  debounceMs?: number
  /** Habilita / deshabilita la validacion (default true) */
  enabled?: boolean
}

export interface UseLiveValidationReturn {
  blockers: LiveValidationResult[]
  warnings: LiveValidationResult[]
  infos: LiveValidationResult[]
  passed: LiveValidationResult[]
  results: LiveValidationResult[]
  totalRules: number
  loading: boolean
  error: string | null
}

const EMPTY_RETURN: UseLiveValidationReturn = {
  blockers: [],
  warnings: [],
  infos: [],
  passed: [],
  results: [],
  totalRules: 0,
  loading: false,
  error: null,
}

export function useLiveValidation(
  options: UseLiveValidationOptions,
): UseLiveValidationReturn {
  const {
    contractType,
    formData,
    workerIds,
    inlineWorker,
    debounceMs = 600,
    enabled = true,
  } = options

  const [data, setData] = useState<LiveValidationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Serializar inputs para que useEffect detecte cambios profundos
  const serialized = JSON.stringify({
    contractType,
    formData,
    workerIds,
    inlineWorker,
  })

  useEffect(() => {
    if (!enabled || !contractType) {
      setData(null)
      return
    }
    // Sin workers ni datos minimos: no validar
    const hasMeaningful =
      (workerIds && workerIds.length > 0) ||
      !!inlineWorker ||
      (formData && Object.keys(formData).length > 0)
    if (!hasMeaningful) {
      setData(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      // Cancelar request previa si esta en vuelo
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/contracts/validate-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract: {
              type: contractType,
              formData,
            },
            workerIds: workerIds ?? [],
            inlineWorker: inlineWorker ?? undefined,
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `HTTP ${res.status}`)
        }
        const json = (await res.json()) as LiveValidationResponse
        setData(json)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Error validando')
        setData(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [serialized, contractType, debounceMs, enabled])

  if (!data) {
    return { ...EMPTY_RETURN, loading, error }
  }

  return {
    blockers: data.results.filter(r => !r.passed && r.severity === 'BLOCKER'),
    warnings: data.results.filter(r => !r.passed && r.severity === 'WARNING'),
    infos: data.results.filter(r => !r.passed && r.severity === 'INFO'),
    passed: data.results.filter(r => r.passed),
    results: data.results,
    totalRules: data.totalRules,
    loading,
    error,
  }
}
