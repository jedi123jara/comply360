'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Sun, RefreshCw, Plus, ChevronDown, ChevronUp,
  AlertTriangle, Users, Clock, CalendarCheck, Info,
  Trash2, X, ExternalLink,
} from 'lucide-react'
import { displayWorkerName } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VacRecord {
  id: string
  periodoInicio: string
  periodoFin: string
  diasCorresponden: number
  diasGozados: number
  diasPendientes: number
  fechaGoce: string | null
  esDoble: boolean
}

interface WorkerVacData {
  worker: {
    id: string
    firstName: string
    lastName: string
    position: string
    department: string
    fechaIngreso: string
    regimenLaboral: string
    anosServicio: number
    diasPorAnio: number
  }
  records: VacRecord[]
  summary: {
    totalPeriodos: number
    totalDiasPendientes: number
    periodosSinGoce: number
    tieneRiesgoDoble: boolean
    periodosEsperados: number
    periodsWithoutRecord: number
  }
}

interface OrgTotals {
  totalWorkers: number
  conPendientes: number
  dobleRiesgo: number
  sinRegistro: number
  totalDiasPendientesOrg: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ summary }: { summary: WorkerVacData['summary'] }) {
  if (summary.tieneRiesgoDoble)
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
        ⚠ Doble Período
      </span>
    )
  if (summary.totalDiasPendientes > 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
        {summary.totalDiasPendientes}d pendientes
      </span>
    )
  if (summary.periodsWithoutRecord > 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
        Sin registro
      </span>
    )
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
      Al día ✓
    </span>
  )
}

// ── Add Period Modal ──────────────────────────────────────────────────────────

function AddPeriodModal({
  workerId,
  workerName,
  fechaIngreso,
  diasPorAnio,
  existingCount,
  onClose,
  onSaved,
}: {
  workerId: string
  workerName: string
  fechaIngreso: string
  diasPorAnio: number
  existingCount: number
  onClose: () => void
  onSaved: () => void
}) {
  const ingreso = new Date(fechaIngreso)
  const suggestedStart = addYears(ingreso, existingCount)
  const suggestedEnd = addYears(ingreso, existingCount + 1)

  const [form, setForm] = useState({
    periodoInicio: toDateInput(suggestedStart),
    periodoFin: toDateInput(suggestedEnd),
    diasCorresponden: diasPorAnio,
    diasGozados: 0,
    fechaGoce: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/workers/${workerId}/vacaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodoInicio: form.periodoInicio,
          periodoFin: form.periodoFin,
          diasCorresponden: form.diasCorresponden,
          diasGozados: form.diasGozados,
          fechaGoce: form.fechaGoce || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        setError(j.error ?? 'Error al crear período')
        return
      }
      onSaved()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-semibold text-white">Nuevo Período Vacacional</h3>
            <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{workerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Inicio del período *</label>
              <input
                type="date"
                value={form.periodoInicio}
                onChange={e => setForm(f => ({ ...f, periodoInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Fin del período *</label>
              <input
                type="date"
                value={form.periodoFin}
                onChange={e => setForm(f => ({ ...f, periodoFin: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Días que corresponden</label>
              <input
                type="number"
                value={form.diasCorresponden}
                min={1}
                max={30}
                onChange={e => setForm(f => ({ ...f, diasCorresponden: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Días ya gozados</label>
              <input
                type="number"
                value={form.diasGozados}
                min={0}
                max={form.diasCorresponden}
                onChange={e => setForm(f => ({ ...f, diasGozados: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Fecha de inicio del goce <span className="font-normal text-[color:var(--text-tertiary)]">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.fechaGoce}
              onChange={e => setForm(f => ({ ...f, fechaGoce: e.target.value }))}
              className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Régimen {diasPorAnio === 15 ? 'MYPE — 15 días/año' : 'General (D.Leg. 728) — 30 días/año'}.
              Período {existingCount + 1}° sugerido: {fmtDate(suggestedStart)} → {fmtDate(suggestedEnd)}.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Crear Período'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Register Goce Modal ───────────────────────────────────────────────────────

function RegisterGoceModal({
  workerId,
  recordId,
  record,
  workerName,
  onClose,
  onSaved,
}: {
  workerId: string
  recordId: string
  record: VacRecord
  workerName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    diasGozados: record.diasCorresponden,
    fechaGoce: toDateInput(new Date()),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pendientesRestantes = Math.max(0, record.diasCorresponden - form.diasGozados)

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/workers/${workerId}/vacaciones/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diasGozados: form.diasGozados,
          fechaGoce: form.fechaGoce || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        setError(j.error ?? 'Error al registrar')
        return
      }
      onSaved()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-semibold text-white">Registrar Goce Vacacional</h3>
            <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{workerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Period summary */}
          <div className="bg-[color:var(--neutral-50)] rounded-lg p-3">
            <p className="text-xs text-[color:var(--text-tertiary)] mb-2">Período vacacional</p>
            <p className="text-sm font-medium text-[color:var(--text-secondary)]">
              {fmtDate(record.periodoInicio)} → {fmtDate(record.periodoFin)}
            </p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-gray-600">Total: <strong>{record.diasCorresponden}d</strong></span>
              <span className="text-gray-600">Ya gozados: <strong>{record.diasGozados}d</strong></span>
              <span className="text-amber-700">Pendientes: <strong>{record.diasPendientes}d</strong></span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Total días gozados <span className="font-normal text-[color:var(--text-tertiary)]">(acumulado)</span>
            </label>
            <input
              type="number"
              value={form.diasGozados}
              min={record.diasGozados}
              max={record.diasCorresponden}
              onChange={e => setForm(f => ({ ...f, diasGozados: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
            />
            <p className="text-xs text-[color:var(--text-tertiary)] mt-1.5">
              Quedarán pendientes:{' '}
              <strong className={pendientesRestantes === 0 ? 'text-green-600' : 'text-amber-600'}>
                {pendientesRestantes} días
              </strong>
              {pendientesRestantes === 0 && ' — período completado ✓'}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Fecha de inicio del goce
            </label>
            <input
              type="date"
              value={form.fechaGoce}
              onChange={e => setForm(f => ({ ...f, fechaGoce: e.target.value }))}
              className="w-full px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Registrar Goce'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vacation Record Row ───────────────────────────────────────────────────────

function VacRecordRow({
  record,
  onRegisterGoce,
  onDelete,
}: {
  record: VacRecord
  workerId: string
  onRegisterGoce: (recordId: string, rec: VacRecord) => void
  onDelete: (recordId: string) => void
}) {
  const pct =
    record.diasCorresponden > 0
      ? Math.round((record.diasGozados / record.diasCorresponden) * 100)
      : 0
  const alDia = record.diasPendientes === 0

  return (
    <div
      className={`rounded-lg border p-3 ${
        alDia
          ? 'border-green-200 bg-green-50/40'
          : record.esDoble
            ? 'border-red-200 bg-red-50/40'
            : 'border-amber-200 bg-amber-50/40'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Period dates */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[color:var(--text-secondary)]">
            {fmtDate(record.periodoInicio)} → {fmtDate(record.periodoFin)}
          </p>
          {record.fechaGoce && (
            <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">
              Inicio goce: {fmtDate(record.fechaGoce)}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 w-20 shrink-0">
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${alDia ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-[color:var(--text-tertiary)]">{pct}% gozado</span>
        </div>

        {/* Days summary */}
        <div className="text-right text-xs shrink-0">
          <p className="font-semibold text-[color:var(--text-secondary)]">
            {record.diasGozados}/{record.diasCorresponden}d
          </p>
          <p className={alDia ? 'text-green-600' : 'text-amber-700'}>
            {alDia ? 'Completo ✓' : `${record.diasPendientes}d pend.`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!alDia && (
            <button
              onClick={() => onRegisterGoce(record.id, record)}
              className="px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-medium transition-colors"
            >
              Registrar goce
            </button>
          )}
          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 text-[color:var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar registro"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Worker Vacation Card ──────────────────────────────────────────────────────

function WorkerVacCard({
  data,
  onAddPeriod,
  onRegisterGoce,
  onDelete,
}: {
  data: WorkerVacData
  onAddPeriod: (
    workerId: string,
    workerName: string,
    fechaIngreso: string,
    diasPorAnio: number,
    existingCount: number,
  ) => void
  onRegisterGoce: (
    workerId: string,
    recordId: string,
    record: VacRecord,
    workerName: string,
  ) => void
  onDelete: (workerId: string, recordId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { worker, records, summary } = data
  const fullName = displayWorkerName(worker.firstName, worker.lastName)

  // Auto-expand workers with double-period risk
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync UI state con prop derivada; el expand solo ocurre en un caso específico de riesgo.
    if (summary.tieneRiesgoDoble) setExpanded(true)
  }, [summary.tieneRiesgoDoble])

  const avatarColor = summary.tieneRiesgoDoble
    ? 'bg-red-100 text-red-700'
    : summary.totalDiasPendientes > 0
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700'

  const cardBorder = summary.tieneRiesgoDoble
    ? 'border-red-300 shadow shadow-red-100'
    : 'border-[color:var(--border-default)]'

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${cardBorder}`}>
      {/* Header (always visible, clickable) */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[color:var(--neutral-50)]/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}
          >
            {worker.firstName[0]}
            {worker.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-white truncate">{fullName}</span>
              <StatusBadge summary={summary} />
            </div>
            <p className="text-xs text-[color:var(--text-tertiary)] truncate mt-0.5">
              {worker.position || '—'} · {worker.department || '—'} ·{' '}
              {worker.anosServicio} año{worker.anosServicio !== 1 ? 's' : ''} ·{' '}
              {worker.diasPorAnio}d/año
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white">{summary.totalDiasPendientes}d</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              {summary.totalPeriodos} período{summary.totalPeriodos !== 1 ? 's' : ''}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[color:var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[color:var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[color:var(--border-default)] p-4 space-y-3">
          {/* Double period alert */}
          {summary.tieneRiesgoDoble && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <strong>Riesgo de Triple Vacacional — Art. 23 D.Leg. 713</strong>
                <br />
                {summary.periodosSinGoce} período(s) sin goce acumulados. Si no se regulariza,
                el trabajador tendrá derecho a{' '}
                <strong>triple remuneración</strong>: 1 por el descanso, 1 por haberlo laborado
                y 1 como compensación.
              </div>
            </div>
          )}

          {/* Missing records hint */}
          {summary.periodsWithoutRecord > 0 && !summary.tieneRiesgoDoble && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                El trabajador tiene <strong>{worker.anosServicio} año(s)</strong> de servicio y solo{' '}
                <strong>{summary.totalPeriodos}</strong> período(s) registrado(s).
                Considere agregar {summary.periodsWithoutRecord} período(s) faltante(s).
              </p>
            </div>
          )}

          {/* Vacation records */}
          {records.length === 0 ? (
            <div className="text-center py-6 text-[color:var(--text-tertiary)]">
              <Sun className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin períodos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <VacRecordRow
                  key={r.id}
                  record={r}
                  workerId={worker.id}
                  onRegisterGoce={(rid, rec) =>
                    onRegisterGoce(worker.id, rid, rec, fullName)
                  }
                  onDelete={rid => onDelete(worker.id, rid)}
                />
              ))}
            </div>
          )}

          {/* Actions footer */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() =>
                onAddPeriod(
                  worker.id,
                  fullName,
                  worker.fechaIngreso,
                  worker.diasPorAnio,
                  records.length,
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar período
            </button>
            <Link
              href={`/dashboard/trabajadores/${worker.id}`}
              className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-gray-600 transition-colors"
            >
              Ver perfil
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  accent: 'blue' | 'amber' | 'red' | 'purple' | 'gray'
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-white' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-white' },
    red: { bg: 'bg-red-100', icon: 'text-red-600', text: typeof value === 'number' && value > 0 ? 'text-red-600' : 'text-white' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-white' },
    gray: { bg: 'bg-[color:var(--neutral-100)]', icon: 'text-gray-600', text: 'text-white' },
  }
  const c = colors[accent]

  return (
    <div className="bg-white rounded-xl border border-[color:var(--border-default)] p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${c.bg}`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{label}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterKey = 'todos' | 'pendientes' | 'doble' | 'sin_registro'

export default function VacacionesPage() {
  const [data, setData] = useState<{ workers: WorkerVacData[]; totals: OrgTotals } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('todos')

  // Modal state
  const [addModal, setAddModal] = useState<{
    workerId: string
    workerName: string
    fechaIngreso: string
    diasPorAnio: number
    existingCount: number
  } | null>(null)
  const [goceModal, setGoceModal] = useState<{
    workerId: string
    recordId: string
    record: VacRecord
    workerName: string
  } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/vacaciones')
      if (res.ok) setData(await res.json() as { workers: WorkerVacData[]; totals: OrgTotals })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleDelete(workerId: string, recordId: string) {
    const ok = await confirm({
      title: '¿Eliminar este registro de vacaciones?',
      description:
        'Se borrará el registro del período. Puedes volver a crearlo manualmente si es un error.',
      confirmLabel: 'Eliminar registro',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/workers/${workerId}/vacaciones/${recordId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')
      toast.success('Registro de vacaciones eliminado')
      void load()
    } catch {
      toast.error('No se pudo eliminar. Intentá de nuevo.')
    }
  }

  // Filtered & searched list
  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.workers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        d =>
          d.worker.firstName.toLowerCase().includes(q) ||
          d.worker.lastName.toLowerCase().includes(q) ||
          d.worker.department.toLowerCase().includes(q) ||
          d.worker.position.toLowerCase().includes(q),
      )
    }
    switch (filter) {
      case 'pendientes':
        return list.filter(d => d.summary.totalDiasPendientes > 0)
      case 'doble':
        return list.filter(d => d.summary.tieneRiesgoDoble)
      case 'sin_registro':
        return list.filter(d => d.summary.periodsWithoutRecord > 0)
      default:
        return list
    }
  }, [data, search, filter])

  const totals = data?.totals
  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendientes', label: 'Con pendientes' },
    { key: 'doble', label: 'Doble período' },
    { key: 'sin_registro', label: 'Sin registro' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Vacaciones"
        title="Controla los periodos <em>sin doble goce</em>."
        subtitle="D.Leg. 713 · Control de períodos vacacionales, días gozados y alertas de doble período."
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-emerald-700)] px-3.5 py-2 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Trabajadores activos"
          value={totals?.totalWorkers ?? '—'}
          icon={Users}
          accent="blue"
        />
        <KpiCard
          label="Con días pendientes"
          value={totals?.conPendientes ?? '—'}
          icon={Clock}
          accent="amber"
        />
        <KpiCard
          label="Riesgo doble período"
          value={totals?.dobleRiesgo ?? '—'}
          icon={AlertTriangle}
          accent={totals?.dobleRiesgo ? 'red' : 'gray'}
        />
        <KpiCard
          label="Total días pendientes"
          value={totals?.totalDiasPendientesOrg ?? '—'}
          icon={CalendarCheck}
          accent="purple"
        />
      </div>

      {/* ── Double-period alert banner ──────────────────────────────────────── */}
      {totals && totals.dobleRiesgo > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {totals.dobleRiesgo} trabajador{totals.dobleRiesgo !== 1 ? 'es con' : ' con'} riesgo
              de triple vacacional
            </p>
            <p className="text-xs text-red-700 mt-1">
              Art. 23 D.Leg. 713: cuando un trabajador acumula 2+ períodos sin goce efectivo,
              corresponden{' '}
              <strong>3 remuneraciones</strong>: una por el descanso no gozado, una por haber
              trabajado durante ese período, y una como compensación.
              Regularice el goce o documente el acuerdo de programación.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, área o cargo..."
          className="flex-1 px-3 py-2 border border-[color:var(--border-default)] rounded-lg text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50"
        />
        <div className="flex rounded-lg border border-[color:var(--border-default)] overflow-hidden divide-x divide-gray-200 shrink-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-gold text-black font-bold'
                  : 'text-gray-600 hover:bg-[color:var(--neutral-50)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Worker list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[color:var(--text-tertiary)]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Cargando registros de vacaciones...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[color:var(--text-tertiary)]">
          <Sun className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">No hay trabajadores para mostrar</p>
          <p className="text-xs mt-1">
            {search || filter !== 'todos'
              ? 'Pruebe con otros filtros'
              : 'Registre trabajadores para gestionar sus vacaciones'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <WorkerVacCard
              key={d.worker.id}
              data={d}
              onAddPeriod={(wid, name, fi, dpa, cnt) =>
                setAddModal({
                  workerId: wid,
                  workerName: name,
                  fechaIngreso: fi,
                  diasPorAnio: dpa,
                  existingCount: cnt,
                })
              }
              onRegisterGoce={(wid, rid, rec, name) =>
                setGoceModal({ workerId: wid, recordId: rid, record: rec, workerName: name })
              }
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Legal footnote ─────────────────────────────────────────────────── */}
      <p className="text-xs text-[color:var(--text-tertiary)] border-t pt-4">
        Base legal: D.Leg. 713 (Descanso Vacacional Remunerado) · D.S. 012-92-TR (Reglamento) ·
        Art. 23: Triple vacacional por acumulación · Ley 32353 (MYPE — 15 días/año).
      </p>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {addModal && (
        <AddPeriodModal
          {...addModal}
          onClose={() => setAddModal(null)}
          onSaved={() => {
            setAddModal(null)
            void load()
          }}
        />
      )}
      {goceModal && (
        <RegisterGoceModal
          {...goceModal}
          onClose={() => setGoceModal(null)}
          onSaved={() => {
            setGoceModal(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
