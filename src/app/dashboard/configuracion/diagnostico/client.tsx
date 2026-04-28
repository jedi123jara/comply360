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
  Copy, Send, UserCheck, Wrench, Sparkles, Cpu, Crown, Brain,
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

      {/* ─── Card: Vínculo de Worker ────────────────────────────────────── */}
      <WorkerLinkCard />

      {/* ─── Card: IA — DeepSeek ────────────────────────────────────────── */}
      <AiTestCard />

      {/* ─── Card: IA — Anthropic Claude (legal high-stakes) ────────────── */}
      <AnthropicTestCard />

      {/* ─── Card: Plan Override (Founders only) ────────────────────────── */}
      <PlanOverrideCard />

      {/* Footer info */}
      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">¿Cómo funciona?</p>
        <p>
          Esta página llama a los endpoints de diagnóstico (<code className="bg-white px-1 rounded">/api/diagnostics/*</code>)
          que verifican el estado real de cada integración y devuelven el resultado completo. Sirve para
          identificar exactamente dónde está el problema sin tocar logs ni console.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Card: diagnóstico de vínculo Worker ↔ User
// ═══════════════════════════════════════════════════════════════════════════

interface WorkerLinkResult {
  worker?: {
    id: string
    dni: string
    fullName: string
    emailRegistered: string | null
    userIdLinked: string | null
    status: string
  }
  linkedUser?: { id: string; email: string; role: string; clerkId: string } | null
  usersFoundByEmail?: Array<{ id: string; email: string; role: string; clerkId: string; orgId: string | null }>
  otherWorkersWithSameEmail?: Array<{ id: string; firstName: string; lastName: string }>
  diagnosis?: string
  suggestion?: string
  error?: string
  ok?: boolean
  message?: string
  rolePromoted?: boolean
  note?: string
}

function WorkerLinkCard() {
  const [workerId, setWorkerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [result, setResult] = useState<WorkerLinkResult | null>(null)
  const [showJson, setShowJson] = useState(false)

  async function diagnose() {
    if (!workerId.trim()) {
      toast.error('Ingresa el ID del worker')
      return
    }
    setLoading(true)
    setResult(null)
    setShowJson(false)
    try {
      const res = await fetch(`/api/diagnostics/worker-link?workerId=${encodeURIComponent(workerId.trim())}`)
      const json = (await res.json()) as WorkerLinkResult
      setResult(json)
      if (json.error) toast.error(json.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  async function forceFix() {
    if (!workerId.trim()) return
    setFixing(true)
    try {
      const res = await fetch(`/api/diagnostics/worker-link?workerId=${encodeURIComponent(workerId.trim())}`, {
        method: 'POST',
      })
      const json = (await res.json()) as WorkerLinkResult
      if (json.ok) {
        toast.success(json.message ?? 'Vínculo creado')
        // Re-diagnosticar para ver el nuevo estado
        await diagnose()
      } else {
        toast.error(json.error ?? 'No se pudo forzar el vínculo')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al forzar vínculo')
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Vínculo Worker ↔ Cuenta</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Si un trabajador entra al portal y ve "No se pudo cargar tu información" o "Este portal es solo para trabajadores",
            usa esto para diagnosticar el problema. Necesitas el ID del trabajador (lo ves en la URL de su perfil).
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          ID del trabajador (de la URL de su perfil, ej. cmogbxglz000004l4cvovspu2)
        </label>
        <input
          type="text"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          placeholder="cmogbxglz..."
          disabled={loading || fixing}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 font-mono"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={diagnose}
          disabled={loading || fixing}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          {loading ? 'Diagnosticando...' : 'Diagnosticar vínculo'}
        </button>
        {result?.worker && !result.linkedUser && (
          <button
            onClick={forceFix}
            disabled={loading || fixing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
          >
            {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            Forzar vínculo
          </button>
        )}
      </div>

      {result && (
        <div className="mt-5 space-y-3">
          {/* Diagnóstico humano */}
          {result.diagnosis && (
            <div
              className={cn(
                'rounded-xl p-4 ring-1',
                result.diagnosis.startsWith('✅') ? 'bg-emerald-50 ring-emerald-200' :
                result.diagnosis.startsWith('⚠️') ? 'bg-amber-50 ring-amber-200' :
                'bg-rose-50 ring-rose-200',
              )}
            >
              <p className={cn(
                'font-bold text-base',
                result.diagnosis.startsWith('✅') ? 'text-emerald-900' :
                result.diagnosis.startsWith('⚠️') ? 'text-amber-900' :
                'text-rose-900',
              )}>
                {result.diagnosis}
              </p>
              {result.suggestion && (
                <p className="text-sm mt-2 text-slate-700">{result.suggestion}</p>
              )}
            </div>
          )}

          {/* Datos del worker */}
          {result.worker && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Datos del trabajador (lo que tú ingresaste)
              </h3>
              <dl className="space-y-1.5 text-sm">
                <Row label="Nombre" value={result.worker.fullName} />
                <Row label="DNI" value={result.worker.dni} mono />
                <Row label="Email registrado" value={result.worker.emailRegistered ?? '(sin email)'} mono />
                <Row label="userId vinculado" value={result.worker.userIdLinked ?? '❌ NULL (no vinculado)'} mono />
                <Row label="Estado" value={result.worker.status} />
              </dl>
            </div>
          )}

          {/* Users encontrados por email */}
          {result.usersFoundByEmail && result.usersFoundByEmail.length > 0 && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Cuentas registradas con ese email
              </h3>
              {result.usersFoundByEmail.map((u) => (
                <div key={u.id} className="text-sm border-b border-slate-200 last:border-0 py-2">
                  <p><strong>Email:</strong> <span className="font-mono text-xs">{u.email}</span></p>
                  <p><strong>Rol:</strong> <span className={cn(
                    'font-semibold',
                    u.role === 'WORKER' ? 'text-emerald-700' : 'text-amber-700',
                  )}>{u.role}</span></p>
                  <p><strong>Clerk ID:</strong> <span className="font-mono text-xs">{u.clerkId.slice(0, 16)}...</span></p>
                  <p><strong>Org:</strong> <span className="font-mono text-xs">{u.orgId ?? '(libre)'}</span></p>
                </div>
              ))}
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
              <pre className="mt-2 bg-slate-900 text-slate-100 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed max-h-96 overflow-y-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
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

// ═══════════════════════════════════════════════════════════════════════════
// Card: diagnóstico de IA (DeepSeek por default)
// ═══════════════════════════════════════════════════════════════════════════

interface AiTestResult {
  diagnostics?: {
    hasKey: boolean
    keyPrefix: string | null
    modelRequested: string
    timestamp: string
    ragEnabled?: boolean
    ragChunksFound?: number
    ragChunkTitles?: Array<{ id: string; titulo: string; score: number }>
  }
  result?: {
    success: boolean
    httpStatus?: number
    modelResponded?: string
    responseId?: string | null
    finishReason?: string | null
    response?: string
    error?: string
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  pricing?: {
    promptPer1M: number
    completionPer1M: number
    estimatedCostUsd: string
    costPer1000Requests: string | null
  } | null
  latencyMs?: number
  message?: string
  suggestion?: string
  deepseekApiError?: unknown
}

function AiTestCard() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('deepseek-chat')
  const [useRag, setUseRag] = useState(true) // RAG activo por default
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiTestResult | null>(null)
  const [showJson, setShowJson] = useState(false)

  async function runAiTest() {
    setLoading(true)
    setResult(null)
    setShowJson(false)
    try {
      const body: Record<string, string | boolean> = { model, useRag }
      if (prompt.trim()) body.prompt = prompt.trim()
      const res = await fetch('/api/diagnostics/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as AiTestResult
      setResult(json)
      if (json.result?.success) {
        toast.success(`✓ DeepSeek respondió en ${json.latencyMs}ms`)
      } else {
        toast.error('IA NO respondió — ver detalles abajo')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en la prueba')
    } finally {
      setLoading(false)
    }
  }

  async function copyAiJson() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success('JSON copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">IA — DeepSeek</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Verifica si la API key de DeepSeek está configurada y respondiendo correctamente.
            Modelo por defecto: <code className="bg-slate-100 px-1 rounded text-xs">deepseek-chat</code> (alias V4 Flash).
          </p>
        </div>
      </div>

      {/* Modelo selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Modelo a probar
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
        >
          <option value="deepseek-chat">deepseek-chat (V4 Flash · barato)</option>
          <option value="deepseek-reasoner">deepseek-reasoner (V4 Pro · razonamiento)</option>
        </select>
      </div>

      {/* Prompt opcional */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Prompt de prueba (opcional — si vacío, pregunta sobre RMV peruano)
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ej. ¿Cuánto es la gratificación de julio?"
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
        />
      </div>

      {/* Toggle RAG */}
      <div className="mb-4 flex items-start gap-3 rounded-lg bg-violet-50 ring-1 ring-violet-200 p-3">
        <label className="flex items-start gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded text-violet-600 disabled:opacity-50"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-900">
              Usar corpus legal peruano (RAG)
            </p>
            <p className="text-xs text-violet-700 mt-0.5">
              Inyecta las 75+ normas peruanas indexadas (RMV S/ 1,130, gratificaciones, CTS, regímenes, etc.) al contexto
              del modelo. <strong>Desmarca para ver la respuesta cruda</strong> y comparar la diferencia.
            </p>
          </div>
        </label>
      </div>

      {/* Botón probar */}
      <button
        onClick={runAiTest}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Probando IA...' : 'Probar respuesta de IA'}
      </button>

      {/* Resultado */}
      {result && (
        <div className="mt-5 space-y-3">
          {/* Status pill */}
          <div
            className={cn(
              'rounded-xl p-4 ring-1',
              result.result?.success
                ? 'bg-emerald-50 ring-emerald-200'
                : 'bg-rose-50 ring-rose-200',
            )}
          >
            <div className="flex items-start gap-3">
              {result.result?.success ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-bold text-base',
                    result.result?.success ? 'text-emerald-900' : 'text-rose-900',
                  )}
                >
                  {result.result?.success ? '✓ DeepSeek respondió correctamente' : '✗ DeepSeek NO respondió'}
                </p>
                {result.message && (
                  <p className="text-sm text-emerald-800 mt-1">{result.message}</p>
                )}
                {result.result?.error && (
                  <p className="text-sm text-rose-800 mt-1">{result.result.error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Respuesta del modelo (si exitoso) */}
          {result.result?.success && result.result?.response && (
            <div className="rounded-xl bg-violet-50 ring-1 ring-violet-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-violet-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700">
                  Respuesta del modelo
                  {result.diagnostics?.ragEnabled ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-200 text-violet-900 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                      ✨ con RAG ({result.diagnostics.ragChunksFound ?? 0} chunks)
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                      ⚠ sin corpus (raw)
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-sm text-slate-800 italic leading-relaxed">"{result.result.response}"</p>
            </div>
          )}

          {/* Chunks RAG inyectados (si los hubo) */}
          {result.diagnostics?.ragEnabled && (result.diagnostics.ragChunksFound ?? 0) > 0 && (
            <details className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                ✨ Chunks legales inyectados ({result.diagnostics.ragChunksFound})
              </summary>
              <ul className="mt-3 space-y-1.5 text-xs">
                {result.diagnostics.ragChunkTitles?.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-200 last:border-0 pb-1.5 last:pb-0">
                    <span className="text-slate-700">{c.titulo}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      score {c.score.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Diagnóstico técnico */}
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Diagnóstico técnico
            </h3>
            <dl className="space-y-1.5 text-sm">
              <Row
                label="DEEPSEEK_API_KEY"
                value={
                  result.diagnostics?.hasKey ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Sí ({result.diagnostics.keyPrefix})
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold">✗ NO</span>
                  )
                }
              />
              <Row label="Modelo solicitado" value={result.diagnostics?.modelRequested ?? '—'} mono />
              {result.result?.modelResponded && (
                <Row label="Modelo respondió" value={result.result.modelResponded} mono />
              )}
              {result.latencyMs !== undefined && (
                <Row
                  label="Latencia"
                  value={
                    <span
                      className={cn(
                        'font-mono font-bold',
                        result.latencyMs < 2000 ? 'text-emerald-700' :
                        result.latencyMs < 5000 ? 'text-amber-700' :
                        'text-rose-700',
                      )}
                    >
                      {result.latencyMs}ms
                    </span>
                  }
                />
              )}
              {result.usage && (
                <>
                  <Row
                    label="Tokens (prompt / completion / total)"
                    value={
                      <span className="font-mono text-xs">
                        {result.usage.promptTokens} / {result.usage.completionTokens} /{' '}
                        <strong>{result.usage.totalTokens}</strong>
                      </span>
                    }
                  />
                  {result.pricing && (
                    <Row
                      label="Costo estimado"
                      value={
                        <span className="font-mono text-xs">
                          <strong>${result.pricing.estimatedCostUsd}</strong> USD
                          {result.pricing.costPer1000Requests && (
                            <span className="text-slate-500 ml-2">
                              (≈ ${result.pricing.costPer1000Requests}/1000 req)
                            </span>
                          )}
                        </span>
                      }
                    />
                  )}
                </>
              )}
              {result.result?.finishReason && (
                <Row label="Finish reason" value={result.result.finishReason} mono />
              )}
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
                  onClick={copyAiJson}
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Card: Plan Override (Founders only — backend valida)
// ═══════════════════════════════════════════════════════════════════════════

const ALL_PLANS = ['FREE', 'STARTER', 'EMPRESA', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const

interface PlanOverrideResult {
  ok?: boolean
  message?: string
  org?: {
    id: string
    name: string
    oldPlan: string
    newPlan: string
    newExpiresAt: string | null
    ownerEmail: string
  }
  note?: string
  error?: string
  code?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Card: Anthropic Claude — para legal high-stakes (contratos, diagnóstico)
// ═══════════════════════════════════════════════════════════════════════════

interface AnthropicTestResult {
  diagnostics?: {
    hasKey: boolean
    keyPrefix: string | null
    modelRequested: string
    timestamp: string
    ragEnabled?: boolean
    ragChunksFound?: number
    ragChunkTitles?: Array<{ id: string; titulo: string; score: number }>
  }
  result?: {
    success: boolean
    httpStatus?: number
    modelResponded?: string
    responseId?: string | null
    stopReason?: string | null
    response?: string
    error?: string
  }
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  pricing?: {
    promptPer1M: number
    completionPer1M: number
    estimatedCostUsd: string
    costPer1000Requests: string
  } | null
  latencyMs?: number
  message?: string
  suggestion?: string
  anthropicApiError?: unknown
}

function AnthropicTestCard() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [useRag, setUseRag] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnthropicTestResult | null>(null)
  const [showJson, setShowJson] = useState(false)

  async function runAnthropicTest() {
    setLoading(true)
    setResult(null)
    setShowJson(false)
    try {
      const body: Record<string, string | boolean> = { model, useRag }
      if (prompt.trim()) body.prompt = prompt.trim()
      const res = await fetch('/api/diagnostics/anthropic-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as AnthropicTestResult
      setResult(json)
      if (json.result?.success) {
        toast.success(`✓ Claude respondió en ${json.latencyMs}ms`)
      } else {
        toast.error('Claude NO respondió — ver detalles abajo')
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
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">IA — Anthropic Claude</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Para tareas legales <strong>high-stakes</strong>: generación y revisión de contratos, diagnóstico SUNAFIL avanzado,
            plan de acción. Calidad superior a DeepSeek en redacción legal peruana, a costo más alto.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Modelo a probar
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
        >
          <option value="claude-sonnet-4-20250514">claude-sonnet-4 ⭐ (recomendado · $3/M)</option>
          <option value="claude-opus-4-20250514">claude-opus-4 (premium · $15/M)</option>
          <option value="claude-haiku-4-20250514">claude-haiku-4 (rápido · $0.80/M)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Prompt de prueba (opcional — si vacío, redacta intro de contrato nocturno construcción)
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ej. Redacta una cláusula de confidencialidad para un contrato MYPE pequeña empresa..."
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 resize-none"
        />
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-lg bg-orange-50 ring-1 ring-orange-200 p-3">
        <label className="flex items-start gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded text-orange-600 disabled:opacity-50"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-900">
              Usar corpus legal peruano (RAG)
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Inyecta las 75+ normas peruanas indexadas. <strong>Crítico para legal high-stakes</strong> — sin RAG, Claude
              puede inventar valores (RMV, sobre-tasas, días vacacionales).
            </p>
          </div>
        </label>
      </div>

      <button
        onClick={runAnthropicTest}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
        {loading ? 'Probando Claude...' : 'Probar respuesta legal de Claude'}
      </button>

      {result && (
        <div className="mt-5 space-y-3">
          <div
            className={cn(
              'rounded-xl p-4 ring-1',
              result.result?.success
                ? 'bg-emerald-50 ring-emerald-200'
                : 'bg-rose-50 ring-rose-200',
            )}
          >
            <div className="flex items-start gap-3">
              {result.result?.success ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-bold text-base',
                    result.result?.success ? 'text-emerald-900' : 'text-rose-900',
                  )}
                >
                  {result.result?.success ? '✓ Claude respondió correctamente' : '✗ Claude NO respondió'}
                </p>
                {result.message && (
                  <p className="text-sm text-emerald-800 mt-1">{result.message}</p>
                )}
                {result.result?.error && (
                  <p className="text-sm text-rose-800 mt-1">{result.result.error}</p>
                )}
              </div>
            </div>
          </div>

          {result.result?.success && result.result?.response && (
            <div className="rounded-xl bg-orange-50 ring-1 ring-orange-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-orange-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700">
                  Respuesta de Claude
                  {result.diagnostics?.ragEnabled ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-200 text-orange-900 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                      ✨ con RAG ({result.diagnostics.ragChunksFound ?? 0} chunks)
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                      ⚠ sin corpus
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{result.result.response}</p>
            </div>
          )}

          {result.diagnostics?.ragEnabled && (result.diagnostics.ragChunksFound ?? 0) > 0 && (
            <details className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                ✨ Chunks legales inyectados ({result.diagnostics.ragChunksFound})
              </summary>
              <ul className="mt-3 space-y-1.5 text-xs">
                {result.diagnostics.ragChunkTitles?.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-200 last:border-0 pb-1.5 last:pb-0">
                    <span className="text-slate-700">{c.titulo}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      score {c.score.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Diagnóstico técnico
            </h3>
            <dl className="space-y-1.5 text-sm">
              <Row
                label="ANTHROPIC_API_KEY"
                value={
                  result.diagnostics?.hasKey ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Sí ({result.diagnostics.keyPrefix})
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold">✗ NO</span>
                  )
                }
              />
              <Row label="Modelo solicitado" value={result.diagnostics?.modelRequested ?? '—'} mono />
              {result.result?.modelResponded && (
                <Row label="Modelo respondió" value={result.result.modelResponded} mono />
              )}
              {result.latencyMs !== undefined && (
                <Row
                  label="Latencia"
                  value={
                    <span
                      className={cn(
                        'font-mono font-bold',
                        result.latencyMs < 3000 ? 'text-emerald-700' :
                        result.latencyMs < 8000 ? 'text-amber-700' :
                        'text-rose-700',
                      )}
                    >
                      {result.latencyMs}ms
                    </span>
                  }
                />
              )}
              {result.usage && (
                <>
                  <Row
                    label="Tokens (input / output / total)"
                    value={
                      <span className="font-mono text-xs">
                        {result.usage.inputTokens} / {result.usage.outputTokens} /{' '}
                        <strong>{result.usage.totalTokens}</strong>
                      </span>
                    }
                  />
                  {result.pricing && (
                    <Row
                      label="Costo estimado"
                      value={
                        <span className="font-mono text-xs">
                          <strong>${result.pricing.estimatedCostUsd}</strong> USD
                          <span className="text-slate-500 ml-2">
                            (≈ ${result.pricing.costPer1000Requests}/1000 req)
                          </span>
                        </span>
                      }
                    />
                  )}
                </>
              )}
              {result.result?.stopReason && (
                <Row label="Stop reason" value={result.result.stopReason} mono />
              )}
            </dl>
          </div>

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
  )
}

function PlanOverrideCard() {
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<string>('PRO')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PlanOverrideResult | null>(null)

  async function applyPlan() {
    if (!email.trim()) {
      toast.error('Ingresa el email del owner/admin')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const body: Record<string, string | number> = {
        email: email.trim(),
        plan,
      }
      const days = parseInt(expiresInDays, 10)
      if (!isNaN(days) && days > 0) {
        body.expiresInDays = days
      }
      const res = await fetch('/api/admin/set-org-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as PlanOverrideResult
      setResult(json)
      if (json.ok) {
        toast.success(json.message ?? 'Plan actualizado')
      } else {
        toast.error(json.error ?? 'No se pudo actualizar')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Crown className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            Cambiar plan de organización
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
              FOUNDERS ONLY
            </span>
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Cambia el plan de cualquier organización (por email del owner/admin) sin pasar por Culqi.
            Útil para testing, comping a clientes VIP, demos, o promociones. El backend valida que seas SUPER_ADMIN
            o estés en <code className="bg-slate-100 px-1 rounded text-xs">FOUNDER_EMAILS</code>.
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email del owner/admin de la org
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ej. inveraduaneras@gmail.com"
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Plan nuevo
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            >
              {ALL_PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Expira en N días (opcional)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="ej. 30 (vacío = ilimitado)"
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <button
        onClick={applyPlan}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
        {loading ? 'Aplicando...' : `Cambiar plan a ${plan}`}
      </button>

      {result && (
        <div className="mt-5 space-y-3">
          {result.ok ? (
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-emerald-900">{result.message}</p>
                  {result.org && (
                    <dl className="mt-3 space-y-1 text-sm">
                      <Row label="Organización" value={result.org.name} />
                      <Row label="Plan anterior" value={result.org.oldPlan} mono />
                      <Row label="Plan nuevo" value={
                        <span className="font-mono font-bold text-emerald-700">{result.org.newPlan}</span>
                      } />
                      {result.org.newExpiresAt && (
                        <Row label="Expira" value={new Date(result.org.newExpiresAt).toLocaleString('es-PE')} />
                      )}
                      <Row label="Owner email" value={result.org.ownerEmail} mono />
                    </dl>
                  )}
                  {result.note && (
                    <p className="text-xs text-emerald-800 mt-3 italic">{result.note}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-rose-900">No se pudo cambiar el plan</p>
                  <p className="text-sm text-rose-800 mt-1">{result.error}</p>
                  {result.code === 'NOT_FOUNDER' && (
                    <p className="text-xs text-rose-700 mt-2">
                      Configura tu email en la env var <code className="bg-rose-100 px-1 rounded">FOUNDER_EMAILS</code> en Vercel y redeploy.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
