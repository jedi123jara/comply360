'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, Loader2, Pencil, Save, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatScheduleTime } from '@/lib/attendance/schedule'

interface Schedule {
  expectedClockInHour: number
  expectedClockInMinute: number
  expectedClockOutHour: number
  expectedClockOutMinute: number
  lateToleranceMinutes: number
}

const DEFAULT_SCHEDULE: Schedule = {
  expectedClockInHour: 8,
  expectedClockInMinute: 0,
  expectedClockOutHour: 17,
  expectedClockOutMinute: 0,
  lateToleranceMinutes: 15,
}

/**
 * Card "Horario laboral" en el detalle del worker (Fase 1.2 — Asistencia).
 *
 * Carga el horario desde GET /api/workers/[id] y lo persiste con PUT.
 * El backend valida rangos y que entrada < salida; este componente solo
 * confina los inputs a valores razonables.
 */
export function ScheduleCard({ workerId }: { workerId: string }) {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE)
  const [draft, setDraft] = useState<Schedule>(DEFAULT_SCHEDULE)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workers/${workerId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar el horario')
      const data = await res.json()
      const w = data.data ?? data
      const sched: Schedule = {
        expectedClockInHour: w.expectedClockInHour ?? DEFAULT_SCHEDULE.expectedClockInHour,
        expectedClockInMinute: w.expectedClockInMinute ?? DEFAULT_SCHEDULE.expectedClockInMinute,
        expectedClockOutHour: w.expectedClockOutHour ?? DEFAULT_SCHEDULE.expectedClockOutHour,
        expectedClockOutMinute: w.expectedClockOutMinute ?? DEFAULT_SCHEDULE.expectedClockOutMinute,
        lateToleranceMinutes: w.lateToleranceMinutes ?? DEFAULT_SCHEDULE.lateToleranceMinutes,
      }
      setSchedule(sched)
      setDraft(sched)
    } catch {
      // silent — quedamos con los defaults visibles
    } finally {
      setLoading(false)
    }
  }, [workerId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const startEdit = () => {
    setDraft(schedule)
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraft(schedule)
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setSchedule(draft)
      setEditing(false)
      toast.success('Horario guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const labelEntrada = formatScheduleTime(schedule.expectedClockInHour, schedule.expectedClockInMinute)
  const labelSalida = formatScheduleTime(schedule.expectedClockOutHour, schedule.expectedClockOutMinute)

  return (
    <Card padding="none">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 w-full">
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Horario laboral
              </span>
            </CardTitle>
            <CardDescription>
              Hora pactada de entrada/salida y tolerancia. Define cuándo es tardanza.
            </CardDescription>
          </div>
          {!editing && !loading && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        ) : !editing ? (
          <dl className="space-y-2">
            <div className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--border-subtle)]">
              <dt className="text-xs uppercase tracking-wider text-[color:var(--text-tertiary)]">Entrada</dt>
              <dd className="text-sm font-mono font-semibold text-emerald-700">{labelEntrada}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--border-subtle)]">
              <dt className="text-xs uppercase tracking-wider text-[color:var(--text-tertiary)]">Salida</dt>
              <dd className="text-sm font-mono font-semibold text-slate-700">{labelSalida}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-xs uppercase tracking-wider text-[color:var(--text-tertiary)]">Tolerancia</dt>
              <dd className="text-sm font-medium text-slate-700">
                {schedule.lateToleranceMinutes} min
                <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                  · LATE si pasa de las {formatScheduleTime(
                    schedule.expectedClockInHour,
                    schedule.expectedClockInMinute + schedule.lateToleranceMinutes,
                  )}
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                  Hora entrada
                </label>
                <div className="flex items-center gap-1">
                  <NumberInput
                    value={draft.expectedClockInHour}
                    min={0}
                    max={23}
                    onChange={(v) => setDraft(d => ({ ...d, expectedClockInHour: v }))}
                  />
                  <span className="text-slate-400">:</span>
                  <NumberInput
                    value={draft.expectedClockInMinute}
                    min={0}
                    max={59}
                    onChange={(v) => setDraft(d => ({ ...d, expectedClockInMinute: v }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                  Hora salida
                </label>
                <div className="flex items-center gap-1">
                  <NumberInput
                    value={draft.expectedClockOutHour}
                    min={0}
                    max={23}
                    onChange={(v) => setDraft(d => ({ ...d, expectedClockOutHour: v }))}
                  />
                  <span className="text-slate-400">:</span>
                  <NumberInput
                    value={draft.expectedClockOutMinute}
                    min={0}
                    max={59}
                    onChange={(v) => setDraft(d => ({ ...d, expectedClockOutMinute: v }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                Tolerancia (min)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                step={1}
                value={draft.lateToleranceMinutes}
                onChange={(e) => setDraft(d => ({ ...d, lateToleranceMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) }))}
                className="w-24 px-3 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">0-120 min de gracia post-hora pactada.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Guardar
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Cancelar
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value)
        if (Number.isNaN(n)) return
        onChange(Math.max(min, Math.min(max, Math.floor(n))))
      }}
      className={cn(
        'w-14 px-2 py-1.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg',
        'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm font-mono text-center',
      )}
    />
  )
}
