'use client'

/**
 * TRegistroCard — estado y acción del T-REGISTRO SUNAT (Ola 1, 2026-05).
 *
 * SUNAT exige registrar al trabajador dentro de 1 día hábil del ingreso
 * (D.S. 003-97-TR Art. 60). El alert-engine genera la alerta
 * `T_REGISTRO_NO_PRESENTADO` cuando han pasado >2 días sin marca.
 *
 * Este card permite:
 *   - Ver el estado actual (presentado / pendiente / vencido)
 *   - Marcar como presentado (PATCH `flagTRegistroPresentado=true`)
 *   - Quitar la marca (revertir, en caso de error)
 *
 * El PATCH también dispara el hook `WorkerHistoryEvent` automáticamente.
 */

import { useState } from 'react'
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TRegistroCardProps {
  workerId: string
  fechaIngreso?: string | null
  flagTRegistroPresentado: boolean
  flagTRegistroFecha?: string | null
  /** Callback para que el padre refetchee tras el cambio */
  onChanged?: () => void
}

function diasHabilesDesde(date: Date, ref: Date = new Date()): number {
  // Aproximación: días calendario × (5/7) — suficiente para la regla "1 día hábil"
  const dias = Math.floor((ref.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(dias * (5 / 7)))
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function TRegistroCard({
  workerId,
  fechaIngreso,
  flagTRegistroPresentado,
  flagTRegistroFecha,
  onChanged,
}: TRegistroCardProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState<{
    presentado: boolean
    fecha: string | null
  } | null>(null)

  // Estado efectivo (optimistic > prop)
  const presentado = optimistic?.presentado ?? flagTRegistroPresentado
  const fechaPresentado = optimistic?.fecha ?? flagTRegistroFecha ?? null

  // Cálculo del riesgo si no está presentado todavía
  const ingresoDate = fechaIngreso ? new Date(fechaIngreso) : null
  const diasHabiles = ingresoDate ? diasHabilesDesde(ingresoDate) : 0
  const vencido = !presentado && diasHabiles >= 1

  async function toggle(nuevoEstado: boolean) {
    if (
      !nuevoEstado &&
      !confirm(
        '¿Quitar la marca de T-REGISTRO presentado? Volverá a aparecer la alerta SUNAFIL.',
      )
    ) {
      return
    }

    setSubmitting(true)
    setError(null)
    // Optimistic update
    setOptimistic({
      presentado: nuevoEstado,
      fecha: nuevoEstado ? new Date().toISOString() : null,
    })

    try {
      const res = await fetch(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagTRegistroPresentado: nuevoEstado,
          flagTRegistroFecha: nuevoEstado ? new Date().toISOString() : null,
          reason: nuevoEstado
            ? 'Confirmado por admin: T-REGISTRO presentado en SUNAT'
            : 'Reverso de marca T-REGISTRO',
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }

      onChanged?.()
    } catch (e) {
      // Revert optimistic
      setOptimistic(null)
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card padding="none">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          {presentado ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          ) : vencido ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              T-REGISTRO SUNAT
              {presentado ? (
                <Badge variant="success" size="sm" dot>
                  Presentado
                </Badge>
              ) : vencido ? (
                <Badge variant="critical" size="sm" dot>
                  {diasHabiles}d sin marca
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>
                  Pendiente
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {presentado
                ? `Marcado como presentado el ${fmtDate(fechaPresentado)}.`
                : vencido
                  ? `Plazo legal: 1 día hábil del ingreso. Multa SUNAFIL 2.35 UIT.`
                  : 'Pendiente de presentación en T-REGISTRO SUNAT.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[color:var(--text-tertiary)]">
            {presentado ? (
              <>Una vez presentado, el cron deja de generar alertas T_REGISTRO_NO_PRESENTADO.</>
            ) : (
              <>Marca esta casilla cuando hayas registrado al trabajador en el portal SUNAT.</>
            )}
          </p>
          <div className="flex items-center gap-2">
            {presentado ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggle(false)}
                disabled={submitting}
                icon={
                  submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )
                }
              >
                Revertir
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={() => toggle(true)}
                disabled={submitting}
                icon={
                  submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )
                }
              >
                Marcar como presentado
              </Button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
