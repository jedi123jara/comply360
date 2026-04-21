'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  MessageSquare,
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
  Phone,
  Calendar,
  ArrowUpRight,
  Search,
  X,
  HardHat,
  Globe,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = 'critico' | 'alto' | 'medio' | 'info'
type Category = 'Contrato' | 'SST' | 'Cumplimiento' | 'Sistema' | 'Denuncia'
type FilterTab = 'TODAS' | 'SIN_LEER' | 'CRITICAS' | 'ARCHIVADAS'
type DigestDay = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'

// ── Toggle (module-scope so it keeps state across renders) ─────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold/30 focus:ring-offset-2 focus:ring-offset-slate-900 ${
        enabled ? 'bg-blue-600' : 'bg-[color:var(--neutral-200)]'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

interface Notification {
  id: string
  severity: Severity
  category: Category
  title: string
  description: string
  relativeTime: string
  isRead: boolean
  isArchived: boolean
}

// ── Config ─────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { emoji: string; label: string; dotColor: string; bgColor: string; bgDark: string; textColor: string }> = {
  critico: { emoji: '\uD83D\uDD34', label: 'Cr\u00edtico', dotColor: 'bg-red-500',    bgColor: 'bg-red-50',    bgDark: 'bg-red-950/40',    textColor: 'text-red-400' },
  alto:    { emoji: '\uD83D\uDFE0', label: 'Alto',     dotColor: 'bg-orange-500', bgColor: 'bg-orange-50', bgDark: 'bg-orange-950/40', textColor: 'text-orange-400' },
  medio:   { emoji: '\uD83D\uDFE1', label: 'Medio',    dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-50', bgDark: 'bg-yellow-950/40', textColor: 'text-yellow-400' },
  info:    { emoji: '\uD83D\uDD35', label: 'Info',     dotColor: 'bg-blue-500',   bgColor: 'bg-blue-50',   bgDark: 'bg-blue-950/40',   textColor: 'text-emerald-600' },
}

const CATEGORY_CONFIG: Record<Category, { icon: typeof Bell; color: string; bg: string; bgDark: string }> = {
  Contrato:      { icon: FileText,      color: 'text-violet-400',  bg: 'bg-violet-100',  bgDark: 'bg-violet-900/30' },
  SST:           { icon: HardHat,       color: 'text-amber-400',    bg: 'bg-amber-100',   bgDark: 'bg-amber-900/30' },
  Cumplimiento:  { icon: Shield,        color: 'text-emerald-600', bg: 'bg-emerald-100', bgDark: 'bg-emerald-900/30' },
  Sistema:       { icon: Globe,         color: 'text-sky-400',         bg: 'bg-sky-100',     bgDark: 'bg-sky-900/30' },
  Denuncia:      { icon: AlertTriangle, color: 'text-red-400',         bg: 'bg-red-100',     bgDark: 'bg-red-900/30' },
}

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof Bell }[] = [
  { key: 'TODAS',      label: 'Todas',      icon: Inbox },
  { key: 'SIN_LEER',   label: 'Sin leer',   icon: EyeOff },
  { key: 'CRITICAS',   label: 'Cr\u00edticas',   icon: AlertTriangle },
  { key: 'ARCHIVADAS', label: 'Archivadas', icon: Archive },
]

// ── Mock Data ──────────────────────────────────────────────────────────────────

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

// Helper for relative time display
function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `Hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

// ── Notification Preferences ───────────────────────────────────────────────────

interface CategoryPref {
  email: boolean
  sms: boolean
  push: boolean
}

const DEFAULT_CAT_PREFS: Record<Category, CategoryPref> = {
  Contrato:     { email: true,  sms: false, push: true },
  SST:          { email: true,  sms: true,  push: true },
  Cumplimiento: { email: true,  sms: false, push: false },
  Sistema:      { email: false, sms: false, push: false },
  Denuncia:     { email: true,  sms: true,  push: true },
}

// ── Component ──────────────────────────────────────────────────────────────────

// Mapea impactLevel de la API al severity del componente
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

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [, setLoadingNotifs] = useState(true)

  // Cargar alertas reales: NormAlert + WorkerAlert
  useEffect(() => {
    Promise.all([
      fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/workers/alerts').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([normData, workerData]) => {
      const normNotifs: Notification[] = (normData.data || []).map((a: {
        id: string; title: string; summary: string; impactLevel: string
        publishedAt: string; normCategory: string; isRead: boolean
      }) => ({
        id: `norm-${a.id}`,
        severity: mapSeverity(a.impactLevel),
        category: mapCategory(a.normCategory),
        title: a.title,
        description: a.summary,
        relativeTime: timeAgo(a.publishedAt),
        isRead: a.isRead,
        isArchived: false,
      }))
      const workerNotifs: Notification[] = (workerData.data || []).map((a: {
        id: string; title: string; description: string | null; severity: string
        type: string; workerName: string; createdAt: string; resolvedAt: string | null
      }) => ({
        id: `worker-${a.id}`,
        severity: mapSeverity(a.severity),
        category: WORKER_ALERT_CATEGORY_MAP[a.type] || 'Cumplimiento',
        title: a.title,
        description: a.description || `Trabajador: ${a.workerName}`,
        relativeTime: timeAgo(a.createdAt),
        isRead: a.resolvedAt !== null,
        isArchived: false,
      }))
      setNotifications([...normNotifs, ...workerNotifs])
    }).catch(console.error)
      .finally(() => setLoadingNotifs(false))
  }, [])
  const [activeTab, setActiveTab] = useState<FilterTab>('TODAS')
  const [searchQuery, setSearchQuery] = useState('')

  // Settings panel
  const [showSettings, setShowSettings] = useState(false)
  const [catPrefs, setCatPrefs] = useState(DEFAULT_CAT_PREFS)
  const [smsCriticas, setSmsCriticas] = useState(true)
  const [smsPhone, setSmsPhone] = useState('+51 999 888 777')
  const [digestSemanal, setDigestSemanal] = useState(true)
  const [digestDay, setDigestDay] = useState<DigestDay>('Lunes')
  const [escalamiento, setEscalamiento] = useState(true)
  const [browserPush, setBrowserPush] = useState(true)

  // ── Actions ────────────────────────────────────────────────────────────────

  const markAsRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))

  const archiveNotification = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isArchived: true, isRead: true } : n))

  const markAllAsRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))

  const archiveAll = () =>
    setNotifications(prev => prev.map(n => n.isArchived ? n : { ...n, isArchived: true, isRead: true }))

  const toggleCatPref = (cat: Category, channel: keyof CategoryPref) =>
    setCatPrefs(prev => ({
      ...prev,
      [cat]: { ...prev[cat], [channel]: !prev[cat][channel] },
    }))

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
    return {
      sinLeer: active.filter(n => !n.isRead).length,
      criticas: active.filter(n => n.severity === 'critico' && !n.isRead).length,
      estaSemana: active.length,
    }
  }, [notifications])

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
              <h1 className="text-2xl font-bold text-white">Centro de Notificaciones</h1>
              <p className="text-sm text-gray-400">
                Gestiona alertas, avisos y comunicaciones del sistema
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${
              showSettings
                ? 'bg-blue-900/20 border-blue-800 text-emerald-600'
                : 'bg-white border-white/[0.08] text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-slate-750'
            }`}
          >
            <Settings className="w-4 h-4" />
            Preferencias
          </button>
        </div>

        {/* ── Stats Mini-Dashboard ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-900/30">
              <Inbox className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.sinLeer}</p>
              <p className="text-sm text-gray-400">Sin leer</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.criticas}</p>
              <p className="text-sm text-gray-400">Cr\u00edticas pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-900/30">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.estaSemana}</p>
              <p className="text-sm text-gray-400">Esta semana</p>
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
                      : 'text-gray-400 hover:text-white hover:text-white hover:bg-[color:var(--neutral-100)]'
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
              placeholder="Buscar notificaciones..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-white/[0.08] bg-white text-white placeholder:text-gray-400 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-slate-300" />
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-white/[0.08] text-gray-400 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todo le\u00eddo
            </button>
            <button
              onClick={archiveAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-white/[0.08] text-gray-400 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              Archivar todo
            </button>
          </div>
        </div>

        {/* ── Notification List ───────────────────────────────────────────── */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-white/[0.08] text-center py-16">
              <BellOff className="w-12 h-12 text-[color:var(--text-secondary)] mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No hay notificaciones</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'SIN_LEER'
                  ? 'Todas las notificaciones han sido le\u00eddas.'
                  : activeTab === 'CRITICAS'
                  ? 'No hay alertas cr\u00edticas pendientes.'
                  : activeTab === 'ARCHIVADAS'
                  ? 'No has archivado ninguna notificaci\u00f3n.'
                  : searchQuery
                  ? 'No se encontraron resultados para tu b\u00fasqueda.'
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
                      ? 'bg-[color:var(--neutral-50)] bg-white/50 border-white/[0.06] border-white/[0.08]/50 opacity-75'
                      : n.isRead
                      ? 'bg-white border-white/[0.06] border-white/[0.08]'
                      : 'bg-white border-l-4 border-white/[0.06] border-white/[0.08]'
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
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                        )}
                        <h3 className={`text-sm font-semibold leading-snug ${
                          n.isRead ? 'text-slate-300' : 'text-white'
                        }`}>
                          {n.title}
                        </h3>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {n.relativeTime}
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

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        {!n.isRead && !n.isArchived && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:bg-[color:var(--neutral-100)] transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Marcar le\u00eddo
                          </button>
                        )}
                        {!n.isArchived && (
                          <button
                            onClick={() => archiveNotification(n.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:bg-[color:var(--neutral-100)] transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archivar
                          </button>
                        )}
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-600 hover:bg-blue-900/20 transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Settings Panel ──────────────────────────────────────────────── */}
        {showSettings && (
          <div className="bg-white rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">Preferencias de Notificaciones</h2>
              </div>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-slate-500 hover:text-slate-300" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* ── Email notifications per category ──────────────────────── */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Notificaciones por categor\u00eda</h3>
                <p className="text-xs text-gray-400 mb-4">Configura qu\u00e9 canales usar para cada tipo de notificaci\u00f3n.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-white/[0.06] border-white/[0.08]">
                        <th className="text-left py-2 pr-4 font-medium">Categor\u00eda</th>
                        <th className="text-center py-2 px-4 font-medium">
                          <div className="flex flex-col items-center gap-0.5"><Mail className="w-4 h-4" /><span className="text-xs">Email</span></div>
                        </th>
                        <th className="text-center py-2 px-4 font-medium">
                          <div className="flex flex-col items-center gap-0.5"><Smartphone className="w-4 h-4" /><span className="text-xs">SMS</span></div>
                        </th>
                        <th className="text-center py-2 px-4 font-medium">
                          <div className="flex flex-col items-center gap-0.5"><Bell className="w-4 h-4" /><span className="text-xs">Push</span></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 divide-slate-700/50">
                      {(Object.keys(catPrefs) as Category[]).map(cat => {
                        const cfg = CATEGORY_CONFIG[cat]
                        const CIcon = cfg.icon
                        return (
                          <tr key={cat}>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1.5 font-medium text-slate-300`}>
                                <CIcon className={`w-4 h-4 ${cfg.color}`} />
                                {cat}
                              </span>
                            </td>
                            {(['email', 'sms', 'push'] as const).map(ch => (
                              <td key={ch} className="text-center py-3 px-4">
                                <button
                                  onClick={() => toggleCatPref(cat, ch)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                    catPrefs[cat][ch]
                                      ? 'bg-green-900/30 text-green-400'
                                      : 'bg-[color:var(--neutral-100)] text-slate-500'
                                  }`}
                                >
                                  {catPrefs[cat][ch] ? <Check className="w-4 h-4" /> : <span className="text-xs">&mdash;</span>}
                                </button>
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SMS para alertas cr\u00edticas ─────────────────────────────── */}
              <div className="p-4 rounded-xl bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-900/30">
                      <Phone className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">SMS para alertas cr\u00edticas</p>
                      <p className="text-xs text-gray-400">Recibe un SMS inmediato cuando se genera una alerta cr\u00edtica.</p>
                    </div>
                  </div>
                  <Toggle enabled={smsCriticas} onToggle={() => setSmsCriticas(!smsCriticas)} />
                </div>
                {smsCriticas && (
                  <div className="flex items-center gap-2 ml-11">
                    <label className="text-xs text-gray-400 whitespace-nowrap">N\u00famero:</label>
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={e => setSmsPhone(e.target.value)}
                      placeholder="+51 999 888 777"
                      className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                )}
              </div>

              {/* ── Digest semanal ────────────────────────────────────────── */}
              <div className="p-4 rounded-xl bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-900/30">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Digest semanal por email</p>
                      <p className="text-xs text-gray-400">Recibe un resumen semanal con todas las novedades.</p>
                    </div>
                  </div>
                  <Toggle enabled={digestSemanal} onToggle={() => setDigestSemanal(!digestSemanal)} />
                </div>
                {digestSemanal && (
                  <div className="flex items-center gap-2 ml-11">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Enviar cada:</label>
                    <select
                      value={digestDay}
                      onChange={e => setDigestDay(e.target.value as DigestDay)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] text-white focus:outline-none focus:ring-2 focus:ring-gold/30"
                    >
                      {(['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes'] as DigestDay[]).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Escalamiento ──────────────────────────────────────────── */}
              <div className="p-4 rounded-xl bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-900/30">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Escalamiento autom\u00e1tico</p>
                      <p className="text-xs text-gray-400">Si no se lee en 24h, enviar SMS al gerente de \u00e1rea.</p>
                    </div>
                  </div>
                  <Toggle enabled={escalamiento} onToggle={() => setEscalamiento(!escalamiento)} />
                </div>
              </div>

              {/* ── Browser Push ──────────────────────────────────────────── */}
              <div className="p-4 rounded-xl bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-900/30">
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Notificaciones push del navegador</p>
                      <p className="text-xs text-gray-400">Recibe alertas directamente en tu navegador, incluso si no est\u00e1s en COMPLY360.</p>
                    </div>
                  </div>
                  <Toggle enabled={browserPush} onToggle={() => setBrowserPush(!browserPush)} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
