'use client'

/**
 * Panel funcional de Reportes Programados. Consume la API real
 * /api/scheduled-reports. Reemplaza el mockup/banner "Coming soon".
 *
 * Permite:
 *  - Listar los programados activos/pausados
 *  - Crear uno nuevo desde un catálogo + cron preset + emails destinatarios
 *  - Togglear activo/pausado
 *  - Eliminar
 */

import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock, Plus, Play, Pause, Trash2, Loader2,
  CheckCircle2, AlertTriangle, X, Mail,
} from 'lucide-react'

interface ScheduledReport {
  id: string
  reportType: string
  cronExpression: string
  recipients: string[]
  format: 'PDF' | 'XLSX' | 'BOTH'
  active: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
  lastRunError: string | null
  createdAt: string
}

interface CatalogItem {
  id: string
  label: string
  formats: Array<'PDF' | 'XLSX' | 'BOTH'>
}

const CRON_PRESETS = [
  { id: 'daily-8am', label: 'Diario a las 8:00', cron: '0 8 * * *' },
  { id: 'weekly-monday', label: 'Lunes a las 8:00', cron: '0 8 * * 1' },
  { id: 'biweekly', label: 'Días 1 y 15', cron: '0 8 1,15 * *' },
  { id: 'monthly-first', label: 'Primer día del mes', cron: '0 8 1 * *' },
  { id: 'quarterly', label: 'Trimestral', cron: '0 8 1 1,4,7,10 *' },
]

export function ScheduledReportsPanel() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scheduled-reports', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const body = (await res.json()) as { reports: ScheduledReport[]; catalog: CatalogItem[] }
      setReports(body.reports)
      setCatalog(body.catalog)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(id: string, active: boolean) {
    const res = await fetch(`/api/scheduled-reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (res.ok) await load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este reporte programado?')) return
    const res = await fetch(`/api/scheduled-reports/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Reportes programados</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura envíos automáticos por email. Los cron corren cada 5 min en horario Lima.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {loading && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="inline w-4 h-4 mr-1" /> {error}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hay reportes programados todavía.</p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <ul className="space-y-2">
          {reports.map((r) => {
            const catItem = catalog.find((c) => c.id === r.reportType)
            const preset = CRON_PRESETS.find((p) => p.cron === r.cronExpression)
            return (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {catItem?.label ?? r.reportType}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      r.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.active ? 'ACTIVO' : 'PAUSADO'}
                    </span>
                    <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {r.format}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    <CalendarClock className="inline w-3 h-3 mr-1" />
                    {preset?.label ?? r.cronExpression}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <Mail className="inline w-3 h-3 mr-1" />
                    {r.recipients.join(', ')}
                  </p>
                  {r.lastRunAt && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Último envío: {new Date(r.lastRunAt).toLocaleString('es-PE')}
                      {r.lastRunStatus === 'FAILED' && <span className="text-red-600 ml-2">· falló</span>}
                      {r.lastRunStatus === 'SUCCESS' && <CheckCircle2 className="inline w-3 h-3 ml-1 text-emerald-600" />}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle(r.id, !r.active)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    aria-label={r.active ? 'Pausar' : 'Activar'}
                  >
                    {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {creating && (
        <CreateModal
          catalog={catalog}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

function CreateModal({
  catalog, onClose, onCreated,
}: {
  catalog: CatalogItem[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [reportType, setReportType] = useState<string>('')
  const [cronExpression, setCronExpression] = useState<string>(CRON_PRESETS[0].cron)
  const [emails, setEmails] = useState<string>('')
  const [format, setFormat] = useState<'PDF' | 'XLSX' | 'BOTH'>('PDF')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const selectedCat = catalog.find((c) => c.id === reportType)

  async function handleCreate() {
    setSaving(true)
    setErr(null)
    try {
      const recipients = emails
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'))
      if (recipients.length === 0) throw new Error('Ingresa al menos un email válido')
      if (!reportType) throw new Error('Selecciona un reporte')

      const res = await fetch('/api/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, cronExpression, recipients, format }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      await onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nuevo reporte programado</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Tipo de reporte</span>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value)
                const cat = catalog.find((c) => c.id === e.target.value)
                if (cat && !cat.formats.includes(format)) setFormat(cat.formats[0])
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Selecciona —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Frecuencia</span>
            <select
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.id} value={p.cron}>{p.label}</option>
              ))}
            </select>
          </label>

          {selectedCat && (
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Formato</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'PDF' | 'XLSX' | 'BOTH')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {selectedCat.formats.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Emails destinatarios (separar por coma)
            </span>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={2}
              placeholder="rrhh@empresa.com, legal@empresa.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Programar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
