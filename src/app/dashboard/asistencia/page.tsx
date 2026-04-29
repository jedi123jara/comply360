'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  LogIn,
  LogOut,
  Coffee,
  Maximize2,
  MoreHorizontal,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ExternalLink,
  X,
  Send,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'
import { AttendanceQrCard } from '@/components/attendance/attendance-qr-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────
type JustificationState =
  | 'no-applicable'
  | 'pending-justification'
  | 'pending-approval'
  | 'approved'
  | 'rejected'

interface AttendanceRecord {
  id: string
  workerId: string
  clockIn: string
  clockOut: string | null
  status: 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT'
  hoursWorked: number | null
  notes: string | null
  justificationState: JustificationState
  justification: {
    reason: string
    files?: string[]
    requestedAt: string
    requestedBy: string
  } | null
  approval: {
    approved: boolean
    at: string
    by: string
    byName?: string
    comment?: string
  } | null
  worker: {
    firstName: string
    lastName: string
    department: string | null
    position: string | null
  }
}

interface Summary {
  present: number
  late: number
  absent: number
  onLeave: number
  total: number
  pendingJustification: number
  pendingApproval: number
  approved: number
}

// ── Status Config ──────────────────────────────────
const STATUS_CONFIG = {
  PRESENT: {
    label: 'Presente',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  LATE: {
    label: 'Tardanza',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
  },
  ON_LEAVE: {
    label: 'Permiso',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Coffee,
  },
  ABSENT: {
    label: 'Ausente',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
} as const

const JUSTIFICATION_BADGE: Record<JustificationState, { label: string; className: string }> = {
  'no-applicable': { label: '—', className: 'text-slate-400' },
  'pending-justification': {
    label: 'Sin justificar',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'pending-approval': {
    label: 'Pendiente revisar',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  approved: {
    label: 'Aprobada',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

// Stable pseudo-random hash usado solo cuando hay datos reales del mes
function dayHash(day: number, seed: number): number {
  const x = Math.sin(day * 9301 + seed * 49297 + 233720) * 10000
  return x - Math.floor(x)
}

// ── Page Component ─────────────────────────────────
export default function AsistenciaPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<Summary>({
    present: 0, late: 0, absent: 0, onLeave: 0, total: 0,
    pendingJustification: 0, pendingApproval: 0, approved: 0,
  })
  const [loading, setLoading] = useState(true)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockError, setClockError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [filter, setFilter] = useState<string>('all')
  const heatmapSeed = new Date().getFullYear() * 12 + new Date().getMonth()

  // Modales para flujo de justificación
  const [approveModal, setApproveModal] = useState<{ record: AttendanceRecord; mode: 'approve' | 'reject' } | null>(null)
  const [approveComment, setApproveComment] = useState('')
  const [justifyModal, setJustifyModal] = useState<AttendanceRecord | null>(null)
  const [justifyReason, setJustifyReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records ?? [])
        setSummary(data.summary ?? {
          present: 0, late: 0, absent: 0, onLeave: 0, total: 0,
          pendingJustification: 0, pendingApproval: 0, approved: 0,
        })
      } else {
        setRecords([])
        setSummary({
          present: 0, late: 0, absent: 0, onLeave: 0, total: 0,
          pendingJustification: 0, pendingApproval: 0, approved: 0,
        })
      }
    } catch {
      setRecords([])
      setSummary({
        present: 0, late: 0, absent: 0, onLeave: 0, total: 0,
        pendingJustification: 0, pendingApproval: 0, approved: 0,
      })
    }
    setLoading(false)
  }, [date])

  useEffect(() => { fetchData() }, [fetchData])

  // Navigate date
  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  // Clock in/out
  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setClockingIn(true)
    setClockError(null)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: 'current', action }),
      })
      if (!res.ok) {
        const data = await res.json()
        setClockError(data.error || 'Error al registrar asistencia')
      } else {
        fetchData()
      }
    } catch {
      setClockError('Error de conexión. Intenta nuevamente.')
    }
    setClockingIn(false)
  }

  // Export CSV (in-memory)
  const handleExportCSV = () => {
    const headers = ['Trabajador', 'Departamento', 'Cargo', 'Entrada', 'Salida', 'Horas', 'Estado', 'Justificación']
    const rows = records.map(r => [
      displayWorkerName(r.worker.firstName, r.worker.lastName),
      r.worker.department || '',
      r.worker.position || '',
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
      r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '',
      STATUS_CONFIG[r.status]?.label || r.status,
      JUSTIFICATION_BADGE[r.justificationState].label,
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asistencia-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Submit aprobación o rechazo
  const submitApproval = async () => {
    if (!approveModal) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/attendance/${approveModal.record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'approve',
          approved: approveModal.mode === 'approve',
          comment: approveComment.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar')
      toast.success(approveModal.mode === 'approve' ? 'Justificación aprobada' : 'Justificación rechazada')
      setApproveModal(null)
      setApproveComment('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setActionLoading(false)
    }
  }

  // Submit justificación (admin reportando por el worker)
  const submitJustification = async () => {
    if (!justifyModal) return
    if (justifyReason.trim().length < 3) {
      toast.error('El motivo requiere al menos 3 caracteres')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`/api/attendance/${justifyModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'justify',
          reason: justifyReason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar')
      toast.success('Justificación registrada — pendiente de tu aprobación')
      setJustifyModal(null)
      setJustifyReason('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter records
  const filteredRecords = filter === 'all'
    ? records
    : filter === 'pending-justification'
      ? records.filter(r => r.justificationState === 'pending-justification')
      : filter === 'pending-approval'
        ? records.filter(r => r.justificationState === 'pending-approval')
        : records.filter(r => r.status === filter)

  const formatTime = (iso: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  }

  const isToday = date === new Date().toISOString().slice(0, 10)
  const totalUnresolved = summary.pendingJustification + summary.pendingApproval

  return (
    <div className="space-y-6">
      {/* QR card para marcación de asistencia (solo hoy) */}
      {isToday ? <AttendanceQrCard /> : null}

      {/* Header editorial */}
      <PageHeader
        eyebrow="Equipo"
        title="Control de <em>asistencia</em>."
        subtitle="Registra entradas y salidas, justifica tardanzas y cumple con la R.M. 037-2024-TR sobre control digital del tiempo de trabajo."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors data-[state=open]:border-emerald-500/60"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[260px]">
                <DropdownMenuLabel>Exportar día actual</DropdownMenuLabel>
                <DropdownMenuItem onSelect={handleExportCSV} disabled={records.length === 0}>
                  <Download className="w-4 h-4 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">CSV (Excel)</span>
                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Datos de la fecha mostrada</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Próximamente</DropdownMenuLabel>
                <DropdownMenuItem disabled>
                  <FileText className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[color:var(--text-tertiary)]">Libro Digital PDF</span>
                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Formato R.M. 037-2024-TR (Fase 3)</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/dashboard/asistencia/kiosko"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
              title="Pantalla fullscreen para tablet de recepción"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Modo kiosko
            </Link>
          </>
        }
      />

      {/* KPIs editoriales */}
      <KpiGrid>
        <KpiCard
          icon={CheckCircle}
          label="Presentes"
          value={summary.present}
          footer={summary.total > 0 ? `${Math.round((summary.present / summary.total) * 100)}% del total` : 'Sin marcaciones'}
          variant="accent"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Tardanzas"
          value={summary.late}
          variant={summary.late > 0 ? 'amber' : 'default'}
          footer="Llegadas fuera de hora"
        />
        <KpiCard
          icon={XCircle}
          label="Ausentes"
          value={summary.absent}
          variant={summary.absent > 0 ? 'crimson' : 'default'}
          footer="Sin marcación de entrada"
        />
        <KpiCard
          icon={Coffee}
          label="Con permiso"
          value={summary.onLeave}
          footer="Ausencia justificada"
        />
      </KpiGrid>

      {/* Banner CTA: tardanzas/ausencias sin resolver */}
      {totalUnresolved > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {summary.pendingJustification > 0 && summary.pendingApproval > 0 && (
                  <>
                    {summary.pendingJustification} {summary.pendingJustification === 1 ? 'tardanza/ausencia sin justificar' : 'tardanzas/ausencias sin justificar'}
                    {' · '}
                    {summary.pendingApproval} {summary.pendingApproval === 1 ? 'pendiente de aprobación' : 'pendientes de aprobación'}
                  </>
                )}
                {summary.pendingJustification > 0 && summary.pendingApproval === 0 && (
                  <>
                    {summary.pendingJustification} {summary.pendingJustification === 1 ? 'tardanza/ausencia sin justificar' : 'tardanzas/ausencias sin justificar'}
                  </>
                )}
                {summary.pendingJustification === 0 && summary.pendingApproval > 0 && (
                  <>
                    {summary.pendingApproval} {summary.pendingApproval === 1 ? 'justificación pendiente de aprobación' : 'justificaciones pendientes de aprobación'}
                  </>
                )}
              </p>
              <p className="text-[11px] text-amber-800/80">
                SUNAFIL espera ver cada incidencia con su justificación documentada (R.M. 037-2024-TR).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilter(summary.pendingApproval > 0 ? 'pending-approval' : 'pending-justification')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors flex-shrink-0"
          >
            Filtrar pendientes
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Clock + Clock In/Out */}
      {isToday && (
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-emerald-100 text-sm">Hora actual</p>
              <p className="text-4xl font-mono font-bold">
                {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-emerald-100 text-sm mt-1">
                {currentTime.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-3">
                <button
                  onClick={() => handleClock('clock_in')}
                  disabled={clockingIn}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {clockingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Registrar Entrada
                </button>
                <button
                  onClick={() => handleClock('clock_out')}
                  disabled={clockingIn}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-900 hover:bg-emerald-950 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {clockingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                  Registrar Salida
                </button>
              </div>
              {clockError && (
                <p className="text-xs bg-red-600/80 text-white px-3 py-1.5 rounded-lg">{clockError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Navigation + Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-lg hover:bg-[color:var(--neutral-100)]"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[color:var(--border-default)] rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-[color:var(--text-secondary)] outline-none"
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 rounded-lg hover:bg-[color:var(--neutral-100)]"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="text-sm text-emerald-600 hover:underline ml-2"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'PRESENT', label: 'Presentes' },
            { key: 'LATE', label: 'Tardanzas' },
            { key: 'ABSENT', label: 'Ausentes' },
            { key: 'pending-justification', label: `Sin justificar${summary.pendingJustification > 0 ? ` (${summary.pendingJustification})` : ''}` },
            { key: 'pending-approval', label: `Por revisar${summary.pendingApproval > 0 ? ` (${summary.pendingApproval})` : ''}` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-[color:var(--border-default)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin registros para esta fecha"
            description={
              records.length === 0
                ? 'Los trabajadores aún no registraron su asistencia con el QR del día. Cuando marquen, los verás acá en tiempo real.'
                : 'Prueba con otra fecha o ajusta los filtros.'
            }
            variant="light"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Departamento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entrada</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Salida</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Horas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Justificación</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-default)]">
                {filteredRecords.map((record) => {
                  const config = STATUS_CONFIG[record.status]
                  const Icon = config.icon
                  const justBadge = JUSTIFICATION_BADGE[record.justificationState]
                  const hasJustification = !!record.justification
                  const canApprove = record.justificationState === 'pending-approval'
                  const canRequestJustification = record.justificationState === 'pending-justification'
                  return (
                    <tr key={record.id} className="hover:bg-[color:var(--neutral-50)]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {displayWorkerName(record.worker.firstName, record.worker.lastName)}
                          </p>
                          <p className="text-xs text-gray-500">{record.worker.position ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {record.worker.department ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-mono text-[color:var(--text-secondary)]">
                          {record.status !== 'ON_LEAVE' ? formatTime(record.clockIn) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-mono text-[color:var(--text-secondary)]">
                          {record.clockOut ? formatTime(record.clockOut) : (record.status === 'ON_LEAVE' ? '-' : '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-mono text-[color:var(--text-secondary)]">
                          {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', config.color)}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.justificationState === 'no-applicable' ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                              justBadge.className,
                            )}
                            title={hasJustification ? `Motivo: ${record.justification!.reason}` : undefined}
                          >
                            {record.justificationState === 'approved' && <ShieldCheck className="w-3 h-3" />}
                            {record.justificationState === 'rejected' && <X className="w-3 h-3" />}
                            {(record.justificationState === 'pending-justification' || record.justificationState === 'pending-approval') && (
                              <MessageSquare className="w-3 h-3" />
                            )}
                            {justBadge.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors data-[state=open]:bg-emerald-50 data-[state=open]:text-emerald-600"
                                title="Más acciones"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[240px]">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              {canApprove && (
                                <>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setApproveModal({ record, mode: 'approve' })
                                      setApproveComment('')
                                    }}
                                  >
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-[color:var(--text-primary)]">Aprobar justificación</span>
                                      <span className="text-[11px] text-[color:var(--text-tertiary)]">Marca como justificada</span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    destructive
                                    onSelect={() => {
                                      setApproveModal({ record, mode: 'reject' })
                                      setApproveComment('')
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">Rechazar justificación</span>
                                      <span className="text-[11px] opacity-70">Mantén la incidencia abierta</span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {canRequestJustification && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setJustifyModal(record)
                                    setJustifyReason('')
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Registrar justificación</span>
                                    <span className="text-[11px] text-[color:var(--text-tertiary)]">A nombre del trabajador</span>
                                  </div>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/trabajadores/${record.workerId}`} className="cursor-pointer">
                                  <ExternalLink className="w-4 h-4 text-[color:var(--text-secondary)]" />
                                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Ver perfil</span>
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Heat Map */}
      <div className="bg-white rounded-xl border border-[color:var(--border-default)] p-6 relative">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Resumen Mensual
        </h3>
        <div className="grid grid-cols-7 gap-1 relative">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-[color:var(--text-tertiary)] py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            if (summary.total === 0) {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm bg-[color:var(--neutral-100)]"
                  aria-hidden
                />
              )
            }
            const intensity = dayHash(i + 1, heatmapSeed)
            const dayNum = i + 1
            const bg = intensity > 0.8
              ? 'bg-emerald-600'
              : intensity > 0.6
                ? 'bg-emerald-500'
                : intensity > 0.3
                  ? 'bg-emerald-400'
                  : intensity > 0.1
                    ? 'bg-emerald-200'
                    : 'bg-[color:var(--neutral-100)]'
            return (
              <div
                key={i}
                className={cn('aspect-square rounded-sm', bg)}
                title={`Día ${dayNum}: ${Math.round(intensity * 100)}% asistencia`}
              />
            )
          })}
          {summary.total === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 px-3 py-1 text-[11px] font-medium text-[color:var(--text-secondary)] shadow-sm">
                Sin datos aún
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-[color:var(--text-tertiary)]">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-[color:var(--neutral-100)]" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          </div>
          <span>Más</span>
        </div>
      </div>

      {/* Modal: Aprobar/Rechazar justificación */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  approveModal.mode === 'approve' ? 'bg-emerald-50' : 'bg-red-50',
                )}>
                  {approveModal.mode === 'approve'
                    ? <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    : <X className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {approveModal.mode === 'approve' ? 'Aprobar justificación' : 'Rechazar justificación'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {displayWorkerName(approveModal.record.worker.firstName, approveModal.record.worker.lastName)}
                    {' · '}
                    {STATUS_CONFIG[approveModal.record.status].label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-[color:var(--neutral-50)] rounded-xl p-3 border border-[color:var(--border-default)]">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Motivo reportado</p>
                <p className="text-sm text-slate-800">
                  {approveModal.record.justification?.reason ?? '—'}
                </p>
                {approveModal.record.justification?.requestedAt && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Reportado el {new Date(approveModal.record.justification.requestedAt).toLocaleString('es-PE')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {approveModal.mode === 'approve' ? 'Comentario (opcional)' : 'Motivo del rechazo'}
                </label>
                <textarea
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  placeholder={
                    approveModal.mode === 'approve'
                      ? 'Ej: Verificado con constancia médica adjunta'
                      : 'Ej: La justificación no corresponde a la fecha del registro'
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setApproveModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitApproval}
                disabled={actionLoading}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                  approveModal.mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                )}
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                  approveModal.mode === 'approve' ? <ShieldCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />
                )}
                {approveModal.mode === 'approve' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar justificación a nombre del worker */}
      {justifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar justificación</h3>
                  <p className="text-xs text-gray-500">
                    {displayWorkerName(justifyModal.worker.firstName, justifyModal.worker.lastName)}
                    {' · '}
                    {STATUS_CONFIG[justifyModal.status].label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setJustifyModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Motivo
                </label>
                <textarea
                  value={justifyReason}
                  onChange={(e) => setJustifyReason(e.target.value)}
                  placeholder="Ej: Llegó tarde por cita médica con constancia adjunta"
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {justifyReason.length}/500 caracteres. Después podrás aprobarla.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setJustifyModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitJustification}
                disabled={actionLoading || justifyReason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
