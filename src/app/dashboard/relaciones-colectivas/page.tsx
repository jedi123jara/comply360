'use client'

import { useState, useEffect, useMemo } from 'react'
import { Scale, Users, FileText, AlertTriangle, Plus, X, Edit2, Trash2, Clock, XCircle, Loader2, Calendar, Bell, ChevronDown, ChevronUp, ExternalLink, Shield, Megaphone, Gavel, UserCheck, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { confirm } from '@/components/ui/confirm-dialog'

/* ===================================
   Types
   =================================== */
type SindicalType =
  | 'SINDICATO'
  | 'CONVENIO_COLECTIVO'
  | 'NEGOCIACION'
  | 'PLIEGO_RECLAMOS'
  | 'FUERO_SINDICAL'
  | 'HUELGA'

type RecordStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED' | 'CLOSED'

interface SindicalRecord {
  id: string
  orgId: string
  type: SindicalType
  title: string
  description: string | null
  data: Record<string, unknown> | null
  startDate: string | null
  endDate: string | null
  status: RecordStatus
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  activeUnions: number
  activeConvenios: number
  ongoingNeg: number
  openPliego: number
}

/* ===================================
   Constants
   =================================== */
const TYPE_META: Record<SindicalType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; description: string }> = {
  SINDICATO: { label: 'Sindicato', icon: Users, color: 'text-emerald-600', bg: 'bg-blue-900/30', description: 'Organización sindical registrada' },
  CONVENIO_COLECTIVO: { label: 'Convenio Colectivo', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-900/30', description: 'Acuerdo colectivo vigente' },
  NEGOCIACION: { label: 'Negociación', icon: Gavel, color: 'text-amber-400', bg: 'bg-amber-900/30', description: 'Proceso de negociación en curso' },
  PLIEGO_RECLAMOS: { label: 'Pliego de Reclamos', icon: Megaphone, color: 'text-orange-400', bg: 'bg-orange-900/30', description: 'Pliego presentado por el sindicato' },
  FUERO_SINDICAL: { label: 'Fuero Sindical', icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-900/30', description: 'Dirigentes con protección legal' },
  HUELGA: { label: 'Huelga', icon: Flame, color: 'text-red-400', bg: 'bg-red-900/30', description: 'Registro de medida de fuerza' },
}

const STATUS_META: Record<RecordStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-emerald-100 text-emerald-800 bg-emerald-900/40 text-emerald-700' },
  EXPIRED: { label: 'Vencido', color: 'bg-red-100 text-red-800 bg-red-900/40 text-red-300' },
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 bg-amber-900/40 text-amber-700' },
  SUSPENDED: { label: 'Suspendido', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] bg-gray-700 text-[color:var(--text-secondary)]' },
  CLOSED: { label: 'Cerrado', color: 'bg-slate-100 text-slate-700 bg-[color:var(--neutral-100)] text-slate-300' },
}

const LEGAL_REFS = [
  { norm: 'Ley 25593', desc: 'Ley de Relaciones Colectivas de Trabajo', art: 'Arts. 2-19' },
  { norm: 'D.S. 010-2003-TR', desc: 'TUO de la Ley de Relaciones Colectivas', art: 'Reglamento' },
  { norm: 'D.S. 011-92-TR', desc: 'Reglamento de Organización Sindical', art: 'Art. 5-12' },
  { norm: 'D.Leg. 728', desc: 'Fuero sindical y protección de dirigentes', art: 'Art. 30' },
]

const TABS: { key: SindicalType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'SINDICATO', label: 'Sindicatos' },
  { key: 'CONVENIO_COLECTIVO', label: 'Convenios' },
  { key: 'NEGOCIACION', label: 'Negociaciones' },
  { key: 'PLIEGO_RECLAMOS', label: 'Pliegos' },
  { key: 'FUERO_SINDICAL', label: 'Fuero Sindical' },
  { key: 'HUELGA', label: 'Huelgas' },
]

/* ===================================
   Helpers
   =================================== */
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(d: string | null) {
  if (!d) return null
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/* ===================================
   Modal: Create / Edit
   =================================== */
interface ModalProps {
  initial?: Partial<SindicalRecord>
  onClose: () => void
  onSave: (data: Partial<SindicalRecord>) => Promise<void>
  saving: boolean
}

function RecordModal({ initial, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState({
    type: initial?.type ?? 'SINDICATO' as SindicalType,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : '',
    status: initial?.status ?? 'ACTIVE' as RecordStatus,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...initial,
      ...form,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
          <h2 className="text-lg font-bold text-white text-gray-100">
            {initial?.id ? 'Editar registro' : 'Nuevo registro sindical'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[color:var(--neutral-100)] text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Tipo *</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as SindicalType }))}
              className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm"
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Título *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Sindicato de Trabajadores MYPE S.A."
              className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm"
            />
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detalles adicionales..."
              className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm resize-none"
            />
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Fecha fin / vencimiento</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm"
              />
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Estado</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as RecordStatus }))}
              className="w-full px-3 py-2 border border-white/10 border-[color:var(--border-default)] rounded-lg bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 text-sm"
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-200)] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial?.id ? 'Guardar cambios' : 'Crear registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===================================
   Record Card
   =================================== */
function RecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: SindicalRecord
  onEdit: (r: SindicalRecord) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[record.type]
  const statusMeta = STATUS_META[record.status as RecordStatus] ?? STATUS_META.ACTIVE
  const Icon = meta.icon
  const days = daysUntil(record.endDate)
  const isExpiringSoon = days !== null && days > 0 && days <= 90
  const isExpired = days !== null && days <= 0

  return (
    <div className={cn(
      'bg-white rounded-xl border transition-all',
      isExpired ? 'border-red-800' :
      isExpiringSoon ? 'border-amber-800' :
      'border-white/[0.08]'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', meta.bg)}>
            <Icon className={cn('w-5 h-5', meta.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">{meta.label}</p>
                <h3 className="font-semibold text-white text-gray-100 text-sm leading-tight">{record.title}</h3>
              </div>
              <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', statusMeta.color)}>
                {statusMeta.label}
              </span>
            </div>
            {/* Dates */}
            <div className="flex items-center gap-4 mt-2">
              {record.startDate && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>Inicio: {formatDate(record.startDate)}</span>
                </div>
              )}
              {record.endDate && (
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isExpired ? 'text-red-400' :
                  isExpiringSoon ? 'text-amber-400' :
                  'text-gray-400'
                )}>
                  <Clock className="w-3 h-3" />
                  <span>
                    {isExpired
                      ? `Venció hace ${Math.abs(days!)} días`
                      : isExpiringSoon
                      ? `Vence en ${days} días`
                      : `Hasta: ${formatDate(record.endDate)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand/Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] border-white/[0.08]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[color:var(--text-secondary)] transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar' : 'Ver detalle'}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(record)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-blue-900/30 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded description */}
        {expanded && record.description && (
          <div className="mt-3 p-3 bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 rounded-lg text-sm text-[color:var(--text-secondary)] leading-relaxed">
            {record.description}
          </div>
        )}
      </div>
    </div>
  )
}

/* ===================================
   Main Page
   =================================== */
export default function RelacionesColectivasPage() {
  const [records, setRecords] = useState<SindicalRecord[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, activeUnions: 0, activeConvenios: 0, ongoingNeg: 0, openPliego: 0 })
  const [expiringSoon, setExpiringSoon] = useState<SindicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SindicalType | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SindicalRecord | undefined>()
  const [saving, setSaving] = useState(false)
  const [showLegal, setShowLegal] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/relaciones-colectivas')
      if (!res.ok) throw new Error('Error al cargar datos')
      const json = await res.json()
      setRecords(json.records ?? [])
      setStats(json.stats ?? { total: 0, activeUnions: 0, activeConvenios: 0, ongoingNeg: 0, openPliego: 0 })
      setExpiringSoon(json.expiringSoon ?? [])
    } catch {
      setError('No se pudieron cargar los registros sindicales.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return records
    return records.filter(r => r.type === activeTab)
  }, [records, activeTab])

  const handleSave = async (data: Partial<SindicalRecord>) => {
    setSaving(true)
    try {
      const isEdit = !!data.id
      const res = await fetch('/api/relaciones-colectivas', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      setShowModal(false)
      setEditingRecord(undefined)
      await load()
      toast.success('Registro guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar este registro?',
      description: 'Se eliminará el registro de relaciones colectivas seleccionado. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/relaciones-colectivas?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      toast.success('Registro eliminado')
      await load()
    } catch {
      toast.error('No se pudo eliminar. Intentá de nuevo.')
    }
  }

  const openNew = () => { setEditingRecord(undefined); setShowModal(true) }
  const openEdit = (r: SindicalRecord) => { setEditingRecord(r); setShowModal(true) }

  /* ---- Render ---- */
  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando relaciones colectivas...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white text-gray-100 flex items-center gap-2">
            <Scale className="w-7 h-7 text-primary" />
            Relaciones Colectivas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Sindicatos, convenios colectivos, negociaciones y pliegos de reclamos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegal(!showLegal)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-white border border-white/[0.08] rounded-lg hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] transition-colors"
          >
            <Shield className="w-4 h-4" />
            Marco legal
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-light rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo registro
          </button>
        </div>
      </div>

      {/* Legal references panel */}
      {showLegal && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-blue-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Marco normativo — Relaciones Colectivas de Trabajo
            </h3>
            <button onClick={() => setShowLegal(false)} className="text-emerald-600 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEGAL_REFS.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white bg-blue-900/30 rounded-lg">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-600">{r.norm}</p>
                  <p className="text-xs text-emerald-600">{r.desc} — {r.art}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total registros', value: stats.total, icon: FileText, color: 'text-gray-600' },
          { label: 'Sindicatos activos', value: stats.activeUnions, icon: Users, color: 'text-blue-600' },
          { label: 'Convenios vigentes', value: stats.activeConvenios, icon: FileText, color: 'text-emerald-600' },
          { label: 'En negociación', value: stats.ongoingNeg, icon: Gavel, color: 'text-amber-600' },
          { label: 'Pliegos abiertos', value: stats.openPliego, icon: Megaphone, color: 'text-orange-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-white/[0.08] p-3">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-bold text-white text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Expiring soon alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {expiringSoon.length} registro(s) próximos a vencer (90 días)
              </h3>
              <div className="space-y-1.5">
                {expiringSoon.map(r => {
                  const days = daysUntil(r.endDate)
                  return (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700 font-medium">{r.title}</span>
                      <span className="text-amber-400 text-xs font-semibold">
                        {days! <= 0 ? 'Vencido' : `${days} días`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-400 border border-white/[0.08] hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]'
            )}
          >
            {tab.label}
            {tab.key !== 'ALL' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({records.filter(r => r.type === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-white/[0.08] p-12 text-center">
          <Scale className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white text-gray-100 mb-2">
            {activeTab === 'ALL' ? 'Sin registros sindicales' : `Sin registros de tipo ${TYPE_META[activeTab as SindicalType]?.label}`}
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Registra sindicatos, convenios colectivos, procesos de negociación y pliegos de reclamos de tu empresa.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-light rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear primer registro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => (
            <RecordCard key={r.id} record={r} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Timeline de negociaciones activas */}
      {records.filter(r => r.type === 'NEGOCIACION' && r.status === 'ACTIVE').length > 0 && (
        <div className="bg-white rounded-xl border border-white/[0.08] p-5">
          <h2 className="text-sm font-bold text-white text-gray-100 mb-4 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-600" />
            Negociaciones en curso
          </h2>
          <div className="space-y-3">
            {records
              .filter(r => r.type === 'NEGOCIACION' && r.status === 'ACTIVE')
              .map((r) => {
                const days = daysUntil(r.endDate)
                const pct = r.startDate && r.endDate
                  ? Math.max(0, Math.min(100, ((Date.now() - new Date(r.startDate).getTime()) /
                    (new Date(r.endDate).getTime() - new Date(r.startDate).getTime())) * 100))
                  : 0
                return (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white text-gray-100">{r.title}</span>
                      {days !== null && (
                        <span className={cn('text-xs font-medium', days <= 30 ? 'text-red-600' : days <= 60 ? 'text-amber-600' : 'text-gray-500')}>
                          {days <= 0 ? 'Plazo vencido' : `${days} días restantes`}
                        </span>
                      )}
                    </div>
                    {r.startDate && r.endDate && (
                      <div className="w-full bg-[color:var(--neutral-100)] rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-amber-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Inicio: {formatDate(r.startDate)}</span>
                      <span>Límite: {formatDate(r.endDate)}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Guía legal */}
      <div className="bg-slate-50 bg-white/50 rounded-xl border border-slate-200 border-white/[0.08] p-5">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[color:var(--text-secondary)]" />
          Plazos legales importantes (Ley 25593 y D.S. 010-2003-TR)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          {[
            { plazo: '10 días hábiles', desc: 'Para que el empleador responda al pliego de reclamos' },
            { plazo: '20 días', desc: 'Duración mínima de la etapa de trato directo' },
            { plazo: '10 días', desc: 'Para solicitar conciliación al MTPE si falla el trato directo' },
            { plazo: '30 días', desc: 'Duración máxima del procedimiento de conciliación' },
            { plazo: '3 afiliados mínimo', desc: 'Para formar un sindicato de empresa' },
            { plazo: '20% planilla', desc: 'Para que el sindicato sea mayoritario (negociación con eficacia general)' },
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white bg-[color:var(--neutral-100)] rounded-lg">
              <span className="shrink-0 font-bold text-primary text-emerald-600">{p.plazo}</span>
              <span className="text-gray-400">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <RecordModal
          initial={editingRecord}
          onClose={() => { setShowModal(false); setEditingRecord(undefined) }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}
