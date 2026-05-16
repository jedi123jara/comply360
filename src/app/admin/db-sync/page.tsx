'use client'

import { useState, useEffect } from 'react'
import { Database, CheckCircle, AlertTriangle, Loader2, RefreshCw, Wrench } from 'lucide-react'

interface CheckResult {
  name: string
  exists: boolean
}

interface StatusResponse {
  total: number
  applied: number
  missing: number
  checks: CheckResult[]
  action: string
}

interface SyncResponse {
  ok: boolean
  appliedCount: number
  errorCount: number
  results: { name: string; ok: boolean; error?: string }[]
  message: string
}

export default function DbSyncPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/db-sync')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar')
    } finally {
      setLoading(false)
    }
  }

  const runSync = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/db-sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSyncResult(data)
      await checkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void checkStatus()
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50">
          <Database className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sincronización de base de datos</h1>
          <p className="text-sm text-slate-600">
            Aplica cambios pendientes al schema (columnas y tablas nuevas).
            Solo super-admin.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Estado actual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Estado actual</h2>
          <button
            onClick={checkStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refrescar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
          </div>
        ) : status ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{status.total}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{status.applied}</p>
                <p className="text-xs text-emerald-700">Aplicados</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${status.missing > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${status.missing > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {status.missing}
                </p>
                <p className={`text-xs ${status.missing > 0 ? 'text-amber-700' : 'text-slate-600'}`}>Pendientes</p>
              </div>
            </div>

            <p className={`text-sm rounded-lg p-3 ${
              status.missing > 0
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}>
              {status.action}
            </p>

            {/* Lista de checks */}
            <div className="mt-4 space-y-1.5">
              {status.checks.map(c => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  {c.exists ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <code className="text-xs font-mono text-slate-700">{c.name}</code>
                  <span className={`ml-auto text-[11px] font-semibold ${
                    c.exists ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {c.exists ? 'OK' : 'FALTA'}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Botón de aplicar */}
      {status && status.missing > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Wrench className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Hay {status.missing} cambio(s) pendiente(s)</h3>
              <p className="text-sm text-amber-800 mt-1">
                Esto aplicará cambios aditivos al schema. Es seguro: solo agrega columnas y
                tablas nuevas, no toca ni borra datos existentes.
              </p>
            </div>
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 disabled:opacity-50"
          >
            {syncing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
            ) : (
              <><Wrench className="w-4 h-4" /> Aplicar cambios pendientes</>
            )}
          </button>
        </div>
      )}

      {/* Resultado del sync */}
      {syncResult && (
        <div className={`rounded-2xl border p-5 ${
          syncResult.ok
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-red-300 bg-red-50'
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {syncResult.ok ? (
              <CheckCircle className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold ${syncResult.ok ? 'text-emerald-900' : 'text-red-900'}`}>
                {syncResult.message}
              </h3>
              <p className={`text-sm mt-1 ${syncResult.ok ? 'text-emerald-800' : 'text-red-800'}`}>
                {syncResult.appliedCount} aplicado(s) · {syncResult.errorCount} error(es)
              </p>
            </div>
          </div>

          {/* Detalles */}
          <div className="space-y-1.5 mt-4">
            {syncResult.results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                  r.ok ? 'bg-white' : 'bg-red-100'
                }`}
              >
                {r.ok ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                )}
                <code className="font-mono text-slate-700">{r.name}</code>
                {r.error && <span className="text-red-700 ml-2 truncate">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
