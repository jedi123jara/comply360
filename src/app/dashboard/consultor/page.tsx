'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Building2, AlertTriangle, ShieldCheck, Plus, Trash2,
  ChevronRight, BarChart3, FileDown, Loader2, X, Bell,
  TrendingUp, TrendingDown, Search, RefreshCw, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientStats {
  workerCount: number
  criticalAlerts: number
  complianceScore: number | null
  multaRiesgo: number | null
  lastDiagDate: string | null
  openComplaints: number
}

interface ManagedClient {
  id: string
  clientOrgId: string
  clientOrgName: string
  clientRuc: string | null
  sector: string | null
  plan: string
  notes: string | null
  addedAt: string
  stats: ClientStats
}

interface Aggregate {
  totalClients: number
  totalWorkers: number
  totalCriticalAlerts: number
  avgComplianceScore: number | null
}

type Tab = 'panel' | 'alertas' | 'exportaciones' | 'config'

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">Sin datos</span>
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400'
      : score >= 60
      ? 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400'
      : 'bg-red-100 text-red-700 bg-red-900/30 text-red-400'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {score}/100
    </span>
  )
}

// ─── Add Client Modal ────────────────────────────────────────────────────────

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [ruc, setRuc] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!ruc.trim()) { setError('Ingrese el RUC de la empresa cliente'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruc: ruc.trim(), notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al agregar cliente'); return }
      onAdded()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#141824] bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Agregar Cliente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.04] hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 text-slate-300 mb-1">
              RUC de la empresa cliente
            </label>
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="20123456789"
              maxLength={11}
              className="w-full rounded-lg border border-white/[0.08] bg-[#141824] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 text-slate-300 mb-1">
              Notas internas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Contrato mensual, contacto: gerencia@empresa.com"
              rows={2}
              className="w-full rounded-lg border border-white/[0.08] bg-[#141824] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 bg-red-900/20 border border-red-200 border-red-800 px-3 py-2 text-sm text-red-700 text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-gray-300 text-slate-300 hover:bg-white/[0.02] hover:bg-slate-800">
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsultorPage() {
  const [tab, setTab] = useState<Tab>('panel')
  const [clients, setClients] = useState<ManagedClient[]>([])
  const [aggregate, setAggregate] = useState<Aggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consultor')
      const data = await res.json()
      setClients(data.clients || [])
      setAggregate(data.aggregate || null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const filtered = clients.filter((c) =>
    !searchQ ||
    c.clientOrgName.toLowerCase().includes(searchQ.toLowerCase()) ||
    (c.clientRuc || '').includes(searchQ)
  )

  async function removeClient(clientOrgId: string) {
    if (!confirm('¿Eliminar esta empresa de tu cartera?')) return
    setRemovingId(clientOrgId)
    try {
      await fetch(`/api/consultor/${clientOrgId}`, { method: 'DELETE' })
      setClients((prev) => prev.filter((c) => c.clientOrgId !== clientOrgId))
    } catch {
      //
    } finally {
      setRemovingId(null)
    }
  }

  async function exportPLAME(clientOrgId: string, clientName: string) {
    setExportingId(clientOrgId)
    try {
      const res = await fetch(`/api/exports/plame?orgId=${clientOrgId}&year=2026&month=4`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `PLAME_${clientName.replace(/\s+/g, '_')}_2026-04.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      //
    } finally {
      setExportingId(null)
    }
  }

  // ── All open alerts across all clients ──
  const allAlerts = clients.flatMap((c) =>
    c.stats.criticalAlerts > 0
      ? [{ clientName: c.clientOrgName, criticalAlerts: c.stats.criticalAlerts, clientOrgId: c.clientOrgId }]
      : []
  )

  const TABS = [
    { id: 'panel' as Tab, label: 'Panel General', icon: BarChart3 },
    { id: 'alertas' as Tab, label: `Alertas (${clients.reduce((s, c) => s + c.stats.criticalAlerts, 0)})`, icon: Bell },
    { id: 'exportaciones' as Tab, label: 'Exportaciones', icon: FileDown },
    { id: 'config' as Tab, label: 'Configuración', icon: Users },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portal Contador</h1>
          <p className="mt-1 text-sm text-gray-500 text-gray-400">
            Gestiona el compliance laboral de todas tus empresas clientes desde un solo lugar.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Agregar Cliente
        </button>
      </div>

      {/* Aggregate stats */}
      {aggregate && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Empresas clientes', value: aggregate.totalClients, icon: Building2, color: 'text-indigo-600' },
            { label: 'Total trabajadores', value: aggregate.totalWorkers, icon: Users, color: 'text-blue-600' },
            {
              label: 'Alertas críticas',
              value: aggregate.totalCriticalAlerts,
              icon: AlertTriangle,
              color: aggregate.totalCriticalAlerts > 0 ? 'text-red-600' : 'text-emerald-600',
            },
            {
              label: 'Score promedio',
              value: aggregate.avgComplianceScore !== null ? `${aggregate.avgComplianceScore}/100` : '—',
              icon: ShieldCheck,
              color: 'text-emerald-600',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.02] bg-white/[0.04]', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 text-gray-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] bg-white/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-[#141824] bg-white/[0.04] text-white shadow-sm'
                : 'text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-300'
            )}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: Panel General ── */}
      {tab === 'panel' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar por nombre o RUC..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#141824] pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
              <Building2 className="mx-auto h-10 w-10 text-gray-300 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 text-gray-400">
                {clients.length === 0
                  ? 'Aún no tienes empresas clientes. Agrega la primera.'
                  : 'Ninguna empresa coincide con tu búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 divide-slate-700">
                <thead className="bg-white/[0.02] bg-white/[0.04]/50">
                  <tr>
                    {['Empresa', 'RUC', 'Trabajadores', 'Score', 'Alertas Críticas', 'Denuncias', 'Acciones'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 divide-slate-700/50">
                  {filtered.map((client) => (
                    <tr key={client.clientOrgId} className="hover:bg-white/[0.02] hover:bg-white/[0.04]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{client.clientOrgName}</div>
                        {client.sector && (
                          <div className="text-xs text-gray-400 text-slate-500">{client.sector}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {client.clientRuc || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {client.stats.workerCount}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={client.stats.complianceScore} />
                      </td>
                      <td className="px-4 py-3">
                        {client.stats.criticalAlerts > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            {client.stats.criticalAlerts}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 text-emerald-400 font-medium">Sin alertas</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {client.stats.openComplaints > 0 ? (
                          <span className="rounded-full bg-amber-100 bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 text-amber-400">
                            {client.stats.openComplaints} abiertas
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/dashboard?orgView=${client.clientOrgId}`}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hover:bg-indigo-900/20"
                            title="Ver dashboard de este cliente"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => removeClient(client.clientOrgId)}
                            disabled={removingId === client.clientOrgId}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:bg-red-900/20"
                            title="Eliminar de cartera"
                          >
                            {removingId === client.clientOrgId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Alertas Consolidadas ── */}
      {tab === 'alertas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Alertas Críticas Consolidadas
            </h2>
            <button onClick={loadClients} className="flex items-center gap-1.5 text-sm text-indigo-600 text-indigo-400 hover:underline">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>

          {allAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
              <p className="text-sm font-medium text-emerald-700 text-emerald-400">
                Ninguna de tus empresas tiene alertas críticas activas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients
                .filter((c) => c.stats.criticalAlerts > 0 || c.stats.openComplaints > 0)
                .map((client) => (
                  <div
                    key={client.clientOrgId}
                    className="rounded-2xl border border-red-100 border-red-900/30 bg-red-50 bg-red-900/10 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {client.clientOrgName}
                        </p>
                        <p className="text-xs text-gray-500 text-gray-400">
                          {client.stats.criticalAlerts > 0 && `${client.stats.criticalAlerts} alertas críticas`}
                          {client.stats.criticalAlerts > 0 && client.stats.openComplaints > 0 && ' • '}
                          {client.stats.openComplaints > 0 && `${client.stats.openComplaints} denuncias abiertas`}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/dashboard/alertas?orgView=${client.clientOrgId}`}
                      className="text-xs font-medium text-indigo-600 text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Ver alertas <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Exportaciones ── */}
      {tab === 'exportaciones' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Exportar PLAME y T-Registro</h2>

          {clients.length === 0 ? (
            <p className="text-sm text-gray-500 text-gray-400">No hay empresas clientes registradas.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 divide-slate-700">
                <thead className="bg-white/[0.02] bg-white/[0.04]/50">
                  <tr>
                    {['Empresa', 'RUC', 'Trabajadores', 'PLAME', 'T-Registro'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 divide-slate-700/50">
                  {clients.map((client) => (
                    <tr key={client.clientOrgId} className="hover:bg-white/[0.02] hover:bg-white/[0.04]/30">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {client.clientOrgName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-gray-400">
                        {client.clientRuc || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 text-slate-300">
                        {client.stats.workerCount}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => exportPLAME(client.clientOrgId, client.clientOrgName)}
                          disabled={exportingId === client.clientOrgId}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 bg-indigo-900/20 hover:bg-indigo-100 hover:bg-indigo-900/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 text-indigo-400 disabled:opacity-50"
                        >
                          {exportingId === client.clientOrgId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="h-3.5 w-3.5" />
                          )}
                          PLAME
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/exports/tregistro?orgId=${client.clientOrgId}`}
                          download
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 bg-emerald-900/20 hover:bg-emerald-100 hover:bg-emerald-900/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 text-emerald-400"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          T-Registro
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Configuración ── */}
      {tab === 'config' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] p-6 shadow-sm">
            <h3 className="font-semibold text-white mb-1">Cartera de Clientes</h3>
            <p className="text-sm text-gray-500 text-gray-400 mb-4">
              Agrega o elimina empresas de tu cartera. Solo tú puedes ver los datos de tus clientes.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar nueva empresa cliente
            </button>
          </div>

          {clients.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] border-white/[0.08]">
                <h3 className="font-semibold text-white">Empresas en tu cartera</h3>
              </div>
              <ul className="divide-y divide-gray-50 divide-slate-700/50">
                {clients.map((client) => (
                  <li key={client.clientOrgId} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{client.clientOrgName}</p>
                      <p className="text-xs text-gray-400 text-slate-500">
                        RUC: {client.clientRuc || '—'} · Agregado: {new Date(client.addedAt).toLocaleDateString('es-PE')}
                      </p>
                      {client.notes && (
                        <p className="text-xs text-gray-500 text-gray-400 mt-0.5 italic">{client.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeClient(client.clientOrgId)}
                      disabled={removingId === client.clientOrgId}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 text-red-400 hover:bg-red-50 hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {removingId === client.clientOrgId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add client modal */}
      {showAddModal && (
        <AddClientModal onClose={() => setShowAddModal(false)} onAdded={loadClients} />
      )}
    </div>
  )
}
