'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  FileText, RefreshCw, Plus, ChevronDown, ChevronUp,
  AlertTriangle, DollarSign, X, Check,
  Clock, Receipt, Search, ExternalLink, Info, Percent,
} from 'lucide-react'
import { displayWorkerName, workerInitials } from '@/lib/utils'
import { confirm } from '@/components/ui/confirm-dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  periodo: string
  grossAmount: number
  retention: number
  netAmount: number
  hasRetention: boolean
  status: string
  paidAt: string | null
  notes: string | null
}

interface ProviderRow {
  provider: {
    id: string
    firstName: string
    lastName: string
    documentNumber: string
    ruc: string | null
    profession: string
    monthlyAmount: number
    hasSuspensionRetencion: boolean
    status: string
  }
  invoices: Invoice[]
  summary: {
    count: number
    totalBruto: number
    totalRetencion: number
    totalNeto: number
    pendientes: number
    pagados: number
  }
}

interface OrgTotals {
  totalProviders: number
  providersConRecibo: number
  providersSinRecibo: number
  totalRecibos: number
  totalBruto: number
  totalRetencion: number
  totalNeto: number
  pendientes: number
  pagados: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function currentPeriodo() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  prefix,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  prefix?: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'blue' | 'amber' | 'green' | 'purple' | 'red'
}) {
  const colors: Record<string, { bg: string; icon: string }> = {
    blue:   { bg: 'bg-blue-500/10',   icon: 'text-emerald-600'   },
    amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400'  },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400' },
    red:    { bg: 'bg-red-500/10',    icon: 'text-red-400'    },
  }
  const c = colors[accent]
  return (
    <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${c.bg}`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold text-white">
        {prefix && <span className="text-sm font-normal text-[color:var(--text-tertiary)] mr-0.5">{prefix}</span>}
        {value}
      </p>
      <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

// ── New Invoice Modal ─────────────────────────────────────────────────────────

function NewInvoiceModal({
  providerId,
  providerName,
  periodo,
  hasSuspension,
  onClose,
  onSaved,
}: {
  providerId: string
  providerName: string
  periodo: string
  hasSuspension: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    invoiceNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    periodo,
    grossAmount: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const gross = parseFloat(form.grossAmount) || 0
  const shouldRetain = gross > 1500 && !hasSuspension
  const retention = shouldRetain ? Math.round(gross * 0.08 * 100) / 100 : 0
  const netAmount = Math.round((gross - retention) * 100) / 100

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/prestadores/${providerId}/recibos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          issueDate: form.issueDate,
          periodo: form.periodo,
          grossAmount: gross,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        setError(j.error ?? 'Error al crear recibo')
        return
      }
      onSaved()
    } catch {
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--border-default)]">
          <div>
            <h3 className="font-semibold text-white">Registrar Recibo por Honorarios</h3>
            <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{providerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-[color:var(--text-tertiary)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[color:var(--text-tertiary)] mb-1 block">N de Recibo *</label>
              <input
                value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="E001-00001"
                className="w-full px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[color:var(--text-tertiary)] mb-1 block">Periodo *</label>
              <input
                type="month"
                value={form.periodo}
                onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                className="w-full px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[color:var(--text-tertiary)] mb-1 block">Fecha Emision *</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[color:var(--text-tertiary)] mb-1 block">Monto Bruto (S/) *</label>
              <input
                type="number"
                step="0.01"
                value={form.grossAmount}
                onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[color:var(--text-tertiary)] mb-1 block">
              Notas <span className="font-normal text-gray-600">(opcional)</span>
            </label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Descripcion del servicio..."
              className="w-full px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          {/* Calculation preview */}
          {gross > 0 && (
            <div className="bg-[color:var(--neutral-50)] border border-[color:var(--border-default)] rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[color:var(--text-tertiary)]">Monto bruto</span>
                <span className="font-medium text-[color:var(--text-secondary)]">S/ {fmt(gross)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[color:var(--text-tertiary)]">
                  Retencion IR 4ta ({shouldRetain ? '8%' : hasSuspension ? 'Suspendida' : '< S/ 1,500'})
                </span>
                <span className={`font-medium ${shouldRetain ? 'text-red-400' : 'text-gray-600'}`}>
                  {shouldRetain ? `- S/ ${fmt(retention)}` : 'S/ 0.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-[color:var(--border-default)]">
                <span className="font-semibold text-[color:var(--text-secondary)]">Neto a pagar</span>
                <span className="font-bold text-amber-500">S/ {fmt(netAmount)}</span>
              </div>
            </div>
          )}

          {hasSuspension && (
            <div className="flex items-start gap-2 text-xs text-emerald-600 bg-blue-500/[0.05] rounded-xl p-2.5 border border-blue-500/15">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Este prestador tiene suspension de retencion vigente. No se aplica el 8% IR.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-5 border-t border-[color:var(--border-default)]">
          <button onClick={onClose} className="px-4 py-2.5 text-sm border border-white/10 bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)] hover:bg-white/5 hover:text-white rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || gross <= 0}
            className="bg-gold px-4 py-2.5 text-sm font-bold text-black rounded-xl disabled:opacity-50 transition-colors hover:brightness-110"
          >
            {loading ? 'Guardando...' : 'Registrar Recibo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onStatusChange,
  onDelete,
}: {
  invoice: Invoice
  providerId: string
  onStatusChange: (invoiceId: string, status: string) => void
  onDelete: (invoiceId: string) => void
}) {
  const isPaid = invoice.status === 'PAID'
  const isCancelled = invoice.status === 'CANCELLED'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      isPaid ? 'bg-emerald-500/[0.03] border-emerald-500/10' : isCancelled ? 'bg-white/[0.01] border-white/[0.04] opacity-60' : 'bg-[color:var(--neutral-50)] border-[color:var(--border-default)]'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium text-[color:var(--text-secondary)]">{invoice.invoiceNumber}</span>
          {isPaid && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600">PAGADO</span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-gray-500/10 text-[color:var(--text-tertiary)]">ANULADO</span>
          )}
          {!isPaid && !isCancelled && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400">PENDIENTE</span>
          )}
        </div>
        <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">
          {fmtDate(invoice.issueDate)}
          {invoice.hasRetention && <span className="ml-2 text-red-400">IR 8%: -S/ {fmt(invoice.retention)}</span>}
          {invoice.paidAt && <span className="ml-2 text-emerald-600">Pagado: {fmtDate(invoice.paidAt)}</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-[color:var(--text-tertiary)]">S/ {fmt(invoice.grossAmount)}</p>
        <p className="text-sm font-bold text-amber-500">S/ {fmt(invoice.netAmount)}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isPaid && !isCancelled && (
          <button
            onClick={() => onStatusChange(invoice.id, 'PAID')}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Marcar como pagado"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {isPaid && (
          <button
            onClick={() => onStatusChange(invoice.id, 'PENDING')}
            className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
            title="Marcar como pendiente"
          >
            <Clock className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(invoice.id)}
          className="p-1.5 text-[color:var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Eliminar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Provider Card ─────────────────────────────────────────────────────────────

function ProviderCard({
  row,
  onAddInvoice,
  onStatusChange,
  onDelete,
}: {
  row: ProviderRow
  onAddInvoice: (providerId: string, providerName: string, hasSuspension: boolean) => void
  onStatusChange: (providerId: string, invoiceId: string, status: string) => void
  onDelete: (providerId: string, invoiceId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { provider, invoices, summary } = row
  const fullName = displayWorkerName(provider.firstName, provider.lastName)
  const hasPending = summary.pendientes > 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Auto-expand UI state en respuesta a prop derivada.
    if (hasPending) setExpanded(true)
  }, [hasPending])

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${hasPending ? 'border-amber-500/30' : 'border-[color:var(--border-default)]'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[color:var(--neutral-50)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-lg ${
            hasPending
              ? 'bg-gradient-to-br from-amber-500/80 to-amber-600 text-white shadow-amber-500/20'
              : invoices.length > 0
                ? 'bg-gradient-to-br from-primary/80 to-primary text-white shadow-primary/20'
                : 'bg-white/[0.06] text-[color:var(--text-tertiary)]'
          }`}>
            {workerInitials(provider.firstName, provider.lastName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold text-white truncate">{fullName}</span>
              {hasPending && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400">
                  {summary.pendientes} pend.
                </span>
              )}
              {provider.hasSuspensionRetencion && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-blue-500/10 text-emerald-600">
                  Sin retencion
                </span>
              )}
            </div>
            <p className="text-xs text-[color:var(--text-tertiary)] truncate mt-0.5">
              <span className="font-mono text-[color:var(--text-secondary)]">{provider.ruc ? `RUC ${provider.ruc}` : `DNI ${provider.documentNumber}`}</span>
              {provider.profession ? ` · ${provider.profession}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-amber-500">
              S/ {fmt(summary.totalNeto)}
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)]">{summary.count} recibo{summary.count !== 1 ? 's' : ''}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[color:var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[color:var(--text-tertiary)]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--border-default)] bg-[#0f1219] px-6 py-5 space-y-2">
          {invoices.length === 0 ? (
            <p className="text-center py-4 text-sm text-[color:var(--text-tertiary)]">Sin recibos para este periodo</p>
          ) : (
            invoices.map(inv => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                providerId={provider.id}
                onStatusChange={(iid, s) => onStatusChange(provider.id, iid, s)}
                onDelete={iid => onDelete(provider.id, iid)}
              />
            ))
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => onAddInvoice(provider.id, fullName, provider.hasSuspensionRetencion)}
              className="flex items-center gap-1.5 bg-gold px-4 py-2.5 text-sm font-bold text-black rounded-xl transition-colors hover:brightness-110"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Recibo
            </button>
            <Link
              href={`/dashboard/prestadores/${provider.id}`}
              className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-white transition-colors"
            >
              Ver prestador <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterKey = 'todos' | 'con_recibos' | 'sin_recibos' | 'pendientes'

export default function HonorariosPage() {
  const [periodo, setPeriodo] = useState(currentPeriodo())
  const [data, setData] = useState<{ providers: ProviderRow[]; totals: OrgTotals } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('todos')

  // Modal
  const [invoiceModal, setInvoiceModal] = useState<{
    providerId: string
    providerName: string
    hasSuspension: boolean
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/honorarios?periodo=${periodo}`)
      if (res.ok) setData(await res.json() as { providers: ProviderRow[]; totals: OrgTotals })
    } finally {
      setLoading(false)
    }
  }, [periodo])

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

  async function handleStatusChange(providerId: string, invoiceId: string, status: string) {
    await fetch(`/api/prestadores/${providerId}/recibos/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    void load()
  }

  async function handleDelete(providerId: string, invoiceId: string) {
    const ok = await confirm({
      title: '¿Eliminar este recibo?',
      description: 'Se borrará el registro del recibo por honorarios. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    await fetch(`/api/prestadores/${providerId}/recibos/${invoiceId}`, { method: 'DELETE' })
    void load()
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.providers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        r =>
          r.provider.firstName.toLowerCase().includes(q) ||
          r.provider.lastName.toLowerCase().includes(q) ||
          r.provider.documentNumber.includes(q) ||
          (r.provider.ruc ?? '').includes(q),
      )
    }
    switch (filter) {
      case 'con_recibos': return list.filter(r => r.invoices.length > 0)
      case 'sin_recibos': return list.filter(r => r.invoices.length === 0)
      case 'pendientes': return list.filter(r => r.summary.pendientes > 0)
      default: return list
    }
  }, [data, search, filter])

  const totals = data?.totals
  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'con_recibos', label: 'Con recibos' },
    { key: 'sin_recibos', label: 'Sin recibos' },
    { key: 'pendientes', label: 'Pendientes' },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
            <Receipt className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Recibos por Honorarios
            </h1>
            <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
              Gestion de pagos a prestadores de servicios · Retencion IR 4ta Categoria (8%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="month"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="px-3 py-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
          <button
            onClick={load}
            className="p-2 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-[color:var(--text-tertiary)] hover:bg-white/5 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard
          label="Total bruto"
          value={totals ? fmt(totals.totalBruto) : '—'}
          prefix="S/"
          icon={DollarSign}
          accent="blue"
        />
        <KpiCard
          label="Retencion IR 4ta"
          value={totals ? fmt(totals.totalRetencion) : '—'}
          prefix="S/"
          icon={Percent}
          accent="red"
        />
        <KpiCard
          label="Total neto"
          value={totals ? fmt(totals.totalNeto) : '—'}
          prefix="S/"
          icon={DollarSign}
          accent="green"
        />
        <KpiCard
          label="Recibos"
          value={totals?.totalRecibos ?? '—'}
          icon={FileText}
          accent="purple"
        />
        <KpiCard
          label="Pend. de pago"
          value={totals?.pendientes ?? '—'}
          icon={Clock}
          accent={totals?.pendientes ? 'amber' : 'blue'}
        />
      </div>

      {/* ── Pending alert ──────────────────────────────────────────────────── */}
      {totals && totals.pendientes > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/[0.05] border border-amber-500/15 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 text-sm">
              {totals.pendientes} recibo{totals.pendientes !== 1 ? 's' : ''} pendiente{totals.pendientes !== 1 ? 's' : ''} de pago
            </p>
            <p className="text-xs text-amber-700/70 mt-1">
              Total por pagar: <strong className="text-amber-700">S/ {fmt(
                data?.providers
                  .flatMap(p => p.invoices)
                  .filter(i => i.status === 'PENDING')
                  .reduce((s, i) => s + i.netAmount, 0) ?? 0
              )}</strong>.
              Registre el pago marcando cada recibo como pagado.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o RUC..."
            className="w-full pl-9 pr-3 py-2.5 border border-white/10 bg-[color:var(--neutral-100)] rounded-xl text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>
        <div className="flex rounded-xl overflow-hidden shrink-0 gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                filter === tab.key ? 'bg-gold text-black font-bold' : 'text-[color:var(--text-tertiary)] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Provider list ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[color:var(--text-tertiary)]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Cargando honorarios...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[color:var(--text-tertiary)]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium text-[color:var(--text-tertiary)]">No hay prestadores para mostrar</p>
          <p className="text-xs mt-1 text-gray-600">
            {search || filter !== 'todos'
              ? 'Pruebe con otros filtros'
              : 'Registre prestadores desde la seccion Gestion -> Prestadores'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            <ProviderCard
              key={row.provider.id}
              row={row}
              onAddInvoice={(pid, name, sus) => setInvoiceModal({ providerId: pid, providerName: name, hasSuspension: sus })}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Footer totals ──────────────────────────────────────────────────── */}
      {totals && totals.totalRecibos > 0 && (
        <div className="bg-[color:var(--neutral-50)] border border-[color:var(--border-default)] rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[color:var(--text-tertiary)]">
              Totales del periodo · {totals.providersConRecibo} prestador{totals.providersConRecibo !== 1 ? 'es' : ''}
              · {totals.totalRecibos} recibo{totals.totalRecibos !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-6 font-medium">
              <span className="text-[color:var(--text-tertiary)]">Bruto: <strong className="text-[color:var(--text-secondary)]">S/ {fmt(totals.totalBruto)}</strong></span>
              <span className="text-red-400">IR 4ta: <strong>S/ {fmt(totals.totalRetencion)}</strong></span>
              <span className="text-amber-500">Neto: <strong>S/ {fmt(totals.totalNeto)}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ── Legal footnote ─────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-600 border-t border-[color:var(--border-default)] pt-4">
        Art. 33 y 34 TUO LIR (D.S. 179-2004-EF) · Retencion 8% para montos &gt; S/ 1,500 mensuales ·
        Suspension de retencion: formulario 1609 SUNAT (cuando proyeccion anual &lt; 7 UIT).
      </p>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {invoiceModal && (
        <NewInvoiceModal
          {...invoiceModal}
          periodo={periodo}
          onClose={() => setInvoiceModal(null)}
          onSaved={() => { setInvoiceModal(null); void load() }}
        />
      )}
    </div>
  )
}
