'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Download, FileText, Upload, Loader2, CheckCircle,
  Database, ArrowRight, FileSpreadsheet, Server,
  Shield, Key, AlertTriangle, XCircle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ExportAction = 't-registro' | 'plame'
type ExportFormat = 'txt' | 'csv'

interface ExportResult {
  content: string
  filename: string
  workers: number
  format: string
  summary?: {
    totalWorkers: number
    totalRemuneraciones: number
    totalEssalud: number
    totalAfp: number
    totalOnp: number
    totalSctr: number
  }
}

export default function IntegracionesPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport(action: ExportAction, format: ExportFormat) {
    const key = `${action}-${format}`
    setGenerating(key)
    setResult(null)
    setExportError(null)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          format,
          periodo: periodo.replace('-', ''),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setExportError(data.error)
      } else {
        setResult(data)
      }
    } catch {
      setExportError('Error al generar exportacion. Intente nuevamente.')
    } finally {
      setGenerating(null)
    }
  }

  function downloadFile() {
    if (!result) return
    const mimeType = result.filename.endsWith('.csv')
      ? 'text/csv;charset=utf-8'
      : 'text/plain;charset=utf-8'
    const blob = new Blob([result.content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integraciones</h1>
        <p className="mt-1 text-gray-500">
          Exporta datos de trabajadores en formatos compatibles con T-REGISTRO y PLAME de SUNAT.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* T-REGISTRO */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">T-REGISTRO</h2>
              <p className="mt-1 text-xs text-gray-500">
                Exporta los datos de tus trabajadores activos en formato compatible con el T-REGISTRO de SUNAT.
                Incluye datos personales, laborales y previsionales.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Datos incluidos</h3>
            <div className="flex flex-wrap gap-1">
              {['DNI', 'Nombres', 'Regimen', 'Contrato', 'Ingreso', 'Sueldo', 'AFP/ONP', 'SCTR'].map(tag => (
                <span key={tag} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{tag}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExport('t-registro', 'txt')}
              disabled={generating !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50"
            >
              {generating === 't-registro-txt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Exportar TXT
            </button>
            <button
              onClick={() => handleExport('t-registro', 'csv')}
              disabled={generating !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50"
            >
              {generating === 't-registro-csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Exportar CSV
            </button>
          </div>
        </div>

        {/* PLAME */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Server className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PLAME</h2>
              <p className="mt-1 text-xs text-gray-500">
                Genera la Planilla Mensual de Pagos en formato SUNAT. Incluye remuneraciones, aportes EsSalud, AFP/ONP y SCTR.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-400 uppercase">Periodo</label>
            <input
              type="month"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExport('plame', 'txt')}
              disabled={generating !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50"
            >
              {generating === 'plame-txt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Exportar TXT
            </button>
            <button
              onClick={() => handleExport('plame', 'csv')}
              disabled={generating !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50"
            >
              {generating === 'plame-csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Resumen CSV
            </button>
          </div>
        </div>
      </div>

      {/* Export Error */}
      {exportError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">!</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error al generar exportacion</p>
            <p className="mt-0.5 text-xs text-red-700">{exportError}</p>
          </div>
          <button
            onClick={() => setExportError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="Cerrar error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="text-sm font-semibold text-white">Exportacion generada exitosamente</h3>
              <p className="text-xs text-gray-500">{result.filename} — {result.workers} trabajadores</p>
            </div>
            <button
              onClick={downloadFile}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Descargar
            </button>
          </div>

          {/* PLAME Summary */}
          {result.summary && (
            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">
              <div className="rounded-lg bg-[color:var(--neutral-50)] p-3 text-center">
                <p className="text-xs text-gray-500">Trabajadores</p>
                <p className="text-lg font-bold text-white">{result.summary.totalWorkers}</p>
              </div>
              <div className="rounded-lg bg-[color:var(--neutral-50)] p-3 text-center">
                <p className="text-xs text-gray-500">Remuneraciones</p>
                <p className="text-sm font-bold text-white">S/ {result.summary.totalRemuneraciones.toLocaleString('es-PE')}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-xs text-blue-700">EsSalud</p>
                <p className="text-sm font-bold text-blue-600">S/ {result.summary.totalEssalud.toLocaleString('es-PE')}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-700">AFP</p>
                <p className="text-sm font-bold text-emerald-600">S/ {result.summary.totalAfp.toLocaleString('es-PE')}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 text-center">
                <p className="text-xs text-purple-700">ONP</p>
                <p className="text-sm font-bold text-purple-600">S/ {result.summary.totalOnp.toLocaleString('es-PE')}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-700">SCTR</p>
                <p className="text-sm font-bold text-amber-600">S/ {result.summary.totalSctr.toLocaleString('es-PE')}</p>
              </div>
            </div>
          )}

          {/* File preview */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">Vista previa</h4>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400 font-mono">
              {result.content.split('\n').slice(0, 15).join('\n')}
              {result.content.split('\n').length > 15 && '\n... (truncado)'}
            </pre>
          </div>
        </div>
      )}

      {/* ─── Import T-REGISTRO ─────────────────────────────────── */}
      <TRegistroImportSection />

      {/* Webhook API info */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50">
            <ArrowRight className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">API & Webhooks</h3>
            <p className="mt-1 text-xs text-gray-500">
              Proximamente: API REST para integracion con ERPs y sistemas de planilla. Webhooks para notificaciones en tiempo real de cambios normativos y alertas de compliance.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">REST API</span>
              <span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">Webhooks</span>
              <span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">OAuth 2.0</span>
              <span className="rounded bg-[color:var(--neutral-100)] px-2 py-1 text-xs text-gray-500">Proximamente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SUNAT SOL Credentials Section ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SunatSolSection() {
  const [status, setStatus] = useState<'loading' | 'not_configured' | 'configured'>('loading')
  const [ruc, setRuc] = useState('')
  const [solUser, setSolUser] = useState('')
  const [solPassword, setSolPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    company?: { razonSocial: string; estado: string; condicion: string; representanteLegal: string; direccion: string; actividadEconomica: string }
    workers?: { total: number }
    sync?: { matched: number; newFromSunat: number; notInSunat: number }
    duration?: number
  } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [credInfo, setCredInfo] = useState<{ ruc: string; lastTestedAt: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/integrations/sunat-sol/credentials')
      .then(r => r.json())
      .then(data => {
        if (data.configured) {
          setStatus('configured')
          setCredInfo({ ruc: data.ruc, lastTestedAt: data.lastTestedAt })
        } else {
          setStatus('not_configured')
        }
      })
      .catch(() => setStatus('not_configured'))
  }, [])

  const handleSave = async () => {
    const trimmedRuc = ruc.trim()
    const trimmedUser = solUser.trim()
    const trimmedPass = solPassword.trim()
    if (!trimmedRuc || !trimmedUser || !trimmedPass) {
      setMessage({ type: 'error', text: 'Complete todos los campos' })
      return
    }
    if (!/^\d{11}$/.test(trimmedRuc)) {
      setMessage({ type: 'error', text: 'RUC debe tener 11 digitos' })
      return
    }
    if (trimmedPass.length < 4) {
      setMessage({ type: 'error', text: 'Clave SOL muy corta' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/sunat-sol/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruc: trimmedRuc, solUser: trimmedUser, solPassword: trimmedPass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus('configured')
      setCredInfo({ ruc: trimmedRuc, lastTestedAt: null })
      // Clear ALL sensitive data from React state
      setRuc('')
      setSolUser('')
      setSolPassword('')
      setMessage({ type: 'success', text: 'Credenciales guardadas de forma encriptada' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' })
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/sunat-sol/test', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setCredInfo(prev => prev ? { ...prev, lastTestedAt: new Date().toISOString() } : prev)
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al probar conexion' })
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/integrations/sunat-sol/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSyncResult(data)
        setMessage({ type: 'success', text: `Datos extraidos de SUNAT en ${Math.round((data.duration || 0) / 1000)}s` })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al sincronizar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexion al sincronizar' })
    } finally { setSyncing(false) }
  }

  const handleDelete = async () => {
    await fetch('/api/integrations/sunat-sol/credentials', { method: 'DELETE' })
    setStatus('not_configured')
    setCredInfo(null)
    setRuc('')
    setSolUser('')
    setSolPassword('')
    setMessage(null)
  }

  if (status === 'loading') return null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <Key className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Conexion SUNAT SOL</h2>
          <p className="mt-1 text-xs text-gray-400">
            Conecta tu cuenta SOL de SUNAT para verificar T-REGISTRO, recibir alertas y validar estado tributario.
            Las credenciales se almacenan encriptadas con AES-256-GCM.
          </p>
        </div>
        {status === 'configured' && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Configurado
          </span>
        )}
      </div>

      {status === 'configured' && credInfo ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-lg bg-[color:var(--neutral-50)] px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">RUC: {credInfo.ruc}</p>
              <p className="text-xs text-gray-500">
                {credInfo.lastTestedAt
                  ? `Ultima prueba: ${new Date(credInfo.lastTestedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : 'Conexion no probada aun'}
              </p>
            </div>
            <button onClick={handleTest} disabled={testing || syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg disabled:opacity-50">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              Probar
            </button>
            <button onClick={handleDelete} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>

          {/* ── Big Sync Button ── */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#1e3a6e] to-blue-600 hover:from-[#162d57] hover:to-blue-700 px-6 py-4 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
          >
            {syncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Navegando portal SUNAT... esto toma 15-30 segundos</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>Vincular y Extraer Datos de SUNAT</span>
              </>
            )}
          </button>

          {/* ── Sync Results ── */}
          {syncResult && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-600">Datos extraidos exitosamente</p>
              </div>
              {syncResult.company && (
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Razon Social:</span><span className="text-white font-medium">{syncResult.company.razonSocial || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Estado:</span><span className="text-white font-medium">{syncResult.company.estado || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Condicion:</span><span className="text-white font-medium">{syncResult.company.condicion || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Representante:</span><span className="text-white font-medium">{syncResult.company.representanteLegal || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Direccion:</span><span className="text-white font-medium">{syncResult.company.direccion || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Actividad:</span><span className="text-white font-medium">{syncResult.company.actividadEconomica || '—'}</span></div>
                </div>
              )}
              {syncResult.workers && (
                <div className="pt-2 border-t border-emerald-500/10">
                  <p className="text-xs text-emerald-600 font-semibold">Trabajadores en T-REGISTRO: {syncResult.workers.total}</p>
                </div>
              )}
              {syncResult.sync && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-emerald-50 p-2 text-center">
                    <p className="text-lg font-bold text-emerald-600">{syncResult.sync.matched}</p>
                    <p className="text-[10px] text-emerald-600/70">Coinciden</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                    <p className="text-lg font-bold text-amber-400">{syncResult.sync.newFromSunat}</p>
                    <p className="text-[10px] text-amber-400/70">Nuevos en SUNAT</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2 text-center">
                    <p className="text-lg font-bold text-red-400">{syncResult.sync.notInSunat}</p>
                    <p className="text-[10px] text-red-400/70">No en SUNAT</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {message && (
            <p className={cn('text-xs font-medium', message.type === 'success' ? 'text-emerald-600' : 'text-red-400')}>
              {message.text}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 mb-1 block">RUC</label>
              <input type="text" value={ruc} onChange={e => setRuc(e.target.value)} placeholder="20505897867" maxLength={11}
                className="w-full rounded-lg border border-white/10 bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Usuario SOL</label>
              <input type="text" value={solUser} onChange={e => setSolUser(e.target.value)} placeholder="ADMIN123"
                className="w-full rounded-lg border border-white/10 bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Clave SOL</label>
              <input type="password" value={solPassword} onChange={e => setSolPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Guardar Credenciales
            </button>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Encriptado AES-256-GCM · Solo lectura · Nunca se comparten
            </p>
          </div>
          {message && (
            <p className={cn('text-xs font-medium', message.type === 'success' ? 'text-emerald-600' : 'text-red-400')}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── T-REGISTRO Import Section ────────────────────────────────────────────

function TRegistroImportSection() {
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setReport(null)
    setImportError(null)
    try {
      const content = await file.text()
      const res = await fetch('/api/integrations/sunat-sol/import-tregistro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.report)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const summary = report?.summary as { matched: number; notRegisteredInSunat: number; possibleGhosts: number; withInconsistencies: number } | undefined

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
          <Upload className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Importar T-REGISTRO</h2>
          <p className="mt-1 text-xs text-gray-400">
            Sube el archivo de exportacion de T-REGISTRO de SUNAT para cruzar con tus trabajadores y detectar discrepancias.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-white/10 rounded-lg text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? 'Analizando...' : 'Subir Archivo T-REGISTRO (.txt)'}
        </button>
        <p className="text-[11px] text-gray-500">Formatos: pipe-delimited (|) o CSV</p>
      </div>

      {importError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {importError}
        </div>
      )}

      {report && summary && (
        <div className="mt-4 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{summary.matched}</p>
              <p className="text-[11px] text-emerald-600/70">Coinciden</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3 text-center">
              <p className="text-xl font-bold text-red-400">{summary.notRegisteredInSunat}</p>
              <p className="text-[11px] text-red-400/70">No en SUNAT</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{summary.possibleGhosts}</p>
              <p className="text-[11px] text-amber-400/70">Posibles fantasma</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{summary.withInconsistencies}</p>
              <p className="text-[11px] text-emerald-600/70">Inconsistencias</p>
            </div>
          </div>

          {/* Detail tables */}
          {Array.isArray(report.notInSunat) && (report.notInSunat as { dni: string; name: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Trabajadores no registrados en SUNAT</h4>
              <div className="rounded-lg border border-red-500/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-red-500/5 text-red-300"><th className="px-3 py-2 text-left">DNI</th><th className="px-3 py-2 text-left">Nombre</th></tr></thead>
                  <tbody>
                    {(report.notInSunat as { dni: string; name: string }[]).map((r, i) => (
                      <tr key={i} className="border-t border-red-500/10"><td className="px-3 py-2 text-[color:var(--text-secondary)] font-mono">{r.dni}</td><td className="px-3 py-2 text-[color:var(--text-secondary)]">{r.name}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(report.inconsistencies) && (report.inconsistencies as { dni: string; name: string; field: string; systemValue: string; sunatValue: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Inconsistencias detectadas</h4>
              <div className="rounded-lg border border-blue-500/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-blue-500/5 text-emerald-600"><th className="px-3 py-2 text-left">DNI</th><th className="px-3 py-2 text-left">Campo</th><th className="px-3 py-2 text-left">Sistema</th><th className="px-3 py-2 text-left">SUNAT</th></tr></thead>
                  <tbody>
                    {(report.inconsistencies as { dni: string; name: string; field: string; systemValue: string; sunatValue: string }[]).map((r, i) => (
                      <tr key={i} className="border-t border-blue-500/10"><td className="px-3 py-2 text-[color:var(--text-secondary)] font-mono">{r.dni}</td><td className="px-3 py-2 text-[color:var(--text-secondary)]">{r.field}</td><td className="px-3 py-2 text-amber-700">{r.systemValue}</td><td className="px-3 py-2 text-emerald-600">{r.sunatValue}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
