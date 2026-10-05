'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Settings,
  AlertTriangle,
  FileText,
  Shield,
  Archive,
  EyeOff,
  TrendingUp,
  Inbox,
  ArrowUpRight,
  Search,
  X,
  HardHat,
  Globe,
  Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = 'critico' | 'alto' | 'medio' | 'info'
type Category = 'Contrato' | 'SST' | 'Cumplimiento' | 'Sistema' | 'Denuncia'
type FilterTab = 'TODAS' | 'SIN_LEER' | 'CRITICAS' | 'ARCHIVADAS'

/**
 * Dos orígenes:
 *  - `norm`: cambios normativos (NormAlert). Leer/archivar SÍ se guarda (PATCH /api/alerts).
 *  - `worker`: alertas de un trabajador (WorkerAlert). Son tareas pendientes: no se
 *    "leen", se resuelven en la ficha del trabajador. Por eso no tienen botón de
 *    leído/archivado (antes lo tenían, pero no se guardaba y volvían al recargar).
 */
interface Notification {
  id: string
  source: 'norm' | 'worker'
  sourceId: string
  severity: Severity
  category: Category
  title: string
  description: string
  createdAt: string
  isRead: boolean
  isArchived: boolean
  href: string
  hrefLabel: string
  external: boolean
}

// ── Config ─────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { emoji: string; label: string; bgDark: string; textColor: string }> = {
  critico: { emoji: '🔴', label: 'Crítico', bgDark: 'bg-red-950/40',    textColor: 'text-red-400' },
  alto:    { emoji: '🟠', label: 'Alto',    bgDark: 'bg-orange-950/40', textColor: 'text-orange-400' },
  medio:   { emoji: '🟡', label: 'Medio',   bgDark: 'bg-yellow-950/40', textColor: 'text-yellow-400' },
  info:    { emoji: '🔵', label: 'Info',    bgDark: 'bg-blue-950/40',   textColor: 'text-emerald-600' },
}

const CATEGORY_CONFIG: Record<Category, { icon: typeof Bell; color: string; bgDark: string }> = {
  Contrato:     { icon: FileText,      color: 'text-violet-400',  bgDark: 'bg-violet-900/30' },
  SST:          { icon: HardHat,       color: 'text-amber-400',   bgDark: 'bg-amber-900/30' },
  Cumplimiento: { icon: Shield,        color: 'text-emerald-600', bgDark: 'bg-emerald-900/30' },
  Sistema:      { icon: Globe,         color: 'text-sky-400',     bgDark: 'bg-sky-900/30' },
  Denuncia:     { icon: AlertTriangle, color: 'text-red-400',     bgDark: 'bg-red-900/30' },
}

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof Bell }[] = [
  { key: 'TODAS',      label: 'Todas',      icon: Inbox },
  { key: 'SIN_LEER',   label: 'Sin leer',   icon: EyeOff },
  { key: 'CRITICAS',   label: 'Críticas',   icon: AlertTriangle },
  { key: 'ARCHIVADAS', label: 'Archivadas', icon: Archive },
]

// ── Mapeo de tipos de alerta del trabajador a categorías ─────────────────────

const WORKER_ALERT_CATEGORY_MAP: Record<string, Category> = {
  CONTRATO_POR_VENCER: 'Contrato',
  CONTRATO_VENCIDO: 'Contrato',
  CTS_PENDIENTE: 'Cumplimiento',
  GRATIFICACION_PENDIENTE: 'Cumplimiento',
  VACACIONES_ACUMULADAS: 'Cumplimiento',
  VACACIONES_DOBLE_PERIODO: 'Cumplimiento',
  DOCUMENTO_FALTANTE: 'Cumplimiento',
  DOCUMENTO_VENCIDO: 'Cumplimiento',
  EXAMEN_MEDICO_VENCIDO: 'SST',
  CAPACITACION_PENDIENTE: 'SST',
  AFP_EN_MORA: 'Cumplimiento',
  REGISTRO_INCOMPLETO: 'Cumplimiento',
  SEGURO_VIDA_LEY: 'Cumplimiento',
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Tiempo relativo legible
function timeAgo(dateStr: string, nowMs: number): string {
  const now = new Date(nowMs)
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMins < 60) return `Hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

// Mapea impactLevel / severity de la API al severity del componente
function mapSeverity(level: string): Severity {
  if (level === 'CRITICAL') return 'critico'
  if (level === 'HIGH') return 'alto'
  if (level === 'MEDIUM') return 'medio'
  return 'info'
}

// Mapea normCategory al Category del componente
function mapCategory(normCategory: string): Category {
  const c = (normCategory || '').toUpperCase()
  if (c.includes('SST') || c.includes('SEGURIDAD') || c.includes('SALUD')) return 'SST'
  if (c.includes('CONTRAT')) return 'Contrato'
  if (c.includes('DENUNCIA') || c.includes('HOSTIG') || c.includes('ACOSO')) return 'Denuncia'
  if (c.includes('COMPLIANCE') || c.includes('PLANILLA') || c.includes('REMUN') || c.includes('LABORAL')) return 'Cumplimiento'
  return 'Sistema'
}

/** Guarda el estado de una alerta normativa. Devuelve true si el servidor lo aceptó. */
async function persistNormStatus(alertId: string, status: 'READ' | 'DISMISSED'): Promise<boolean> {
  try {
    const res = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, status }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  // Hora de referencia para "últimos 7 días" (fija durante la visita)
  const [nowMs] = useState(() => Date.now())

  // Cargar alertas reales: NormAlert + WorkerAlert
  useEffect(() => {
    Promise.all([
      fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/workers/alerts').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([normData, workerData]) => {
      const normNotifs: Notification[] = (normData.data || []).map((a: {
        id: string; title: string; summary: string; impactLevel: string
        publishedAt: string; normCategory: string; normSourceUrl: string | null; isRead: boolean
      }) => ({
        id: `norm-${a.id}`,
        source: 'norm' as const,
        sourceId: a.id,
        severity: mapSeverity(a.impactLevel),
        category: mapCategory(a.normCategory),
        title: a.title,
        description: a.summary,
        createdAt: a.publishedAt,
        isRead: a.isRead,
        isArchived: false,
        href: a.normSourceUrl || '/dashboard/alertas',
        hrefLabel: a.normSourceUrl ? 'Ver norma' : 'Ver en Alertas',
        external: Boolean(a.normSourceUrl),
      }))
      const workerNotifs: Notification[] = (workerData.data || []).map((a: {
        id: string; workerId: string; title: string; description: string | null; severity: string
        type: string; workerName: string; createdAt: string
      }) => ({
        id: `worker-${a.id}`,
        source: 'worker' as const,
        sourceId: a.id,
        severity: mapSeverity(a.severity),
        category: WORKER_ALERT_CATEGORY_MAP[a.type] || 'Cumplimiento',
        title: a.title,
        description: a.description || `Trabajador: ${a.workerName}`,
        createdAt: a.createdAt,
        // El endpoint solo devuelve alertas sin resolver: siguen pendientes.
        isRead: false,
        isArchived: false,
        href: `/dashboard/trabajadores/${a.workerId}`,
        hrefLabel: 'Ver trabajador',
        external: false,
      }))
      setNotifications([...normNotifs, ...workerNotifs])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  const [activeTab, setActiveTab] = useState<FilterTab>('TODAS')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Actions (solo alertas normativas; se guardan en el servidor) ─────────────

  const updateLocal = (id: string, patch: Partial<Notification>) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))

  const markAsRead = async (n: Notification) => {
    if (n.source !== 'norm') return
    updateLocal(n.id, { isRead: true })
    const ok = await persistNormStatus(n.sourceId, 'READ')
    if (!ok) {
      updateLocal(n.id, { isRead: false })
      setActionError('No se pudo guardar. Inténtalo de nuevo.')
    }
  }

  const archiveNotification = async (n: Notification) => {
    if (n.source !== 'norm') return
    updateLocal(n.id, { isArchived: true, isRead: true })
    const ok = await persistNormStatus(n.sourceId, 'DISMISSED')
    if (!ok) {
      updateLocal(n.id, { isArchived: false, isRead: n.isRead })
      setActionError('No se pudo archivar. Inténtalo de nuevo.')
    }
  }

  const markAllNormsAsRead = async () => {
    const pending = notifications.filter(n => n.source === 'norm' && !n.isRead && !n.isArchived)
    if (pending.length === 0) return
    setBulkSaving(true)
    setNotifications(prev => prev.map(n => (n.source === 'norm' && !n.isArchived ? { ...n, isRead: true } : n)))
    const results = await Promise.all(pending.map(n => persistNormStatus(n.sourceId, 'READ')))
    const failed = new Set(pending.filter((_, i) => !results[i]).map(n => n.id))
    if (failed.size > 0) {
      setNotifications(prev => prev.map(n => (failed.has(n.id) ? { ...n, isRead: false } : n)))
      setActionError(`No se pudieron marcar ${failed.size} cambios normativos. Inténtalo de nuevo.`)
    }
    setBulkSaving(false)
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let items = notifications
    if (activeTab === 'SIN_LEER') items = items.filter(n => !n.isRead && !n.isArchived)
    else if (activeTab === 'CRITICAS') items = items.filter(n => n.severity === 'critico' && !n.isArchived)
    else if (activeTab === 'ARCHIVADAS') items = items.filter(n => n.isArchived)
    else items = items.filter(n => !n.isArchived)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(n => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
    }
    return items
  }, [notifications, activeTab, searchQuery])

  const stats = useMemo(() => {
    const active = notifications.filter(n => !n.isArchived)
    const since = nowMs - SEVEN_DAYS_MS
    return {
      sinLeer: active.filter(n => !n.isRead).length,
      criticas: active.filter(n => n.severity === 'critico' && !n.isRead).length,
      ultimos7Dias: active.filter(n => new Date(n.createdAt).getTime() >= since).length,
      normasSinLeer: active.filter(n => n.source === 'norm' && !n.isRead).length,
    }
  }, [notifications, nowMs])

  return (
    <div className="min-h-screen bg-[color:var(--neutral-50)] bg-white p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Bell className="w-6 h-6 text-white" />
              {stats.sinLeer > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white ring-slate-900">
                  {stats.sinLeer}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Centro de notificaciones</h1>
              <p className="text-sm text-gray-400">
                Cambios en las normas laborales y alertas pendientes de tus trabajadores
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/configuracion/notificaciones"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border bg-white border-white/[0.08] text-slate-300 hover:bg-[color:var(--neutral-50)] transition-all"
          >
            <Settings className="w-4 h-4" />
            Avisos por correo
          </Link>
        </div>

        {actionError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <p className="flex-1 text-sm text-red-300">{actionError}</p>
            <button onClick={() => setActionError(null)} aria-label="Cerrar aviso" className="p-1">
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}

        {/* ── Stats Mini-Dashboard ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-900/30">
              <Inbox className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.sinLeer}</p>
              <p className="text-sm text-gray-400">Sin leer o pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.criticas}</p>
              <p className="text-sm text-gray-400">Críticas pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-900/30">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.ultimos7Dias}</p>
              <p className="text-sm text-gray-400">Nuevas en los últimos 7 días</p>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs + Search + Bulk Actions ──────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-white/[0.08]">
            {FILTER_TABS.map(tab => {
              const TabIcon = tab.icon
              const count = tab.key === 'SIN_LEER' ? stats.sinLeer : tab.key === 'CRITICAS' ? stats.criticas : undefined
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.key
                      ? 'bg-gold text-black font-bold shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[color:var(--neutral-100)]'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-red-900/40 text-red-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar notificaciones…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-white/[0.08] bg-white text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-slate-300" />
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={markAllNormsAsRead}
              disabled={bulkSaving || stats.normasSinLeer === 0}
              title="Las alertas de trabajadores se cierran al resolverlas en la ficha del trabajador"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-white/[0.08] text-gray-400 hover:bg-[color:var(--neutral-100)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Marcar normas como leídas
            </button>
          </div>
        </div>

        {/* ── Notification List ───────────────────────────────────────────── */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-xl border border-white/[0.08] flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-white/[0.08] text-center py-16">
              <BellOff className="w-12 h-12 text-[color:var(--text-secondary)] mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No hay notificaciones</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'SIN_LEER'
                  ? 'No tienes nada sin leer ni pendiente.'
                  : activeTab === 'CRITICAS'
                  ? 'No hay alertas críticas pendientes.'
                  : activeTab === 'ARCHIVADAS'
                  ? 'Aquí aparecen los cambios normativos que archives en esta visita.'
                  : searchQuery
                  ? 'No se encontraron resultados para tu búsqueda.'
                  : 'No se encontraron notificaciones.'}
              </p>
            </div>
          ) : (
            filtered.map(n => {
              const sev = SEVERITY_CONFIG[n.severity]
              const cat = CATEGORY_CONFIG[n.category]
              const CatIcon = cat.icon
              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                    n.isArchived
                      ? 'bg-[color:var(--neutral-50)] border-white/[0.06] opacity-75'
                      : n.isRead
                      ? 'bg-white border-white/[0.06]'
                      : 'bg-white border-l-4 border-white/[0.06]'
                  }`}
                  style={!n.isRead && !n.isArchived ? { borderLeftColor: n.severity === 'critico' ? '#ef4444' : n.severity === 'alto' ? '#f97316' : n.severity === 'medio' ? '#eab308' : '#3b82f6' } : undefined}
                >
                  {/* Severity indicator */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${sev.bgDark}`}>
                    {sev.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!n.isRead && !n.isArchived && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <h3 className={`text-sm font-semibold leading-snug ${
                          n.isRead ? 'text-slate-300' : 'text-white'
                        }`}>
                          {n.title}
                        </h3>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt, nowMs)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{n.description}</p>

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {/* Category badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cat.bgDark} ${cat.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {n.category}
                      </span>

                      {/* Severity badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${sev.bgDark} ${sev.textColor}`}>
                        {sev.label}
                      </span>

                      {n.source === 'worker' && (
                        <span className="text-xs text-slate-500">Se cierra al resolverla en la ficha del trabajador</span>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        {n.source === 'norm' && !n.isRead && !n.isArchived && (
                          <button
                            onClick={() => markAsRead(n)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:bg-[color:var(--neutral-100)] transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Marcar leído
                          </button>
                        )}
                        {n.source === 'norm' && !n.isArchived && (
                          <button
                            onClick={() => archiveNotification(n)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:bg-[color:var(--neutral-100)] transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archivar
                          </button>
                        )}
                        {n.external ? (
                          <a
                            href={n.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-600 hover:bg-blue-900/20 transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {n.hrefLabel}
                          </a>
                        ) : (
                          <Link
                            href={n.href}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-600 hover:bg-blue-900/20 transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {n.hrefLabel}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
