'use client'

/**
 * DiagnosticoClient — UI de diagnóstico técnico.
 *
 * Card por integración. Cada card tiene:
 *   - Botón "Probar"
 *   - Estado: idle / loading / success / error
 *   - Resultado expandible con JSON completo del response
 *   - Sugerencia de acción si falla
 */

import { useState } from 'react'
import {
  Mail, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner-toaster'

interface DiagnosticResult {
  diagnostics: {
    hasResendKey: boolean
    resendKeyPrefix: string | null
    environment: { NODE_ENV: string; APP_URL: string }
    timestamp: string
    targetEmail: string
  }
  sendResult: {
    success: boolean
    httpStatus?: number
    error?: string
    resendId?: string
  }
  resendApiError?: unknown
  suggestion?: string
  message?: string
  fromEmail?: string
}

export function DiagnosticoClient() {
  const [emailTo, setEmailTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [showJson, setShowJson] = useState(false)

  async function runEmailTest() {
    setLoading(true)
    setResult(null)
    setShowJson(false)
    try {
      const body: Record<string, string> = {}
      if (emailTo.trim()) body.to = emailTo.trim()

      const res = await fetch('/api/diagnostics/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as DiagnosticResult
      setResult(json)
      if (json.sendResult?.success) {
        toast.success('✓ Email enviado — revisa tu bandeja (y spam)')
      } else {
        toast.error('Email NO enviado — ver detalles abajo')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en la prueba')
    } finally {
      setLoading(false)
    }
  }

  async function copyJson() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success('JSON copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
        >
          Diagnóstico <em className="text-emerald-700">técnico</em>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Verifica el estado de las integraciones externas (Resend, IA, etc.) sin tocar console.
        </p>
      </div>

      {/* ─── Card: Email (Resend) ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Resend — Email transaccional</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Verifica si el sistema puede enviar correos a tus trabajadores. Manda un email de prueba.
            </p>
          </div>
        </div>

        {/* Input email destinatario */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email destinatario (opcional — si vacío, usa el tuyo)
          </label>
          <input
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="ej. tu-email@gmail.com"
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
          />
        </div>

        {/* Botón probar */}
        <button
          onClick={runEmailTest}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Probando...' : 'Probar envío de email'}
        </button>

        {/* Resultado */}
        {result && (
          <div className="mt-5 space-y-3">
            {/* Status pill */}
            <div
              className={cn(
                'rounded-xl p-4 ring-1',
                result.sendResult.success
                  ? 'bg-emerald-50 ring-emerald-200'
                  : 'bg-rose-50 ring-rose-200',
              )}
            >
              <div className="flex items-start gap-3">
                {result.sendResult.success ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-bold text-base',
                      result.sendResult.success ? 'text-emerald-900' : 'text-rose-900',
                    )}
                  >
                    {result.sendResult.success ? '✓ Email enviado correctamente' : '✗ Email NO enviado'}
                  </p>
                  {result.message && (
                    <p className="text-sm text-emerald-800 mt-1">{result.message}</p>
                  )}
                  {result.sendResult.error && (
                    <p className="text-sm text-rose-800 mt-1">{result.sendResult.error}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnóstico técnico */}
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Diagnóstico técnico
              </h3>
              <dl className="space-y-1.5 text-sm">
                <Row
                  label="RESEND_API_KEY configurada"
                  value={
                    result.diagnostics.hasResendKey ? (
                      <span className="text-emerald-700 font-semibold">
                        ✓ Sí ({result.diagnostics.resendKeyPrefix})
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold">✗ NO</span>
                    )
                  }
                />
                <Row label="Environment" value={result.diagnostics.environment.NODE_ENV} />
                <Row label="App URL" value={result.diagnostics.environment.APP_URL} />
                <Row label="Email destino" value={result.diagnostics.targetEmail} mono />
                {result.fromEmail && <Row label="From address" value={result.fromEmail} mono />}
                {result.sendResult.httpStatus && (
                  <Row
                    label="HTTP Status"
                    value={
                      <span
                        className={cn(
                          'font-mono font-bold',
                          result.sendResult.success ? 'text-emerald-700' : 'text-rose-700',
                        )}
                      >
                        {result.sendResult.httpStatus}
                      </span>
                    }
                  />
                )}
                {result.sendResult.resendId && (
                  <Row label="Resend ID" value={result.sendResult.resendId} mono />
                )}
                <Row label="Timestamp" value={new Date(result.diagnostics.timestamp).toLocaleString('es-PE')} />
              </dl>
            </div>

            {/* Sugerencia */}
            {result.suggestion && (
              <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Sugerencia</p>
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">{result.suggestion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* JSON expandible */}
            <div>
              <button
                onClick={() => setShowJson((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showJson ? 'Ocultar JSON completo' : 'Ver JSON completo (para soporte)'}
              </button>
              {showJson && (
                <div className="mt-2 relative">
                  <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed max-h-96 overflow-y-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  <button
                    onClick={copyJson}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-semibold px-2 py-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">¿Cómo funciona?</p>
        <p>
          Esta página llama al endpoint <code className="bg-white px-1 rounded">/api/diagnostics/email-test</code>{' '}
          que intenta enviar un email a través de Resend y devuelve el resultado completo. Sirve para
          identificar si el problema está en la configuración de la env var, en Resend, o en otra parte.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-slate-200 last:border-0">
      <dt className="text-slate-600 shrink-0">{label}</dt>
      <dd className={cn('text-slate-900 text-right break-all', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}
