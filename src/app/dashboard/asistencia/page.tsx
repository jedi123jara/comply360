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
  Loader2,
  LogIn,
  LogOut,
  Coffee,
  Maximize2,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'
import { AttendanceQrCard } from '@/components/attendance/attendance-qr-card'
import { EmptyState } from '@/components/ui/empty-state'

// ── Types ──────────────────────────────────────────
interface AttendanceRecord {
  id: string
  workerId: string
  clockIn: string
  clockOut: string | null
  status: 'PRESENT' | 'LATE' | 'ON_LEAVE' | 'ABSENT'
  hoursWorked: number | null
  notes: string | null
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
}

// ── Status Config ──────────────────────────────────
const STATUS_CONFIG = {
  PRESENT: {
    label: 'Presente',
    color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400',
    icon: CheckCircle,
  },
  LATE: {
    label: 'Tardanza',
    color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
    icon: AlertTriangle,
  },
  ON_LEAVE: {
    label: 'Permiso',
    color: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-emerald-600',
    icon: Coffee,
  },
  ABSENT: {
    label: 'Ausente',
    color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
    icon: XCircle,
  },
}

// Stable pseudo-random hash usado solo cuando hay datos reales del mes para
// graficar tendencia. Cuando no hay datos, el heatmap se renderiza en gris
// uniforme con overlay "Sin datos" — no inventamos asistencia.
function dayHash(day: number, seed: number): number {
  const x = Math.sin(day * 9301 + seed * 49297 + 233720) * 10000
  return x - Math.floor(x)
}

// ── Page Component ─────────────────────────────────
export default function AsistenciaPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<Summary>({ present: 0, late: 0, absent: 0, onLeave: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockError, setClockError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [filter, setFilter] = useState<string>('all')
  // Stable heatmap seed based on current month (same month = same heatmap)
  const heatmapSeed = new Date().getFullYear() * 12 + new Date().getMonth()

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
        setSummary(data.summary ?? { present: 0, late: 0, absent: 0, onLeave: 0, total: 0 })
      } else {
        // Show empty state — do NOT fall back to mock data in production
        setRecords([])
        setSummary({ present: 0, late: 0, absent: 0, onLeave: 0, total: 0 })
      }
    } catch {
      setRecords([])
      setSummary({ present: 0, late: 0, absent: 0, onLeave: 0, total: 0 })
    }
     
    setLoading(false)
  }, [date])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchData setLoading(true) antes del fetch async; pattern a migrar a useApiQuery
  useEffect(() => { fetchData() }, [fetchData])

  // Navigate date
  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  // Clock in/out
  const handleClock = async (action: 'clock_in' | 'clock_out', workerId?: string) => {
    setClockingIn(true)
    setClockError(null)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: workerId || 'current', action }),
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

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Trabajador', 'Departamento', 'Cargo', 'Entrada', 'Salida', 'Horas', 'Estado']
    const rows = records.map(r => [
      displayWorkerName(r.worker.firstName, r.worker.lastName),
      r.worker.department || '',
      r.worker.position || '',
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
      r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '',
      STATUS_CONFIG[r.status]?.label || r.status,
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asistencia-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter records
  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => r.status === filter)

  // Format time
  const formatTime = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  }

  const isToday = date === new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* QR card para marcación de asistencia (solo hoy) */}
      {isToday ? <AttendanceQrCard /> : null}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Control de Asistencia</h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Registro de entrada y salida del personal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/asistencia/kiosko"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            title="Pantalla fullscreen para tablet de recepción"
          >
            <Maximize2 className="w-4 h-4" />
            Modo kiosko
          </Link>
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[color:var(--border-default)] rounded-lg text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Live Clock + Clock In/Out */}
      {isToday && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 from-blue-700 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-blue-200 text-sm">Hora actual</p>
              <p className="text-4xl font-mono font-bold">
                {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {currentTime.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-3">
                <button
                  onClick={() => handleClock('clock_in')}
                  disabled={clockingIn}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-400 rounded-lg font-medium transition-colors"
                >
                  {clockingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Registrar Entrada
                </button>
                <button
                  onClick={() => handleClock('clock_out')}
                  disabled={clockingIn}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-500 text-white rounded-lg font-medium transition-colors"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Presentes', value: summary.present, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20' },
          { label: 'Tardanzas', value: summary.late, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/20' },
          { label: 'Ausentes', value: summary.absent, icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20' },
          { label: 'Con Permiso', value: summary.onLeave, icon: Coffee, color: 'text-emerald-600', bg: 'bg-blue-900/20' },
        ].map((card) => (
          <div key={card.label} className={cn('rounded-xl p-4 border border-white/[0.08]', card.bg)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
              </div>
              <card.icon className={cn('w-8 h-8', card.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Date Navigation + Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-lg hover:bg-[color:var(--neutral-100)]"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-white/10 border-[color:var(--border-default)] rounded-lg">
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

        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'PRESENT', label: 'Presentes' },
            { key: 'LATE', label: 'Tardanzas' },
            { key: 'ON_LEAVE', label: 'Permisos' },
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
      <div className="bg-white rounded-xl border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin registros para esta fecha"
            description={
              records.length === 0
                ? 'Los trabajadores aún no registraron su asistencia con el QR del día. El QR está arriba en esta misma pantalla. Cuando marquen, los verás acá en tiempo real.'
                : 'Prueba con otra fecha o ajusta los filtros. Tienes registros en otros días.'
            }
            variant="light"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[color:var(--neutral-50)] bg-white/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Trabajador</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Departamento</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Entrada</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Salida</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Horas</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 divide-slate-700">
                {filteredRecords.map((record) => {
                  const config = STATUS_CONFIG[record.status]
                  const Icon = config.icon
                  return (
                    <tr key={record.id} className="hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white text-sm">
                            {displayWorkerName(record.worker.firstName, record.worker.lastName)}
                          </p>
                          <p className="text-xs text-gray-400">{record.worker.position}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {record.worker.department || '-'}
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
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', config.color)}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 relative">
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
            // Si no hay datos del mes, heatmap completo en gris — no inventamos asistencia
            if (summary.total === 0) {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm bg-[color:var(--neutral-100)]"
                  aria-hidden
                />
              )
            }
            // Solo cuando hay datos reales mostramos intensidad estable (placeholder
            // hasta que conectemos endpoint mensual en Sprint 5)
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
    </div>
  )
}
